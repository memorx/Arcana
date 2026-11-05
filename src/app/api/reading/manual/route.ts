import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTarotInterpretation } from "@/lib/anthropic";
import { AIRefusalError } from "@/lib/ai/config";
import { InsufficientCreditsError } from "@/lib/credits";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
  buildReadingResponse,
  chargeAndCreateReading,
  finalizeReading,
  type ReadingCardDraw,
  type SpreadPosition,
} from "@/lib/reading-pipeline";

/**
 * POST /api/reading/manual — the person drew the cards with their own physical deck
 * and tells us which ones came out. Same flow and response as POST /api/reading,
 * except the cards come from the request instead of being drawn here:
 * validate → load → interpret (source "manual") → chargeAndCreateReading → finalizeReading.
 */

// The interpretation can take a while on thinking models.
export const maxDuration = 60;

interface ManualCardInput {
  position: number;
  cardId: string;
  isReversed?: boolean;
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

/** Shape check only (types); counts, positions and ids are checked against the spread and the deck. */
function parseCards(value: unknown): ManualCardInput[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const cards: ManualCardInput[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const { position, cardId, isReversed } = item as Record<string, unknown>;
    if (!Number.isInteger(position)) return null;
    if (typeof cardId !== "string" || cardId.length === 0) return null;
    if (isReversed !== undefined && typeof isReversed !== "boolean") return null;
    cards.push({ position: position as number, cardId, isReversed: isReversed as boolean | undefined });
  }
  return cards;
}

export async function POST(req: NextRequest) {
  // Rate limit: 5 readings per minute per user
  const { success, resetIn } = rateLimit(req, 5, 60000);
  if (!success) {
    return rateLimitResponse(resetIn);
  }

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return badRequest("invalid_body");
    }

    const { spreadTypeId, intention } = body;
    const locale = body.locale === "en" ? "en" : "es";

    if (typeof spreadTypeId !== "string" || !spreadTypeId || typeof intention !== "string") {
      return badRequest("spreadTypeId and intention are required");
    }

    if (intention.trim().length < 10) {
      return badRequest("Intention must be at least 10 characters");
    }

    const cards = parseCards(body.cards);
    if (!cards) {
      return badRequest("invalid_cards");
    }

    const [user, spreadType] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, freeReadingsLeft: true, credits: true },
      }),
      prisma.spreadType.findUnique({
        where: { id: spreadTypeId },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!spreadType) {
      return NextResponse.json({ error: "Spread type not found" }, { status: 404 });
    }

    // One card per position of the spread...
    if (cards.length !== spreadType.cardCount) {
      return badRequest("card_count_mismatch");
    }

    // ...positions 1..n, each exactly once (no gaps, no repeats)...
    const positionsTaken = new Set(cards.map((c) => c.position));
    const positionsOk =
      positionsTaken.size === cards.length &&
      cards.every((c) => c.position >= 1 && c.position <= spreadType.cardCount);
    if (!positionsOk) {
      return badRequest("invalid_positions");
    }

    // ...and a card can only come out once.
    if (new Set(cards.map((c) => c.cardId)).size !== cards.length) {
      return badRequest("duplicate_cards");
    }

    // Early check so we don't call the AI for someone who can't pay.
    // The actual charge is conditional and happens in chargeAndCreateReading.
    const canAfford = user.freeReadingsLeft > 0 || user.credits >= spreadType.creditCost;
    if (!canAfford) {
      return NextResponse.json(
        { error: "Not enough credits for this reading" },
        { status: 403 }
      );
    }

    const allCards = await prisma.card.findMany();
    const knownIds = new Set(allCards.map((c) => c.id));
    if (!cards.every((c) => knownIds.has(c.cardId))) {
      return badRequest("unknown_cards");
    }

    // Golden cards belong to the app's own draw, so a physical deck never gives one.
    const readingCards: ReadingCardDraw[] = [...cards]
      .sort((a, b) => a.position - b.position)
      .map((c) => ({
        position: c.position,
        cardId: c.cardId,
        isReversed: !!c.isReversed,
        isGolden: false,
      }));

    const positions = spreadType.positions as unknown as SpreadPosition[];

    const cardsForInterpretation = readingCards.map((rc) => {
      const card = allCards.find((c) => c.id === rc.cardId)!;
      const position = positions.find((p) => Number(p.position) === rc.position);

      return {
        position: rc.position,
        positionName: position ? (locale === "en" ? position.name : position.nameEs) : String(rc.position),
        positionDescription: position?.description ?? "",
        cardName: locale === "en" ? card.name : card.nameEs,
        isReversed: rc.isReversed,
      };
    });

    // Interpret first. If the AI fails, nothing is saved and nothing is charged.
    let interpretation: string;
    try {
      interpretation = await generateTarotInterpretation({
        spreadName: locale === "en" ? spreadType.name : spreadType.nameEs,
        intention,
        cards: cardsForInterpretation,
        locale,
        source: "manual",
      });
    } catch (error) {
      if (error instanceof AIRefusalError) {
        console.warn("Manual interpretation refused:", error.category);
        return NextResponse.json({ error: "interpretation_refused" }, { status: 422 });
      }
      console.error("Error generating manual interpretation:", error);
      return NextResponse.json(
        { error: "interpretation_unavailable", retry: true },
        { status: 503 }
      );
    }

    // Save the reading and charge for it in one transaction
    let charged: Awaited<ReturnType<typeof chargeAndCreateReading>>;
    try {
      charged = await chargeAndCreateReading({
        userId: user.id,
        spreadType,
        intention,
        readingCards,
        interpretation,
        source: "manual",
      });
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        return NextResponse.json(
          { error: "Not enough credits for this reading" },
          { status: 403 }
        );
      }
      throw error;
    }

    // Streak, collection, achievements, XP and challenges (no golden cards)
    const extras = await finalizeReading({
      userId: user.id,
      readingId: charged.reading.id,
      readingCards,
      spreadType,
    });

    return NextResponse.json(
      buildReadingResponse({
        reading: charged.reading,
        readingCards,
        cards: allCards,
        positions,
        usedFreeReading: charged.usedFreeReading,
        extras,
      })
    );
  } catch (error) {
    console.error("Error creating manual reading:", error);
    return NextResponse.json({ error: "Error creating reading" }, { status: 500 });
  }
}

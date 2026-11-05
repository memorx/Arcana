import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTarotInterpretation } from "@/lib/anthropic";
import { AIRefusalError } from "@/lib/ai/config";
import { InsufficientCreditsError } from "@/lib/credits";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { buildHistoryContext } from "@/lib/reading-memory";
import {
  buildReadingResponse,
  chargeAndCreateReading,
  drawCards,
  finalizeReading,
  type SpreadPosition,
} from "@/lib/reading-pipeline";

// The interpretation can take a while on thinking models.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Rate limit: 5 readings per minute per user
  const { success, resetIn } = rateLimit(req, 5, 60000);
  if (!success) {
    return rateLimitResponse(resetIn);
  }

  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { spreadTypeId, intention, locale = "es" } = await req.json();

    // Validate input
    if (!spreadTypeId || !intention) {
      return NextResponse.json(
        { error: "spreadTypeId and intention are required" },
        { status: 400 }
      );
    }

    if (intention.length < 10) {
      return NextResponse.json(
        { error: "Intention must be at least 10 characters" },
        { status: 400 }
      );
    }

    // Get user and spread type
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
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!spreadType) {
      return NextResponse.json(
        { error: "Spread type not found" },
        { status: 404 }
      );
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

    // Draw the cards (reversed and golden rolled server-side)
    const allCards = await prisma.card.findMany();
    const readingCards = drawCards(allCards, spreadType.cardCount);

    const positions = spreadType.positions as unknown as SpreadPosition[];

    // Prepare cards for interpretation (simplified - Claude knows tarot deeply)
    const cardsForInterpretation = readingCards.map((rc) => {
      const card = allCards.find((c) => c.id === rc.cardId)!;
      const position = positions.find((p) => p.position === rc.position)!;

      return {
        position: rc.position,
        positionName: locale === "en" ? position.name : position.nameEs,
        positionDescription: position.description,
        cardName: locale === "en" ? card.name : card.nameEs,
        isReversed: rc.isReversed,
      };
    });

    // Reading memory: previous readings as context. If it fails, read without memory.
    let history: string | undefined;
    try {
      history = await buildHistoryContext(user.id, locale);
    } catch (error) {
      console.error("Error building reading memory:", error);
    }

    // Interpret first. If the AI fails, nothing is saved and nothing is charged.
    let interpretation: string;
    try {
      interpretation = await generateTarotInterpretation({
        spreadName: locale === "en" ? spreadType.name : spreadType.nameEs,
        intention,
        cards: cardsForInterpretation,
        locale,
        history,
      });
    } catch (error) {
      if (error instanceof AIRefusalError) {
        console.warn("Interpretation refused:", error.category);
        return NextResponse.json(
          { error: "interpretation_refused" },
          { status: 422 }
        );
      }
      console.error("Error generating interpretation:", error);
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

    // Streak, golden cards, collection, achievements, XP and challenges
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
    console.error("Error creating reading:", error);
    return NextResponse.json(
      { error: "Error creating reading" },
      { status: 500 }
    );
  }
}

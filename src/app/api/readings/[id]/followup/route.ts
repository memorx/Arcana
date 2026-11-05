import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AI_MODELS, AIRefusalError, complete } from "@/lib/ai/config";
import { InsufficientCreditsError, spendCredits } from "@/lib/credits";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
  FOLLOWUP_LIMIT,
  FOLLOWUP_MAX_TOKENS,
  FOLLOWUP_QUESTION_MAX_LENGTH,
  buildFollowUpPrompt,
  followUpCost,
} from "@/lib/ai/followup";

/**
 * Follow-up questions on a finished reading.
 * GET  → the reading's follow-ups (oldest first) and how many are left.
 * POST { question, locale? } → asks one more. The first is free, the next ones cost
 * FOLLOWUP_COST credits, up to FOLLOWUP_LIMIT per reading. The answer is generated
 * before anything is charged or saved, so a failed AI call costs nothing.
 */

// The answer can take a while on thinking models.
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

const FOLLOWUP_SELECT = {
  id: true,
  question: true,
  answer: true,
  creditsCharged: true,
  createdAt: true,
} as const;

type FollowUpRow = Prisma.ReadingFollowUpGetPayload<{ select: typeof FOLLOWUP_SELECT }>;

class FollowUpLimitError extends Error {}

function summary(count: number) {
  return {
    limit: FOLLOWUP_LIMIT,
    remaining: Math.max(0, FOLLOWUP_LIMIT - count),
    nextCost: count >= FOLLOWUP_LIMIT ? null : followUpCost(count),
  };
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const reading = await prisma.reading.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!reading) {
      return NextResponse.json({ error: "Reading not found" }, { status: 404 });
    }
    if (reading.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const followUps = await prisma.readingFollowUp.findMany({
      where: { readingId: id },
      orderBy: { createdAt: "asc" },
      select: FOLLOWUP_SELECT,
    });

    return NextResponse.json({ followUps, ...summary(followUps.length) });
  } catch (error) {
    console.error("Error listing follow-ups:", error);
    return NextResponse.json({ error: "Error listing follow-ups" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  // Rate limit: 5 questions per minute
  const { success, resetIn } = rateLimit(req, 5, 60000);
  if (!success) {
    return rateLimitResponse(resetIn);
  }

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const question = typeof body.question === "string" ? body.question.trim() : "";
    if (!question) {
      return NextResponse.json({ error: "question_required" }, { status: 400 });
    }
    if (question.length > FOLLOWUP_QUESTION_MAX_LENGTH) {
      return NextResponse.json({ error: "question_too_long" }, { status: 400 });
    }
    const locale = body.locale === "en" ? "en" : "es";

    const { id } = await params;
    const reading = await prisma.reading.findUnique({
      where: { id },
      include: {
        spreadType: true,
        followUps: {
          orderBy: { createdAt: "asc" },
          select: { question: true, answer: true },
        },
      },
    });

    if (!reading) {
      return NextResponse.json({ error: "Reading not found" }, { status: 404 });
    }
    if (reading.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (reading.followUps.length >= FOLLOWUP_LIMIT) {
      return NextResponse.json({ error: "followup_limit" }, { status: 409 });
    }

    // Early check so we don't call the AI for someone who can't pay.
    // The actual charge is conditional and happens in the transaction below.
    const cost = followUpCost(reading.followUps.length);
    if (cost > 0) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });
      if (!user || user.credits < cost) {
        return NextResponse.json({ error: "insufficient_credits" }, { status: 403 });
      }
    }

    // Context: the cards as they came out, with their positions and orientation
    const readingCards = (Array.isArray(reading.cards) ? reading.cards : []) as Array<{
      position: number;
      cardId: string;
      isReversed: boolean;
    }>;
    const positions = (Array.isArray(reading.spreadType.positions) ? reading.spreadType.positions : []) as Array<{
      position: number;
      name: string;
      nameEs: string;
      description?: string;
    }>;
    const cards = await prisma.card.findMany({
      where: { id: { in: readingCards.map((c) => c.cardId) } },
      select: { id: true, name: true, nameEs: true },
    });
    const cardsById = new Map(cards.map((c) => [c.id, c]));

    const prompt = buildFollowUpPrompt({
      locale,
      spreadName: locale === "en" ? reading.spreadType.name : reading.spreadType.nameEs,
      intention: reading.intention,
      interpretation: reading.interpretation,
      previous: reading.followUps,
      question,
      source: reading.source === "manual" ? "manual" : "app",
      cards: readingCards.map((rc) => {
        const card = cardsById.get(rc.cardId);
        const position = positions.find((p) => Number(p.position) === Number(rc.position));
        return {
          position: Number(rc.position),
          positionName: position ? (locale === "en" ? position.name : position.nameEs) : String(rc.position),
          positionDescription: position?.description,
          cardName: card ? (locale === "en" ? card.name : card.nameEs) : rc.cardId,
          isReversed: !!rc.isReversed,
        };
      }),
    });

    // Answer first. If the AI fails, nothing is saved and nothing is charged.
    let answer: string;
    try {
      answer = await complete({
        system: prompt.system,
        user: prompt.user,
        model: AI_MODELS.reading,
        effort: "low",
        maxTokens: FOLLOWUP_MAX_TOKENS,
      });
    } catch (error) {
      if (error instanceof AIRefusalError) {
        console.warn("Follow-up refused:", error.category);
        return NextResponse.json({ error: "interpretation_refused" }, { status: 422 });
      }
      console.error("Error generating follow-up:", error);
      return NextResponse.json({ error: "interpretation_unavailable", retry: true }, { status: 503 });
    }

    let saved: { followUp: FollowUpRow; count: number };
    try {
      saved = await prisma.$transaction(async (tx) => {
        // Lock the reading row so two questions sent at once are counted (and charged) one after the other.
        await tx.reading.update({ where: { id }, data: { updatedAt: new Date() }, select: { id: true } });

        const count = await tx.readingFollowUp.count({ where: { readingId: id } });
        if (count >= FOLLOWUP_LIMIT) throw new FollowUpLimitError();

        const charge = followUpCost(count);
        if (charge > 0) {
          const paid = await spendCredits(tx, userId, charge, "FOLLOWUP");
          if (!paid) throw new InsufficientCreditsError();
        }

        const followUp = await tx.readingFollowUp.create({
          data: { readingId: id, userId, question, answer, creditsCharged: charge },
          select: FOLLOWUP_SELECT,
        });
        return { followUp, count: count + 1 };
      });
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        return NextResponse.json({ error: "insufficient_credits" }, { status: 403 });
      }
      if (error instanceof FollowUpLimitError) {
        return NextResponse.json({ error: "followup_limit" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ followUp: saved.followUp, ...summary(saved.count) }, { status: 201 });
  } catch (error) {
    console.error("Error creating follow-up:", error);
    return NextResponse.json({ error: "Error creating follow-up" }, { status: 500 });
  }
}

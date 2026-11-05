import { NextRequest, NextResponse } from "next/server";
import type { MonthlyRecap } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AIRefusalError } from "@/lib/ai/config";
import { generateMonthlyRecap, type RecapReading } from "@/lib/ai/monthly-recap";
import { parseReadingCards, parseSpreadPositions } from "@/lib/insights";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

// The recap is written by a thinking model.
export const maxDuration = 60;

const MIN_READINGS = 3;

function serialize(recap: MonthlyRecap) {
  return {
    year: recap.year,
    month: recap.month,
    locale: recap.locale,
    content: recap.content,
    readingCount: recap.readingCount,
    createdAt: recap.createdAt,
  };
}

/**
 * POST /api/insights/recap  { year, month, locale? }  →  { recap, cached }
 * "Tu mes en cartas". Free. Needs at least 3 readings that month. A saved
 * recap is returned as is unless the month has readings it didn't cover
 * (a recap written on the 5th gets rewritten once the month has more).
 */
export async function POST(req: NextRequest) {
  const { success, resetIn } = rateLimit(req, 3, 60000);
  if (!success) {
    return rateLimitResponse(resetIn);
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: { year?: unknown; month?: unknown; locale?: unknown };
  try {
    body = (await req.json()) ?? {};
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { year, month } = body;
  if (
    typeof year !== "number" ||
    typeof month !== "number" ||
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    year < 2000
  ) {
    return NextResponse.json({ error: "invalid_month" }, { status: 400 });
  }

  const now = new Date();
  const currentKey = now.getUTCFullYear() * 12 + now.getUTCMonth();
  const requestedKey = year * 12 + (month - 1);
  if (requestedKey > currentKey) {
    return NextResponse.json({ error: "future_month" }, { status: 400 });
  }
  const locale = body.locale === "en" ? "en" : "es";

  try {
    const key = { userId_year_month: { userId, year, month } };
    const existing = await prisma.monthlyRecap.findUnique({ where: key });

    const readings = await prisma.reading.findMany({
      where: {
        userId,
        createdAt: { gte: new Date(Date.UTC(year, month - 1, 1)), lt: new Date(Date.UTC(year, month, 1)) },
      },
      orderBy: { createdAt: "asc" },
      select: {
        createdAt: true,
        intention: true,
        cards: true,
        resonance: true,
        resonanceNote: true,
        spreadType: { select: { name: true, nameEs: true, positions: true } },
      },
    });

    // No new readings since the last recap (any month): nothing new to say, no AI call.
    if (existing && existing.readingCount >= readings.length) {
      return NextResponse.json({ recap: serialize(existing), cached: true });
    }

    if (readings.length < MIN_READINGS) {
      return NextResponse.json(
        { error: "not_enough_readings", required: MIN_READINGS, count: readings.length },
        { status: 400 }
      );
    }

    const cardIds = [...new Set(readings.flatMap((r) => parseReadingCards(r.cards).map((c) => c.cardId)))];
    const cards = await prisma.card.findMany({
      where: { id: { in: cardIds } },
      select: { id: true, name: true, nameEs: true },
    });
    const cardName = new Map(cards.map((card) => [card.id, locale === "en" ? card.name : card.nameEs]));

    const recapReadings: RecapReading[] = readings.map((reading) => {
      const positions = parseSpreadPositions(reading.spreadType.positions);
      return {
        date: reading.createdAt,
        spreadName: locale === "en" ? reading.spreadType.name : reading.spreadType.nameEs,
        intention: reading.intention,
        cards: parseReadingCards(reading.cards)
          .sort((a, b) => a.position - b.position)
          .map((card) => {
            const position = positions.find((p) => p.position === card.position);
            return {
              positionName: position ? (locale === "en" ? position.name : position.nameEs) : String(card.position),
              cardName: cardName.get(card.cardId) ?? card.cardId,
              isReversed: card.isReversed,
            };
          }),
        resonance: reading.resonance,
        resonanceNote: reading.resonanceNote,
      };
    });

    let content: string;
    try {
      content = await generateMonthlyRecap({ year, month, locale, readings: recapReadings });
    } catch (error) {
      if (error instanceof AIRefusalError) {
        console.warn("Monthly recap refused:", error.category);
        return NextResponse.json({ error: "recap_refused" }, { status: 422 });
      }
      console.error("Error generating monthly recap:", error);
      return NextResponse.json({ error: "recap_unavailable", retry: true }, { status: 503 });
    }

    const recap = await prisma.monthlyRecap.upsert({
      where: key,
      create: { userId, year, month, locale, content, readingCount: readings.length },
      update: { locale, content, readingCount: readings.length },
    });

    return NextResponse.json({ recap: serialize(recap), cached: false });
  } catch (error) {
    console.error("Error creating monthly recap:", error);
    return NextResponse.json({ error: "Error creating monthly recap" }, { status: 500 });
  }
}

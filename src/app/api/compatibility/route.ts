import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AIRefusalError } from "@/lib/ai/config";
import { describeMapForPrompt, generateCompatibilityReading } from "@/lib/ai/compatibility";
import { InsufficientCreditsError, spendCredits } from "@/lib/credits";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { drawCards } from "@/lib/reading-pipeline";
import { getArcanaBlueprint, type Locale } from "@/lib/systems";
import {
  CARD_ROLES,
  COMPATIBILITY_COST,
  buildCompatibilitySummary,
  computeCompatibility,
  getStoredOverall,
  parseBirthDateInput,
  toIsoDay,
  type CompatibilityCard,
} from "@/lib/compatibility";

// The reading is written by a thinking model.
export const maxDuration = 60;

const PARTNER_NAME_MAX = 60;
const PARTNER_FULL_NAME_MAX = 80;

/** Optional text field: missing or blank → null; not a string or too long → invalid. */
function optionalText(value: unknown, max: number): { ok: true; value: string | null } | { ok: false } {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false };
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length > max) return { ok: false };
  return { ok: true, value: clean || null };
}

const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] ?? "";

/** My readings for two, newest first. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const readings = await prisma.compatibilityReading.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, partnerName: true, partnerBirthDate: true, summary: true, createdAt: true },
      take: 50,
    });

    return NextResponse.json({
      readings: readings.map((r) => ({
        id: r.id,
        partnerName: r.partnerName,
        partnerBirthDate: toIsoDay(r.partnerBirthDate),
        overall: getStoredOverall(r.summary),
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error listing compatibility readings:", error);
    return NextResponse.json({ error: "Error listing readings" }, { status: 500 });
  }
}

/**
 * New reading for two. Order: validate → early credit check → compute → draw
 * three cards → AI → charge and save in one transaction. If the AI fails,
 * nothing is saved and nothing is charged.
 */
export async function POST(req: NextRequest) {
  const { success, resetIn } = rateLimit(req, 3, 60000);
  if (!success) {
    return rateLimitResponse(resetIn);
  }

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        credits: true,
        profile: { select: { birthDate: true, fullName: true, locale: true } },
      },
    });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = user.profile;
    if (!profile?.birthDate || !profile.fullName?.trim()) {
      return NextResponse.json({ error: "profile_required" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    const input = body as Record<string, unknown>;

    const birth = parseBirthDateInput(input.partnerBirthDate);
    if (!birth.ok) {
      return NextResponse.json(
        { error: "invalid_partner_birth_date", reason: birth.error },
        { status: 400 }
      );
    }
    const partnerName = optionalText(input.partnerName, PARTNER_NAME_MAX);
    if (!partnerName.ok) {
      return NextResponse.json({ error: "invalid_partner_name" }, { status: 400 });
    }
    const partnerFullName = optionalText(input.partnerFullName, PARTNER_FULL_NAME_MAX);
    if (!partnerFullName.ok) {
      return NextResponse.json({ error: "invalid_partner_full_name" }, { status: 400 });
    }
    const locale: Locale =
      input.locale === "en" || input.locale === "es" ? input.locale : profile.locale === "en" ? "en" : "es";

    // Early check so we don't call the AI for someone who can't pay.
    // The real charge is conditional and happens in the transaction below.
    if (user.credits < COMPATIBILITY_COST) {
      return NextResponse.json({ error: "insufficient_credits" }, { status: 403 });
    }

    const compatibility = computeCompatibility(
      { birthDate: profile.birthDate, fullName: profile.fullName },
      { birthDate: birth.date, fullName: partnerFullName.value }
    );

    // You / The other person / The bond
    const allCards = await prisma.card.findMany({
      select: { id: true, name: true, nameEs: true, imageUrl: true, arcana: true, suit: true, number: true },
    });
    const cards: CompatibilityCard[] = drawCards(allCards, CARD_ROLES.length, { allowGolden: false }).map(
      (draw, index) => {
        const card = allCards.find((c) => c.id === draw.cardId)!;
        return {
          position: draw.position,
          role: CARD_ROLES[index].role,
          roleLabel: CARD_ROLES[index].label,
          cardId: card.id,
          isReversed: draw.isReversed,
          name: card.name,
          nameEs: card.nameEs,
          imageUrl: card.imageUrl,
          arcana: card.arcana,
          suit: card.suit,
          number: card.number,
        };
      }
    );

    // Write first. If the AI fails, nothing is saved and nothing is charged.
    let content: string;
    try {
      content = await generateCompatibilityReading({
        locale,
        myName: firstName(profile.fullName),
        partnerName: partnerName.value,
        // Both maps without their first line: the prompt never carries an exact birth date.
        myBlueprint: describeMapForPrompt(getArcanaBlueprint(profile.birthDate, profile.fullName), locale),
        // The partner's full name only feeds the numerology; it is never stored.
        partnerBlueprint: describeMapForPrompt(getArcanaBlueprint(birth.date, partnerFullName.value ?? ""), locale),
        compatibility,
        cards: cards.map((c) => ({
          role: c.role,
          name: locale === "en" ? c.name : c.nameEs,
          isReversed: c.isReversed,
        })),
      });
    } catch (error) {
      if (error instanceof AIRefusalError) {
        console.warn("Compatibility reading refused:", error.category);
        return NextResponse.json({ error: "interpretation_refused" }, { status: 422 });
      }
      console.error("Error generating compatibility reading:", error);
      return NextResponse.json({ error: "interpretation_unavailable", retry: true }, { status: 503 });
    }

    const summary = buildCompatibilitySummary(compatibility, cards);

    let reading;
    try {
      reading = await prisma.$transaction(async (tx) => {
        const paid = await spendCredits(tx, userId, COMPATIBILITY_COST, "COMPATIBILITY");
        if (!paid) throw new InsufficientCreditsError();

        return tx.compatibilityReading.create({
          data: {
            userId,
            partnerName: partnerName.value,
            partnerBirthDate: birth.date,
            locale,
            content,
            summary: summary as unknown as Prisma.InputJsonValue,
          },
          select: { id: true, partnerName: true, partnerBirthDate: true, locale: true, createdAt: true },
        });
      });
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        return NextResponse.json({ error: "insufficient_credits" }, { status: 403 });
      }
      throw error;
    }

    return NextResponse.json(
      {
        reading: {
          id: reading.id,
          partnerName: reading.partnerName,
          partnerBirthDate: toIsoDay(reading.partnerBirthDate),
          locale: reading.locale,
          content,
          summary,
          createdAt: reading.createdAt,
        },
        creditsCharged: COMPATIBILITY_COST,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating compatibility reading:", error);
    return NextResponse.json({ error: "Error creating reading" }, { status: 500 });
  }
}

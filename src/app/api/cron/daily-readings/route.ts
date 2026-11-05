import { NextRequest, NextResponse } from "next/server";
import type { Card } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateDailyInterpretation } from "@/lib/anthropic";
import { sendDailyReadingEmail } from "@/lib/email";
import { verifyCronRequest } from "@/lib/cron-auth";
import { claimBirthdayGift, isBirthdayToday } from "@/lib/birthday";
import { describeDayEnergies, getDayEnergies } from "@/lib/systems";

/** AI budget per person: one slow answer must not eat the whole cron run (maxDuration 60 s). */
const DAILY_AI_TIMEOUT_MS = 15_000;

/** Subscribers handled at the same time: at most this many AI calls in flight. */
const BATCH_SIZE = 4;

/**
 * No new batch starts once this much of the run has gone by: a batch can take
 * up to 15 s of AI plus the email, and Vercel cuts the function at 60 s.
 */
const TIME_BUDGET_MS = 48_000;

/** Day energies as plain text for the prompt and the email; never blocks the card. */
function buildDayContext(today: Date, birthDate: Date | null | undefined, locale: "en" | "es") {
  try {
    return describeDayEnergies(getDayEnergies(today, birthDate), locale);
  } catch (error) {
    console.error("[CRON] Could not compute the day energies:", error);
    return undefined;
  }
}

async function findEligibleSubscriptions(timeSlot: string) {
  // All active subscribers whose email time matches the current hour
  return prisma.subscription.findMany({
    where: {
      status: "active",
      user: {
        profile: {
          emailTime: timeSlot,
        },
      },
    },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
  });
}

type EligibleSubscription = Awaited<ReturnType<typeof findEligibleSubscriptions>>[number];

/**
 * Picks, saves and emails one person's card of the day.
 * Returns "skipped" when there's nothing to send; throws on failure.
 */
async function sendDailyReading(
  sub: EligibleSubscription,
  today: Date,
  allCards: Card[]
): Promise<"sent" | "skipped"> {
  const user = sub.user;
  const profile = user.profile;

  if (!profile) {
    console.log(`[CRON] Skipping user ${user.id} - no profile`);
    return "skipped";
  }

  // Check if user already has a reading for today
  const existingReading = await prisma.dailyReading.findUnique({
    where: {
      userId_date: {
        userId: user.id,
        date: today,
      },
    },
  });

  if (existingReading?.sentAt) {
    console.log(`[CRON] Skipping user ${user.id} - already sent today`);
    return "skipped";
  }

  // Get cards from the last 7 days to avoid repetition
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentCardIds = await prisma.dailyReading.findMany({
    where: {
      userId: user.id,
      date: {
        gte: sevenDaysAgo,
      },
    },
    select: { cardId: true },
  });

  const recentCardIdSet = new Set(recentCardIds.map((r) => r.cardId));

  // Filter out recently used cards
  let availableCards = allCards.filter((c) => !recentCardIdSet.has(c.id));

  // If all cards have been used recently, use all cards
  if (availableCards.length === 0) {
    availableCards = allCards;
  }

  // Select random card
  const selectedCard = availableCards[Math.floor(Math.random() * availableCards.length)];

  // Determine if reversed (30% chance)
  const isReversed = Math.random() < 0.3;

  // User's language, normalised once: anything that isn't "en" is Spanish
  // (same value for the AI, the day energies and the email)
  const locale = profile.locale === "en" ? "en" : "es";

  // Tonalli, moon and personal day, woven into the card and the email
  const dayContext = buildDayContext(today, profile.birthDate, locale);

  // Birthday gift (idempotent; the dashboard banner may have claimed it already)
  const isBirthday = isBirthdayToday(profile.birthDate, today);
  let birthdayGiftCredits: number | undefined;
  if (isBirthday) {
    try {
      const gift = await claimBirthdayGift(user.id, { birthDate: profile.birthDate, today });
      // Only announce credits that this run actually added
      if (gift.granted) birthdayGiftCredits = gift.credits;
    } catch (error) {
      console.error(`[CRON] Could not claim the birthday gift for ${user.id}:`, error);
    }
  }

  // Generate interpretation
  const interpretation = await generateDailyInterpretation({
    cardName: selectedCard.name,
    cardNameEs: selectedCard.nameEs,
    isReversed,
    zodiacSign: profile.zodiacSign,
    focusArea: profile.focusArea,
    userName: profile.fullName.split(" ")[0], // First name only
    locale,
    dayContext,
    timeoutMs: DAILY_AI_TIMEOUT_MS,
  });

  // Create or update daily reading
  await prisma.dailyReading.upsert({
    where: {
      userId_date: {
        userId: user.id,
        date: today,
      },
    },
    update: {
      cardId: selectedCard.id,
      isReversed,
      interpretation,
      sentAt: new Date(),
    },
    create: {
      userId: user.id,
      date: today,
      cardId: selectedCard.id,
      isReversed,
      interpretation,
      sentAt: new Date(),
    },
  });

  // Format date for email
  const dateStr = today.toLocaleDateString(locale === "es" ? "es-ES" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Send email
  await sendDailyReadingEmail({
    to: user.email,
    userName: profile.fullName.split(" ")[0],
    cardName: selectedCard.name,
    cardNameEs: selectedCard.nameEs,
    cardImage: selectedCard.imageUrl,
    isReversed,
    interpretation,
    date: dateStr,
    locale,
    zodiacSign: profile.zodiacSign,
    keywords: selectedCard.keywords,
    dayContext,
    isBirthday,
    birthdayGiftCredits,
  });

  console.log(`[CRON] Sent daily reading to ${user.email}`);
  return "sent";
}

// Vercel Cron runs this every hour at minute 0
// We'll process users whose emailTime matches the current hour

// One AI call per subscriber in this slot, BATCH_SIZE at a time.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const startedAt = Date.now();

  // Verify cron secret to prevent unauthorized access
  console.log(`[CRON] Auth header present: ${!!req.headers.get("authorization")}`);
  const unauthorized = verifyCronRequest(req);
  if (unauthorized) {
    return unauthorized;
  }

  const now = new Date();
  const currentHour = now.getUTCHours();

  // Format current hour as HH:00 (e.g., "08:00", "14:00")
  const currentTimeSlot = `${currentHour.toString().padStart(2, "0")}:00`;

  console.log(`[CRON] Running daily readings for time slot: ${currentTimeSlot}`);

  try {
    const eligibleUsers = await findEligibleSubscriptions(currentTimeSlot);

    console.log(`[CRON] Found ${eligibleUsers.length} eligible users`);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Get all cards
    const allCards = await prisma.card.findMany();

    let successCount = 0;
    let errorCount = 0;
    let skippedForTime = 0;

    for (let start = 0; start < eligibleUsers.length; start += BATCH_SIZE) {
      const elapsed = Date.now() - startedAt;
      if (elapsed > TIME_BUDGET_MS) {
        const left = eligibleUsers.slice(start);
        skippedForTime = left.length;
        console.warn(
          `[CRON] Out of time after ${elapsed} ms: ${skippedForTime} subscribers left without today's card: ` +
            left.map((sub) => sub.user.id).join(", ")
        );
        break;
      }

      const batch = eligibleUsers.slice(start, start + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((sub) => sendDailyReading(sub, today, allCards))
      );

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          if (result.value === "sent") successCount++;
        } else {
          console.error(`[CRON] Error processing user ${batch[index].user.id}:`, result.reason);
          errorCount++;
        }
      });
    }

    console.log(
      `[CRON] Completed. Success: ${successCount}, Errors: ${errorCount}, Skipped for time: ${skippedForTime}`
    );

    return NextResponse.json({
      success: true,
      // People this run got to (the ones left for lack of time are in skippedForTime)
      processed: eligibleUsers.length - skippedForTime,
      sent: successCount,
      errors: errorCount,
      skippedForTime,
      timeSlot: currentTimeSlot,
    });
  } catch (error) {
    console.error("[CRON] Fatal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

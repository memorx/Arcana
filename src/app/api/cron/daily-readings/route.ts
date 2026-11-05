import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDailyInterpretation } from "@/lib/anthropic";
import { sendDailyReadingEmail } from "@/lib/email";
import { verifyCronRequest } from "@/lib/cron-auth";
import { claimBirthdayGift, isBirthdayToday } from "@/lib/birthday";
import { describeDayEnergies, getDayEnergies } from "@/lib/systems";

/** Day energies as plain text for the prompt and the email; never blocks the card. */
function buildDayContext(today: Date, birthDate: Date | null | undefined, locale: "en" | "es") {
  try {
    return describeDayEnergies(getDayEnergies(today, birthDate), locale);
  } catch (error) {
    console.error("[CRON] Could not compute the day energies:", error);
    return undefined;
  }
}

// Vercel Cron runs this every hour at minute 0
// We'll process users whose emailTime matches the current hour

// One AI call per subscriber in this slot.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
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
    // Find all active subscribers whose email time matches current hour
    // We need to join with user profile to get emailTime
    const eligibleUsers = await prisma.subscription.findMany({
      where: {
        status: "active",
        user: {
          profile: {
            emailTime: currentTimeSlot,
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

    console.log(`[CRON] Found ${eligibleUsers.length} eligible users`);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Get all cards
    const allCards = await prisma.card.findMany();

    let successCount = 0;
    let errorCount = 0;

    for (const sub of eligibleUsers) {
      const user = sub.user;
      const profile = user.profile;

      if (!profile) {
        console.log(`[CRON] Skipping user ${user.id} - no profile`);
        continue;
      }

      try {
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
          continue;
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
        const selectedCard =
          availableCards[Math.floor(Math.random() * availableCards.length)];

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
        const dateStr = today.toLocaleDateString(
          locale === "es" ? "es-ES" : "en-US",
          {
            weekday: "long",
            day: "numeric",
            month: "long",
          }
        );

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
        successCount++;
      } catch (error) {
        console.error(`[CRON] Error processing user ${user.id}:`, error);
        errorCount++;
      }
    }

    console.log(
      `[CRON] Completed. Success: ${successCount}, Errors: ${errorCount}`
    );

    return NextResponse.json({
      success: true,
      processed: eligibleUsers.length,
      sent: successCount,
      errors: errorCount,
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

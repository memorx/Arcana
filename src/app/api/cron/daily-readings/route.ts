import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDailyInterpretation } from "@/lib/anthropic";
import { sendDailyReadingEmail } from "@/lib/email";

// Vercel Cron runs this every hour at minute 0
// We'll process users whose emailTime matches the current hour

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get("authorization");
  console.log(`[CRON] Auth header present: ${!!authHeader}`);
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

        // Determine user's preferred locale (default to Spanish)
        const locale = profile.locale || "es";

        // Generate interpretation
        const interpretation = await generateDailyInterpretation({
          cardName: selectedCard.name,
          cardNameEs: selectedCard.nameEs,
          isReversed,
          zodiacSign: profile.zodiacSign,
          focusArea: profile.focusArea,
          userName: profile.fullName.split(" ")[0], // First name only
          locale,
        });

        // Create or update daily reading
        const dailyReading = await prisma.dailyReading.upsert({
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

        // Construct card image URL
        const cardImageUrl = `https://www.readarcana.com${selectedCard.imageUrl}`;

        // Send email
        await sendDailyReadingEmail({
          to: user.email,
          userName: profile.fullName.split(" ")[0],
          cardName: selectedCard.name,
          cardNameEs: selectedCard.nameEs,
          cardImage: cardImageUrl,
          isReversed,
          interpretation,
          date: dateStr,
          locale,
          zodiacSign: profile.zodiacSign,
          keywords: selectedCard.keywords,
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

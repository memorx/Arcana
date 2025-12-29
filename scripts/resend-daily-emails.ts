import { PrismaClient } from "@prisma/client";
import { sendDailyReadingEmail } from "../src/lib/email";

const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  console.log(`[RESEND] Looking for daily readings from ${today.toISOString()}`);

  // Find all daily readings for today that were sent
  const todaysReadings = await prisma.dailyReading.findMany({
    where: {
      date: today,
      sentAt: { not: null },
    },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
      card: true,
    },
  });

  console.log(`[RESEND] Found ${todaysReadings.length} readings to resend`);

  let successCount = 0;
  let errorCount = 0;

  for (const reading of todaysReadings) {
    const { user, card } = reading;
    const profile = user.profile;

    if (!profile) {
      console.log(`[RESEND] Skipping user ${user.id} - no profile`);
      continue;
    }

    try {
      const locale = profile.locale || "es";

      // Format date for email
      const dateStr = today.toLocaleDateString(
        locale === "es" ? "es-ES" : "en-US",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
        }
      );

      // Send email with the SAME card and interpretation
      await sendDailyReadingEmail({
        to: user.email,
        userName: profile.fullName.split(" ")[0],
        cardName: card.name,
        cardNameEs: card.nameEs,
        cardImage: card.imageUrl, // Now using correct URL
        isReversed: reading.isReversed,
        interpretation: reading.interpretation,
        date: dateStr,
        locale,
        zodiacSign: profile.zodiacSign,
        keywords: card.keywords,
      });

      console.log(`[RESEND] ✓ Sent to ${user.email} - ${card.nameEs}`);
      successCount++;
    } catch (error) {
      console.error(`[RESEND] ✗ Error sending to ${user.email}:`, error);
      errorCount++;
    }
  }

  console.log(`\n[RESEND] Completed!`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("[RESEND] Fatal error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });

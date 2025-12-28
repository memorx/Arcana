import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "alxfetisova@gmail.com";

  console.log(`\n=== Checking subscriber: ${email} ===\n`);

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      profile: true,
      subscription: true,
      dailyReadings: {
        orderBy: { date: "desc" },
        take: 5,
        include: { card: true },
      },
    },
  });

  if (!user) {
    console.log(`User not found: ${email}`);
    return;
  }

  console.log("=== USER ===");
  console.log(`ID:       ${user.id}`);
  console.log(`Email:    ${user.email}`);
  console.log(`Name:     ${user.name}`);
  console.log();

  if (user.profile) {
    console.log("=== PROFILE ===");
    console.log(`Full Name:    ${user.profile.fullName}`);
    console.log(`Zodiac Sign:  ${user.profile.zodiacSign}`);
    console.log(`Email Time:   ${user.profile.emailTime}`);
    console.log(`Focus Area:   ${user.profile.focusArea}`);
    console.log(`Locale:       ${user.profile.locale}`);
    console.log(`Birth Date:   ${user.profile.birthDate}`);
    console.log();
  } else {
    console.log("!!! NO PROFILE FOUND !!!\n");
  }

  if (user.subscription) {
    console.log("=== SUBSCRIPTION ===");
    console.log(`Plan:              ${user.subscription.plan}`);
    console.log(`Status:            ${user.subscription.status}`);
    console.log(`Payment Method:    ${user.subscription.paymentMethod}`);
    console.log(`Period Start:      ${user.subscription.currentPeriodStart}`);
    console.log(`Period End:        ${user.subscription.currentPeriodEnd}`);
    console.log(`Cancel at End:     ${user.subscription.cancelAtPeriodEnd}`);
    console.log();
  } else {
    console.log("!!! NO SUBSCRIPTION FOUND !!!\n");
  }

  console.log("=== RECENT DAILY READINGS ===");
  if (user.dailyReadings.length === 0) {
    console.log("No daily readings found.");
  } else {
    for (const reading of user.dailyReadings) {
      console.log(`Date: ${reading.date.toISOString().split("T")[0]}`);
      console.log(`  Card: ${reading.card?.name || "Unknown"} ${reading.isReversed ? "(Reversed)" : ""}`);
      console.log(`  Sent At: ${reading.sentAt || "NOT SENT"}`);
      console.log();
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

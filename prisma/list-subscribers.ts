import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n=== Daily Oracle Subscribers ===\n");

  const subscribers = await prisma.subscription.findMany({
    where: {
      status: "active",
      plan: "daily_oracle",
    },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (subscribers.length === 0) {
    console.log("No active subscribers found.\n");
    return;
  }

  console.log(`Found ${subscribers.length} active subscriber(s):\n`);
  console.log("-".repeat(100));

  for (const sub of subscribers) {
    const user = sub.user;
    const profile = user.profile;

    console.log(`Email:           ${user.email}`);
    console.log(`Name:            ${profile?.fullName || user.name || "N/A"}`);
    console.log(`Zodiac Sign:     ${profile?.zodiacSign || "N/A"}`);
    console.log(`Email Time:      ${profile?.emailTime || "N/A"} UTC`);
    console.log(`Payment Method:  ${sub.paymentMethod}`);
    console.log(`Period End:      ${sub.currentPeriodEnd?.toISOString().split("T")[0] || "N/A"}`);
    console.log(`Status:          ${sub.status}${sub.cancelAtPeriodEnd ? " (cancels at period end)" : ""}`);
    console.log("-".repeat(100));
  }

  console.log(`\nTotal: ${subscribers.length} subscriber(s)\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

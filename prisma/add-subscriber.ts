import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "alxfetisova@gmail.com";
  const fullName = "Alexandra Fetisova";
  const zodiacSign = "Sagittarius";
  const emailTime = "08:00";
  const paymentMethod = "credits";
  const periodEnd = new Date("2026-01-25");

  console.log(`\nAdding subscriber: ${email}\n`);

  // 1. Find or create user
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: fullName,
      },
    });
    console.log(`✓ Created user: ${email}`);
  } else {
    console.log(`✓ Found existing user: ${email}`);
  }

  // 2. Create or update UserProfile
  const profile = await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: {
      fullName,
      zodiacSign,
      emailTime,
    },
    create: {
      userId: user.id,
      fullName,
      birthDate: new Date("1990-12-01"), // Placeholder for Sagittarius
      zodiacSign,
      emailTime,
      focusArea: "general",
      locale: "en",
    },
  });
  console.log(`✓ Profile set: ${zodiacSign}, emailTime: ${emailTime}`);

  // 3. Create or update Subscription
  const subscription = await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      status: "active",
      paymentMethod,
      currentPeriodEnd: periodEnd,
      plan: "daily_oracle",
    },
    create: {
      userId: user.id,
      plan: "daily_oracle",
      status: "active",
      paymentMethod,
      currentPeriodStart: new Date(),
      currentPeriodEnd: periodEnd,
      creditsCostPerMonth: 10,
      freeReadingsPerMonth: 1,
    },
  });
  console.log(`✓ Subscription: ${paymentMethod}, ends: ${periodEnd.toISOString().split("T")[0]}`);

  console.log(`\n=== Done! ===\n`);
  console.log(`Email:          ${email}`);
  console.log(`Name:           ${fullName}`);
  console.log(`Zodiac:         ${zodiacSign}`);
  console.log(`Email Time:     ${emailTime} UTC`);
  console.log(`Payment:        ${paymentMethod}`);
  console.log(`Period End:     ${periodEnd.toISOString().split("T")[0]}`);
  console.log(`Status:         active\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

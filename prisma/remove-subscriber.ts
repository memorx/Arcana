import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "alxfetisova@gmail.com";

  console.log(`\nRemoving Daily Oracle subscription for: ${email}\n`);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { subscription: true },
  });

  if (!user) {
    console.log(`User not found: ${email}`);
    return;
  }

  if (!user.subscription) {
    console.log(`No subscription found for: ${email}`);
    return;
  }

  const subscription = await prisma.subscription.update({
    where: { userId: user.id },
    data: {
      status: "cancelled",
      cancelAtPeriodEnd: true,
    },
  });

  console.log(`✓ Subscription cancelled for: ${email}`);
  console.log(`  Previous status: active`);
  console.log(`  New status: ${subscription.status}`);
  console.log(`\n=== Done! ===\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

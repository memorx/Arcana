import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const emails = process.argv.slice(2);

  if (emails.length === 0) {
    console.error("Usage: npx ts-node prisma/add-tester-credits.ts email1@test.com email2@test.com ...");
    process.exit(1);
  }

  console.log(`\nUpdating ${emails.length} tester(s)...\n`);

  for (const email of emails) {
    try {
      const user = await prisma.user.update({
        where: { email: email.toLowerCase() },
        data: {
          credits: 9999,
          freeReadingsLeft: 999,
        },
      });

      console.log(`✓ ${email} -> 9999 credits, 999 free readings`);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("Record to update not found")) {
        console.error(`✗ ${email} -> User not found`);
      } else {
        console.error(`✗ ${email} -> Error:`, error);
      }
    }
  }

  console.log("\nDone!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const readings = await prisma.dailyReading.findMany({
    where: { date: today },
    include: { card: true, user: true }
  });

  console.log("Today's readings:\n");
  for (const r of readings) {
    console.log("User:", r.user.email);
    console.log("Card:", r.card.nameEs);
    console.log("Image URL:", r.card.imageUrl);
    console.log("---");
  }
}

main().then(() => prisma.$disconnect());

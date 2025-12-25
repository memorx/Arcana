import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

async function main() {
  console.log("Adding slugs to cards...\n");

  const cards = await prisma.card.findMany();

  for (const card of cards) {
    const slug = generateSlug(card.name);
    await prisma.card.update({
      where: { id: card.id },
      data: { slug },
    });
    console.log(`Card: ${card.name} -> ${slug}`);
  }

  console.log(`\nUpdated ${cards.length} cards.`);

  // Update classic spreads with category
  console.log("\nUpdating classic spreads with category...\n");

  const classicSpreads = [
    "Three Card Spread",
    "Simple Cross",
    "Horseshoe Spread",
    "Celtic Cross",
  ];

  for (const name of classicSpreads) {
    const result = await prisma.spreadType.updateMany({
      where: { name },
      data: { category: "classic" },
    });
    if (result.count > 0) {
      console.log(`Updated category for: ${name}`);
    }
  }

  console.log("\nDone! Slugs and categories updated.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });

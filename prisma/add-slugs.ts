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
    console.log(`Updated: ${card.name} -> ${slug}`);
  }

  console.log(`\nDone! Updated ${cards.length} cards.`);
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

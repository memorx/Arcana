import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

interface CardExport {
  id: string;
  name: string;
  nameEs: string;
  arcana: string;
  suit: string | null;
  number: number;
  keywords: string[];
  meaningUpright: string;
  meaningReversed: string;
  meaningUprightEn: string;
  meaningReversedEn: string;
}

async function exportCardMeanings() {
  console.log("Fetching cards from database...");

  const cards = await prisma.card.findMany({
    orderBy: [
      { arcana: "desc" }, // MAJOR first
      { suit: "asc" },
      { number: "asc" },
    ],
  });

  console.log(`Found ${cards.length} cards`);

  const exportData: CardExport[] = cards.map((card) => ({
    id: card.id,
    name: card.name,
    nameEs: card.nameEs,
    arcana: card.arcana,
    suit: card.suit,
    number: card.number,
    keywords: card.keywords,
    meaningUpright: card.meaningUpright,
    meaningReversed: card.meaningReversed,
    meaningUprightEn: "", // To be filled with English translation
    meaningReversedEn: "", // To be filled with English translation
  }));

  // Create data directory if it doesn't exist
  const dataDir = path.join(__dirname, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const outputPath = path.join(dataDir, "card-meanings.json");

  fs.writeFileSync(
    outputPath,
    JSON.stringify(exportData, null, 2),
    "utf-8"
  );

  console.log(`\nExported ${cards.length} cards to: ${outputPath}`);
  console.log("\nNext steps:");
  console.log("1. Fill in the 'meaningUprightEn' and 'meaningReversedEn' fields");
  console.log("2. Run the import script to update the database schema and data");
}

exportCardMeanings()
  .catch((error) => {
    console.error("Error exporting cards:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

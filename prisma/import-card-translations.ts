import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

interface CardTranslation {
  id: string;
  name: string;
  meaningUprightEn: string;
  meaningReversedEn: string;
}

async function importCardTranslations() {
  console.log("Reading translated card meanings...");

  const dataPath = path.join(__dirname, "data", "card-meanings-translated.json");

  if (!fs.existsSync(dataPath)) {
    console.error(`File not found: ${dataPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(dataPath, "utf-8");
  const cards: CardTranslation[] = JSON.parse(rawData);

  console.log(`Found ${cards.length} cards to update`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const card of cards) {
    // Skip cards without English translations
    if (!card.meaningUprightEn || !card.meaningReversedEn) {
      console.log(`  Skipping ${card.name} - no English translations`);
      skipped++;
      continue;
    }

    try {
      // Try by ID first, then by name as fallback
      let result = await prisma.card.updateMany({
        where: { id: card.id },
        data: {
          meaningUprightEn: card.meaningUprightEn,
          meaningReversedEn: card.meaningReversedEn,
        },
      });

      if (result.count === 0) {
        // Fallback to name match
        result = await prisma.card.updateMany({
          where: { name: card.name },
          data: {
            meaningUprightEn: card.meaningUprightEn,
            meaningReversedEn: card.meaningReversedEn,
          },
        });
      }

      if (result.count > 0) {
        console.log(`  Updated: ${card.name}`);
        updated++;
      } else {
        console.log(`  Not found: ${card.name}`);
        errors++;
      }
    } catch (error) {
      console.error(`  Error updating ${card.name}:`, error);
      errors++;
    }
  }

  console.log("\n=== Import Summary ===");
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log("======================");
}

importCardTranslations()
  .catch((error) => {
    console.error("Error importing translations:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

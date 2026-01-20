import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const challenges = [
  // Weekly Challenges
  {
    key: "weekly_explorer",
    name: "Explorer",
    nameEs: "Explorador",
    description: "Complete 5 readings this week",
    descriptionEs: "Haz 5 lecturas esta semana",
    icon: "🔍",
    type: "weekly",
    target: 5,
    creditReward: 3,
    requirement: "readings",
    requirementValue: null,
  },
  {
    key: "weekly_variety",
    name: "Variety",
    nameEs: "Variedad",
    description: "Use 3 different spread types",
    descriptionEs: "Usa 3 tipos de tiradas diferentes",
    icon: "🎴",
    type: "weekly",
    target: 3,
    creditReward: 3,
    requirement: "spread_types",
    requirementValue: null,
  },
  {
    key: "weekly_constancy",
    name: "Constancy",
    nameEs: "Constancia",
    description: "Maintain your streak for the whole week (7 days)",
    descriptionEs: "Mantén tu streak toda la semana (7 días)",
    icon: "🔥",
    type: "weekly",
    target: 7,
    creditReward: 5,
    requirement: "streak",
    requirementValue: null,
  },
  {
    key: "weekly_collector",
    name: "Collector",
    nameEs: "Coleccionista",
    description: "Discover 5 new cards",
    descriptionEs: "Descubre 5 cartas nuevas",
    icon: "🃏",
    type: "weekly",
    target: 5,
    creditReward: 3,
    requirement: "cards_discovered",
    requirementValue: null,
  },
  // Monthly Challenges
  {
    key: "monthly_dedicated",
    name: "Dedicated",
    nameEs: "Dedicado",
    description: "Complete 20 readings this month",
    descriptionEs: "Haz 20 lecturas este mes",
    icon: "📖",
    type: "monthly",
    target: 20,
    creditReward: 10,
    requirement: "readings",
    requirementValue: null,
  },
  {
    key: "monthly_deck_master",
    name: "Deck Master",
    nameEs: "Maestro del Mazo",
    description: "Discover 20 new cards",
    descriptionEs: "Descubre 20 cartas nuevas",
    icon: "🎯",
    type: "monthly",
    target: 20,
    creditReward: 10,
    requirement: "cards_discovered",
    requirementValue: null,
  },
  {
    key: "monthly_epic_streak",
    name: "Epic Streak",
    nameEs: "Racha Épica",
    description: "Reach a 14-day streak",
    descriptionEs: "Alcanza un streak de 14 días",
    icon: "⚡",
    type: "monthly",
    target: 14,
    creditReward: 15,
    requirement: "streak",
    requirementValue: null,
  },
  {
    key: "monthly_seeker",
    name: "Seeker",
    nameEs: "Buscador",
    description: "Complete 5 Celtic Cross readings",
    descriptionEs: "Haz 5 lecturas de Cruz Celta",
    icon: "✨",
    type: "monthly",
    target: 5,
    creditReward: 10,
    requirement: "specific_spread",
    requirementValue: "celtic_cross", // Will need to match actual spread name
  },
];

async function seedChallenges() {
  console.log("Seeding challenges...");

  for (const challenge of challenges) {
    await prisma.challenge.upsert({
      where: { key: challenge.key },
      update: {
        name: challenge.name,
        nameEs: challenge.nameEs,
        description: challenge.description,
        descriptionEs: challenge.descriptionEs,
        icon: challenge.icon,
        type: challenge.type,
        target: challenge.target,
        creditReward: challenge.creditReward,
        requirement: challenge.requirement,
        requirementValue: challenge.requirementValue,
      },
      create: challenge,
    });
    console.log(`  Created/updated challenge: ${challenge.key}`);
  }

  console.log("Challenges seeded successfully!");
}

seedChallenges()
  .catch((e) => {
    console.error("Error seeding challenges:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

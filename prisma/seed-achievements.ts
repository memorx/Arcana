import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const achievements = [
  // Por Lecturas
  {
    key: "first_reading",
    name: "First Reading",
    nameEs: "Primera Lectura",
    description: "Complete your first tarot reading",
    descriptionEs: "Completa tu primera lectura de tarot",
    icon: "🌟",
    category: "readings",
    requirement: 1,
    creditReward: 1,
  },
  {
    key: "seeker",
    name: "Seeker of Answers",
    nameEs: "Buscador de Respuestas",
    description: "Complete 10 readings",
    descriptionEs: "Completa 10 lecturas",
    icon: "🔮",
    category: "readings",
    requirement: 10,
    creditReward: 2,
  },
  {
    key: "mystic",
    name: "Mystic",
    nameEs: "Místico",
    description: "Complete 50 readings",
    descriptionEs: "Completa 50 lecturas",
    icon: "✨",
    category: "readings",
    requirement: 50,
    creditReward: 5,
  },
  {
    key: "oracle",
    name: "Oracle",
    nameEs: "Oráculo",
    description: "Complete 100 readings",
    descriptionEs: "Completa 100 lecturas",
    icon: "👁️",
    category: "readings",
    requirement: 100,
    creditReward: 10,
  },

  // Por Colección
  {
    key: "major_arcana",
    name: "Major Arcana Master",
    nameEs: "Maestro de Arcanos Mayores",
    description: "Discover all 22 Major Arcana cards",
    descriptionEs: "Descubre los 22 Arcanos Mayores",
    icon: "🎴",
    category: "collection",
    requirement: 22,
    creditReward: 5,
  },
  {
    key: "deck_explorer",
    name: "Deck Explorer",
    nameEs: "Explorador del Mazo",
    description: "Discover all 78 cards",
    descriptionEs: "Descubre las 78 cartas",
    icon: "🃏",
    category: "collection",
    requirement: 78,
    creditReward: 15,
  },

  // Por Tiempo
  {
    key: "early_bird",
    name: "Early Bird",
    nameEs: "Madrugador",
    description: "Do a reading before 7 AM",
    descriptionEs: "Haz una lectura antes de las 7 AM",
    icon: "🌅",
    category: "time",
    requirement: 1,
    creditReward: 1,
  },
  {
    key: "night_owl",
    name: "Night Owl",
    nameEs: "Noctámbulo",
    description: "Do a reading after midnight",
    descriptionEs: "Haz una lectura después de medianoche",
    icon: "🦉",
    category: "time",
    requirement: 1,
    creditReward: 1,
  },

  // Por Streaks
  {
    key: "consistent",
    name: "Consistent",
    nameEs: "Constante",
    description: "Reach a 7-day streak",
    descriptionEs: "Alcanza una racha de 7 días",
    icon: "🔥",
    category: "streak",
    requirement: 7,
    creditReward: 2,
  },
  {
    key: "devoted",
    name: "Devoted",
    nameEs: "Devoto",
    description: "Reach a 30-day streak",
    descriptionEs: "Alcanza una racha de 30 días",
    icon: "💫",
    category: "streak",
    requirement: 30,
    creditReward: 5,
  },
  {
    key: "enlightened",
    name: "Enlightened",
    nameEs: "Iluminado",
    description: "Reach a 100-day streak",
    descriptionEs: "Alcanza una racha de 100 días",
    icon: "🧘",
    category: "streak",
    requirement: 100,
    creditReward: 20,
  },

  // Por Suscripción
  {
    key: "daily_oracle",
    name: "Daily Oracle Subscriber",
    nameEs: "Suscriptor del Oráculo Diario",
    description: "Subscribe to the Daily Oracle",
    descriptionEs: "Suscríbete al Oráculo Diario",
    icon: "☀️",
    category: "subscription",
    requirement: 1,
    creditReward: 3,
  },
];

async function seedAchievements() {
  console.log("Seeding achievements...");

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { key: achievement.key },
      update: achievement,
      create: achievement,
    });
  }

  console.log(`Seeded ${achievements.length} achievements`);
}

seedAchievements()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

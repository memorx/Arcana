// Level definitions with XP requirements and rewards
export const LEVELS = [
  { level: 1, name: "Novice", nameEs: "Novato", xpRequired: 0, reward: 0, icon: "🌱" },
  { level: 2, name: "Apprentice", nameEs: "Aprendiz", xpRequired: 100, reward: 2, icon: "📚" },
  { level: 3, name: "Adept", nameEs: "Adepto", xpRequired: 300, reward: 5, icon: "🔮" },
  { level: 4, name: "Master", nameEs: "Maestro", xpRequired: 700, reward: 10, icon: "⭐" },
  { level: 5, name: "Oracle", nameEs: "Oráculo", xpRequired: 1500, reward: 20, icon: "👁️" },
] as const;

// XP rewards for different actions
export const XP_REWARDS = {
  READING_BASE: 10,
  READING_3_CARDS: 15,
  READING_CELTIC_CROSS: 25,
  STREAK_DAY: 5,
  NEW_CARD: 2,
  ACHIEVEMENT: 10,
} as const;

// Type for a level definition
export type LevelDefinition = (typeof LEVELS)[number];

// Get level definition by level number
export function getLevelDefinition(level: number): LevelDefinition {
  return LEVELS.find((l) => l.level === level) || LEVELS[0];
}

// Get the next level definition (or null if max level)
export function getNextLevelDefinition(currentLevel: number): LevelDefinition | null {
  const nextLevel = LEVELS.find((l) => l.level === currentLevel + 1);
  return nextLevel || null;
}

// Get level for a given XP amount
export function getLevelForXP(xp: number): number {
  let level = 1;
  for (const levelDef of LEVELS) {
    if (xp >= levelDef.xpRequired) {
      level = levelDef.level;
    } else {
      break;
    }
  }
  return level;
}

// Get XP required for next level (from current level)
export function getXPForNextLevel(currentLevel: number): number | null {
  const nextLevel = getNextLevelDefinition(currentLevel);
  return nextLevel ? nextLevel.xpRequired : null;
}

// Calculate progress percentage to next level
export function getLevelProgress(xp: number, currentLevel: number): number {
  const currentLevelDef = getLevelDefinition(currentLevel);
  const nextLevelDef = getNextLevelDefinition(currentLevel);

  if (!nextLevelDef) {
    return 100; // Max level
  }

  const xpInCurrentLevel = xp - currentLevelDef.xpRequired;
  const xpNeededForNextLevel = nextLevelDef.xpRequired - currentLevelDef.xpRequired;

  return Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100));
}

// Get XP reward based on reading card count
export function getXPForReading(cardCount: number): number {
  if (cardCount >= 10) {
    return XP_REWARDS.READING_CELTIC_CROSS;
  } else if (cardCount === 3) {
    return XP_REWARDS.READING_3_CARDS;
  }
  return XP_REWARDS.READING_BASE;
}

// Check if max level
export function isMaxLevel(level: number): boolean {
  return level >= LEVELS[LEVELS.length - 1].level;
}

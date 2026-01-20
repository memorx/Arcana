import { prisma } from "@/lib/prisma";
import {
  getLevelForXP,
  getLevelDefinition,
  getNextLevelDefinition,
  getLevelProgress,
  isMaxLevel,
  type LevelDefinition,
} from "@/lib/levels";

export interface LevelUpResult {
  leveledUp: boolean;
  newLevel: number;
  levelDefinition: LevelDefinition;
  creditsAwarded: number;
}

export interface XPResult {
  xpAdded: number;
  totalXP: number;
  currentLevel: number;
  levelUp: LevelUpResult | null;
}

export interface LevelProgressInfo {
  level: number;
  levelName: string;
  levelNameEs: string;
  levelIcon: string;
  xp: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number | null;
  progress: number;
  isMaxLevel: boolean;
}

/**
 * Add XP to a user and check for level up
 */
export async function addXP(
  userId: string,
  amount: number,
  reason: string
): Promise<XPResult> {
  // Get current user state
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true, level: true, credits: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const oldLevel = user.level;
  const newXP = user.xp + amount;
  const newLevel = getLevelForXP(newXP);

  // Update user XP and level
  await prisma.user.update({
    where: { id: userId },
    data: {
      xp: newXP,
      level: newLevel,
    },
  });

  // Check if leveled up
  let levelUp: LevelUpResult | null = null;

  if (newLevel > oldLevel) {
    const levelDef = getLevelDefinition(newLevel);
    const creditsToAward = levelDef.reward;

    // Award credits for leveling up
    if (creditsToAward > 0) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { credits: { increment: creditsToAward } },
        }),
        prisma.creditTransaction.create({
          data: {
            userId,
            amount: creditsToAward,
            type: "BONUS",
          },
        }),
      ]);
    }

    levelUp = {
      leveledUp: true,
      newLevel,
      levelDefinition: levelDef,
      creditsAwarded: creditsToAward,
    };

    console.log(
      `[XP] User ${userId} leveled up to ${newLevel} (${levelDef.name})! Awarded ${creditsToAward} credits. Reason: ${reason}`
    );
  }

  console.log(
    `[XP] User ${userId} gained ${amount} XP (${reason}). Total: ${newXP} XP, Level: ${newLevel}`
  );

  return {
    xpAdded: amount,
    totalXP: newXP,
    currentLevel: newLevel,
    levelUp,
  };
}

/**
 * Get level progress information for a user
 */
export async function getUserLevelProgress(
  userId: string
): Promise<LevelProgressInfo> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true, level: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const levelDef = getLevelDefinition(user.level);
  const nextLevelDef = getNextLevelDefinition(user.level);
  const progress = getLevelProgress(user.xp, user.level);

  return {
    level: user.level,
    levelName: levelDef.name,
    levelNameEs: levelDef.nameEs,
    levelIcon: levelDef.icon,
    xp: user.xp,
    xpForCurrentLevel: levelDef.xpRequired,
    xpForNextLevel: nextLevelDef?.xpRequired || null,
    progress,
    isMaxLevel: isMaxLevel(user.level),
  };
}

/**
 * Get level info by level number (no DB call, for display purposes)
 */
export function getLevelInfo(level: number, xp: number): LevelProgressInfo {
  const levelDef = getLevelDefinition(level);
  const nextLevelDef = getNextLevelDefinition(level);
  const progress = getLevelProgress(xp, level);

  return {
    level,
    levelName: levelDef.name,
    levelNameEs: levelDef.nameEs,
    levelIcon: levelDef.icon,
    xp,
    xpForCurrentLevel: levelDef.xpRequired,
    xpForNextLevel: nextLevelDef?.xpRequired || null,
    progress,
    isMaxLevel: isMaxLevel(level),
  };
}

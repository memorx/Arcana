import { prisma } from "@/lib/prisma";

export interface UnlockedAchievement {
  id: string;
  key: string;
  name: string;
  nameEs: string;
  description: string;
  descriptionEs: string;
  icon: string;
  category: string;
  creditReward: number;
}

export interface AchievementWithProgress {
  id: string;
  key: string;
  name: string;
  nameEs: string;
  description: string;
  descriptionEs: string;
  icon: string;
  category: string;
  requirement: number;
  creditReward: number;
  isUnlocked: boolean;
  unlockedAt: Date | null;
  progress: number; // Current progress towards requirement
}

/**
 * Check and unlock achievements for a user after a reading
 * Returns list of newly unlocked achievements
 */
export async function checkAndUnlockAchievements(
  userId: string,
  readingTime?: Date
): Promise<UnlockedAchievement[]> {
  // Get all achievements and user's existing achievements
  const [allAchievements, userAchievements, userStats] = await Promise.all([
    prisma.achievement.findMany(),
    prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    }),
    getUserStats(userId),
  ]);

  const unlockedIds = new Set(userAchievements.map((ua) => ua.achievementId));
  const newlyUnlocked: UnlockedAchievement[] = [];

  for (const achievement of allAchievements) {
    // Skip if already unlocked
    if (unlockedIds.has(achievement.id)) continue;

    // Check if achievement should be unlocked
    const shouldUnlock = checkAchievementCondition(
      achievement,
      userStats,
      readingTime
    );

    if (shouldUnlock) {
      // Unlock the achievement
      await unlockAchievement(userId, achievement.id, achievement.creditReward);
      newlyUnlocked.push({
        id: achievement.id,
        key: achievement.key,
        name: achievement.name,
        nameEs: achievement.nameEs,
        description: achievement.description,
        descriptionEs: achievement.descriptionEs,
        icon: achievement.icon,
        category: achievement.category,
        creditReward: achievement.creditReward,
      });
    }
  }

  return newlyUnlocked;
}

/**
 * Check if a specific achievement condition is met
 */
function checkAchievementCondition(
  achievement: {
    key: string;
    category: string;
    requirement: number;
  },
  stats: UserStats,
  readingTime?: Date
): boolean {
  switch (achievement.category) {
    case "readings":
      return stats.totalReadings >= achievement.requirement;

    case "collection":
      if (achievement.key === "major_arcana") {
        return stats.majorArcanaDiscovered >= achievement.requirement;
      }
      return stats.totalCardsDiscovered >= achievement.requirement;

    case "streak":
      return stats.currentStreak >= achievement.requirement ||
             stats.longestStreak >= achievement.requirement;

    case "subscription":
      return stats.hasActiveSubscription;

    case "time":
      if (!readingTime) return false;
      const hour = readingTime.getHours();
      if (achievement.key === "early_bird") {
        return hour < 7;
      }
      if (achievement.key === "night_owl") {
        return hour >= 0 && hour < 5; // After midnight but before 5am
      }
      return false;

    case "golden":
      if (achievement.key === "midas_touch") {
        // All major arcana as golden (22 cards)
        return stats.goldenMajorArcanaDiscovered >= achievement.requirement;
      }
      return stats.goldenCardsDiscovered >= achievement.requirement;

    default:
      return false;
  }
}

interface UserStats {
  totalReadings: number;
  totalCardsDiscovered: number;
  majorArcanaDiscovered: number;
  currentStreak: number;
  longestStreak: number;
  hasActiveSubscription: boolean;
  goldenCardsDiscovered: number;
  goldenMajorArcanaDiscovered: number;
}

/**
 * Get user stats for achievement checking
 */
async function getUserStats(userId: string): Promise<UserStats> {
  const [
    readingsCount,
    collectionStats,
    majorArcanaCount,
    goldenCardsCount,
    goldenMajorArcanaCount,
    user,
    subscription,
  ] = await Promise.all([
    prisma.reading.count({ where: { userId } }),
    prisma.userCardCollection.count({ where: { userId } }),
    prisma.userCardCollection.count({
      where: {
        userId,
        card: { arcana: "MAJOR" },
      },
    }),
    prisma.userGoldenCardCollection.count({ where: { userId } }),
    prisma.userGoldenCardCollection.count({
      where: {
        userId,
        card: { arcana: "MAJOR" },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, longestStreak: true },
    }),
    prisma.subscription.findUnique({
      where: { userId },
      select: { status: true },
    }),
  ]);

  return {
    totalReadings: readingsCount,
    totalCardsDiscovered: collectionStats,
    majorArcanaDiscovered: majorArcanaCount,
    currentStreak: user?.currentStreak || 0,
    longestStreak: user?.longestStreak || 0,
    hasActiveSubscription: subscription?.status === "active",
    goldenCardsDiscovered: goldenCardsCount,
    goldenMajorArcanaDiscovered: goldenMajorArcanaCount,
  };
}

/**
 * Unlock a specific achievement and award credits
 */
async function unlockAchievement(
  userId: string,
  achievementId: string,
  creditReward: number
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Create user achievement
    await tx.userAchievement.create({
      data: {
        userId,
        achievementId,
      },
    });

    // Award credits
    if (creditReward > 0) {
      await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: creditReward } },
      });

      // Create credit transaction
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: creditReward,
          type: "BONUS",
        },
      });
    }
  });
}

/**
 * Get all achievements with user progress
 */
export async function getUserAchievements(
  userId: string
): Promise<AchievementWithProgress[]> {
  const [allAchievements, userAchievements, stats] = await Promise.all([
    prisma.achievement.findMany({
      orderBy: [{ category: "asc" }, { requirement: "asc" }],
    }),
    prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true, unlockedAt: true },
    }),
    getUserStats(userId),
  ]);

  const unlockedMap = new Map(
    userAchievements.map((ua) => [ua.achievementId, ua.unlockedAt])
  );

  return allAchievements.map((achievement) => {
    const isUnlocked = unlockedMap.has(achievement.id);
    const unlockedAt = unlockedMap.get(achievement.id) || null;
    const progress = getAchievementProgress(achievement, stats);

    return {
      id: achievement.id,
      key: achievement.key,
      name: achievement.name,
      nameEs: achievement.nameEs,
      description: achievement.description,
      descriptionEs: achievement.descriptionEs,
      icon: achievement.icon,
      category: achievement.category,
      requirement: achievement.requirement,
      creditReward: achievement.creditReward,
      isUnlocked,
      unlockedAt,
      progress,
    };
  });
}

/**
 * Get current progress for an achievement
 */
function getAchievementProgress(
  achievement: { key: string; category: string; requirement: number },
  stats: UserStats
): number {
  switch (achievement.category) {
    case "readings":
      return Math.min(stats.totalReadings, achievement.requirement);

    case "collection":
      if (achievement.key === "major_arcana") {
        return Math.min(stats.majorArcanaDiscovered, achievement.requirement);
      }
      return Math.min(stats.totalCardsDiscovered, achievement.requirement);

    case "streak":
      return Math.min(
        Math.max(stats.currentStreak, stats.longestStreak),
        achievement.requirement
      );

    case "subscription":
      return stats.hasActiveSubscription ? 1 : 0;

    case "time":
      // Time achievements are binary - either unlocked or not
      return 0;

    case "golden":
      if (achievement.key === "midas_touch") {
        return Math.min(stats.goldenMajorArcanaDiscovered, achievement.requirement);
      }
      return Math.min(stats.goldenCardsDiscovered, achievement.requirement);

    default:
      return 0;
  }
}

/**
 * Get achievement stats for a user
 */
export async function getAchievementStats(userId: string): Promise<{
  unlocked: number;
  total: number;
  percentage: number;
}> {
  const [unlocked, total] = await Promise.all([
    prisma.userAchievement.count({ where: { userId } }),
    prisma.achievement.count(),
  ]);

  return {
    unlocked,
    total,
    percentage: total > 0 ? Math.round((unlocked / total) * 100) : 0,
  };
}

/**
 * Get recently unlocked achievements
 */
export async function getRecentAchievements(
  userId: string,
  limit: number = 3
): Promise<UnlockedAchievement[]> {
  const recent = await prisma.userAchievement.findMany({
    where: { userId },
    orderBy: { unlockedAt: "desc" },
    take: limit,
    include: { achievement: true },
  });

  return recent.map((ua) => ({
    id: ua.achievement.id,
    key: ua.achievement.key,
    name: ua.achievement.name,
    nameEs: ua.achievement.nameEs,
    description: ua.achievement.description,
    descriptionEs: ua.achievement.descriptionEs,
    icon: ua.achievement.icon,
    category: ua.achievement.category,
    creditReward: ua.achievement.creditReward,
  }));
}

/**
 * Get closest achievement to unlocking
 */
export async function getClosestAchievement(
  userId: string
): Promise<AchievementWithProgress | null> {
  const achievements = await getUserAchievements(userId);

  // Filter to locked achievements only
  const locked = achievements.filter((a) => !a.isUnlocked);

  if (locked.length === 0) return null;

  // Find the one closest to completion (highest progress percentage)
  let closest = locked[0];
  let closestPercentage = (closest.progress / closest.requirement) * 100;

  for (const achievement of locked) {
    const percentage = (achievement.progress / achievement.requirement) * 100;
    if (percentage > closestPercentage) {
      closest = achievement;
      closestPercentage = percentage;
    }
  }

  return closest;
}

/**
 * Check subscription achievement specifically
 * Call this when user subscribes
 */
export async function checkSubscriptionAchievement(
  userId: string
): Promise<UnlockedAchievement | null> {
  const achievement = await prisma.achievement.findUnique({
    where: { key: "daily_oracle" },
  });

  if (!achievement) return null;

  // Check if already unlocked
  const existing = await prisma.userAchievement.findUnique({
    where: {
      userId_achievementId: {
        userId,
        achievementId: achievement.id,
      },
    },
  });

  if (existing) return null;

  // Unlock
  await unlockAchievement(userId, achievement.id, achievement.creditReward);

  return {
    id: achievement.id,
    key: achievement.key,
    name: achievement.name,
    nameEs: achievement.nameEs,
    description: achievement.description,
    descriptionEs: achievement.descriptionEs,
    icon: achievement.icon,
    category: achievement.category,
    creditReward: achievement.creditReward,
  };
}

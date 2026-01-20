import { prisma } from "@/lib/prisma";

export interface ChallengeWithProgress {
  id: string;
  key: string;
  name: string;
  nameEs: string;
  description: string;
  descriptionEs: string;
  icon: string;
  type: "weekly" | "monthly";
  target: number;
  creditReward: number;
  requirement: string;
  progress: number;
  completed: boolean;
  completedAt: Date | null;
  periodStart: Date;
  periodEnd: Date;
}

export interface CompletedChallenge {
  id: string;
  key: string;
  name: string;
  nameEs: string;
  icon: string;
  creditReward: number;
}

export interface PeriodInfo {
  start: Date;
  end: Date;
}

/**
 * Get the current period dates for a challenge type
 */
export function getCurrentPeriod(type: "weekly" | "monthly"): PeriodInfo {
  const now = new Date();

  if (type === "weekly") {
    // Week starts on Monday
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const start = new Date(now);
    start.setDate(now.getDate() - daysToMonday);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    end.setHours(0, 0, 0, 0);

    return { start, end };
  } else {
    // Month starts on day 1
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    end.setHours(0, 0, 0, 0);

    return { start, end };
  }
}

/**
 * Initialize or get user challenges for the current period
 */
export async function initUserChallenges(userId: string): Promise<void> {
  const weeklyPeriod = getCurrentPeriod("weekly");
  const monthlyPeriod = getCurrentPeriod("monthly");

  // Get all active challenges
  const challenges = await prisma.challenge.findMany({
    where: { isActive: true },
  });

  // Create user challenges for each challenge if not exists
  for (const challenge of challenges) {
    const period = challenge.type === "weekly" ? weeklyPeriod : monthlyPeriod;

    await prisma.userChallenge.upsert({
      where: {
        userId_challengeId_periodStart: {
          userId,
          challengeId: challenge.id,
          periodStart: period.start,
        },
      },
      update: {},
      create: {
        userId,
        challengeId: challenge.id,
        progress: 0,
        completed: false,
        periodStart: period.start,
        periodEnd: period.end,
      },
    });
  }
}

/**
 * Get all active challenges with user progress
 */
export async function getActiveChallenges(
  userId: string
): Promise<ChallengeWithProgress[]> {
  // Initialize challenges first
  await initUserChallenges(userId);

  const weeklyPeriod = getCurrentPeriod("weekly");
  const monthlyPeriod = getCurrentPeriod("monthly");

  // Get user challenges for current periods
  const userChallenges = await prisma.userChallenge.findMany({
    where: {
      userId,
      OR: [
        { periodStart: weeklyPeriod.start },
        { periodStart: monthlyPeriod.start },
      ],
    },
    include: {
      challenge: true,
    },
    orderBy: [
      { challenge: { type: "asc" } },
      { completed: "asc" },
      { progress: "desc" },
    ],
  });

  return userChallenges.map((uc) => ({
    id: uc.challenge.id,
    key: uc.challenge.key,
    name: uc.challenge.name,
    nameEs: uc.challenge.nameEs,
    description: uc.challenge.description,
    descriptionEs: uc.challenge.descriptionEs,
    icon: uc.challenge.icon,
    type: uc.challenge.type as "weekly" | "monthly",
    target: uc.challenge.target,
    creditReward: uc.challenge.creditReward,
    requirement: uc.challenge.requirement,
    progress: uc.progress,
    completed: uc.completed,
    completedAt: uc.completedAt,
    periodStart: uc.periodStart,
    periodEnd: uc.periodEnd,
  }));
}

/**
 * Update challenge progress after an action
 * Returns list of newly completed challenges
 */
export async function updateChallengeProgress(
  userId: string,
  action: string,
  metadata?: {
    spreadTypeId?: string;
    spreadName?: string;
    cardsDiscovered?: number;
    currentStreak?: number;
  }
): Promise<CompletedChallenge[]> {
  const completedChallenges: CompletedChallenge[] = [];

  // Initialize challenges first
  await initUserChallenges(userId);

  const weeklyPeriod = getCurrentPeriod("weekly");
  const monthlyPeriod = getCurrentPeriod("monthly");

  // Get all non-completed user challenges for current periods
  const userChallenges = await prisma.userChallenge.findMany({
    where: {
      userId,
      completed: false,
      OR: [
        { periodStart: weeklyPeriod.start },
        { periodStart: monthlyPeriod.start },
      ],
    },
    include: {
      challenge: true,
    },
  });

  for (const uc of userChallenges) {
    let shouldUpdate = false;
    let incrementBy = 0;
    let newProgress = uc.progress;

    switch (action) {
      case "reading_completed":
        if (uc.challenge.requirement === "readings") {
          shouldUpdate = true;
          incrementBy = 1;
          newProgress = uc.progress + 1;
        }
        break;

      case "spread_used":
        if (uc.challenge.requirement === "spread_types") {
          // Need to count unique spread types used this period
          const uniqueSpreads = await countUniqueSpreadTypes(
            userId,
            uc.periodStart,
            uc.periodEnd
          );
          shouldUpdate = true;
          newProgress = uniqueSpreads;
        } else if (
          uc.challenge.requirement === "specific_spread" &&
          metadata?.spreadName?.toLowerCase().includes("celtic")
        ) {
          shouldUpdate = true;
          incrementBy = 1;
          newProgress = uc.progress + 1;
        }
        break;

      case "cards_discovered":
        if (uc.challenge.requirement === "cards_discovered" && metadata?.cardsDiscovered) {
          shouldUpdate = true;
          incrementBy = metadata.cardsDiscovered;
          newProgress = uc.progress + metadata.cardsDiscovered;
        }
        break;

      case "streak_updated":
        if (uc.challenge.requirement === "streak" && metadata?.currentStreak) {
          // For streak challenges, we track the max streak reached in the period
          if (metadata.currentStreak > uc.progress) {
            shouldUpdate = true;
            newProgress = metadata.currentStreak;
          }
        }
        break;
    }

    if (shouldUpdate) {
      const isCompleted = newProgress >= uc.challenge.target;

      // Update the user challenge
      await prisma.userChallenge.update({
        where: { id: uc.id },
        data: {
          progress: newProgress,
          completed: isCompleted,
          completedAt: isCompleted && !uc.completed ? new Date() : uc.completedAt,
        },
      });

      // If newly completed, award credits
      if (isCompleted && !uc.completed) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: userId },
            data: { credits: { increment: uc.challenge.creditReward } },
          }),
          prisma.creditTransaction.create({
            data: {
              userId,
              amount: uc.challenge.creditReward,
              type: "BONUS",
            },
          }),
        ]);

        completedChallenges.push({
          id: uc.challenge.id,
          key: uc.challenge.key,
          name: uc.challenge.name,
          nameEs: uc.challenge.nameEs,
          icon: uc.challenge.icon,
          creditReward: uc.challenge.creditReward,
        });

        console.log(
          `[Challenges] User ${userId} completed challenge ${uc.challenge.key}! Awarded ${uc.challenge.creditReward} credits.`
        );
      }
    }
  }

  return completedChallenges;
}

/**
 * Count unique spread types used by a user in a period
 */
async function countUniqueSpreadTypes(
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  const readings = await prisma.reading.findMany({
    where: {
      userId,
      createdAt: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
    select: {
      spreadTypeId: true,
    },
    distinct: ["spreadTypeId"],
  });

  return readings.length;
}

/**
 * Get challenges closest to completion for widget display
 */
export async function getClosestChallenges(
  userId: string,
  limit: number = 3
): Promise<ChallengeWithProgress[]> {
  const challenges = await getActiveChallenges(userId);

  // Filter to incomplete challenges and sort by progress percentage
  const incomplete = challenges
    .filter((c) => !c.completed)
    .sort((a, b) => {
      const percentA = a.progress / a.target;
      const percentB = b.progress / b.target;
      return percentB - percentA; // Highest progress first
    });

  return incomplete.slice(0, limit);
}

/**
 * Get time remaining until period reset
 */
export function getTimeUntilReset(type: "weekly" | "monthly"): {
  days: number;
  hours: number;
  minutes: number;
} {
  const period = getCurrentPeriod(type);
  const now = new Date();
  const diff = period.end.getTime() - now.getTime();

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes };
}

/**
 * Get challenge stats for a user
 */
export async function getChallengeStats(userId: string): Promise<{
  weekly: { completed: number; total: number };
  monthly: { completed: number; total: number };
}> {
  const challenges = await getActiveChallenges(userId);

  const weekly = challenges.filter((c) => c.type === "weekly");
  const monthly = challenges.filter((c) => c.type === "monthly");

  return {
    weekly: {
      completed: weekly.filter((c) => c.completed).length,
      total: weekly.length,
    },
    monthly: {
      completed: monthly.filter((c) => c.completed).length,
      total: monthly.length,
    },
  };
}

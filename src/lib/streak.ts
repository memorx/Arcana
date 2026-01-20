import { prisma } from "@/lib/prisma";
import { STREAK_MILESTONES } from "@/lib/streak-utils";

// Re-export utilities for convenience
export { STREAK_MILESTONES, getNextMilestone, getMilestoneProgress } from "@/lib/streak-utils";
export type { StreakMilestone } from "@/lib/streak-utils";

export interface StreakRewardInfo {
  milestone: number;
  creditsAwarded: number;
}

export interface StreakUpdateResult {
  currentStreak: number;
  longestStreak: number;
  reward: StreakRewardInfo | null;
}

/**
 * Update user's streak after completing a reading
 * Returns reward info if a new milestone was reached
 */
export async function updateStreak(userId: string): Promise<StreakUpdateResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      currentStreak: true,
      longestStreak: true,
      lastReadingDate: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let newStreak = 1;

  if (user.lastReadingDate) {
    const lastDate = new Date(user.lastReadingDate);
    const lastDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());

    const diffDays = Math.floor(
      (today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      // Same day - keep current streak
      newStreak = user.currentStreak;
    } else if (diffDays === 1) {
      // Next day - increment streak
      newStreak = user.currentStreak + 1;
    } else {
      // More than 1 day gap - reset streak
      newStreak = 1;
    }
  }

  const newLongestStreak = Math.max(newStreak, user.longestStreak);

  // Check for new milestone rewards
  let reward: StreakRewardInfo | null = null;

  // Only check for rewards if streak actually increased
  if (newStreak > user.currentStreak) {
    // Find if we crossed any milestone
    const crossedMilestone = STREAK_MILESTONES.find(
      (m) => newStreak >= m.days && user.currentStreak < m.days
    );

    if (crossedMilestone) {
      // Check if this milestone was already claimed
      const existingReward = await prisma.streakReward.findUnique({
        where: {
          userId_milestone: {
            userId,
            milestone: crossedMilestone.days,
          },
        },
      });

      if (!existingReward) {
        // Award the reward in a transaction
        await prisma.$transaction(async (tx) => {
          // Update user streak and add credits
          await tx.user.update({
            where: { id: userId },
            data: {
              currentStreak: newStreak,
              longestStreak: newLongestStreak,
              lastReadingDate: now,
              credits: { increment: crossedMilestone.credits },
            },
          });

          // Create streak reward record
          await tx.streakReward.create({
            data: {
              userId,
              milestone: crossedMilestone.days,
              creditsAwarded: crossedMilestone.credits,
            },
          });

          // Create credit transaction
          await tx.creditTransaction.create({
            data: {
              userId,
              amount: crossedMilestone.credits,
              type: "BONUS",
            },
          });
        });

        reward = {
          milestone: crossedMilestone.days,
          creditsAwarded: crossedMilestone.credits,
        };

        return {
          currentStreak: newStreak,
          longestStreak: newLongestStreak,
          reward,
        };
      }
    }
  }

  // No reward - just update streak
  await prisma.user.update({
    where: { id: userId },
    data: {
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastReadingDate: now,
    },
  });

  return {
    currentStreak: newStreak,
    longestStreak: newLongestStreak,
    reward: null,
  };
}

/**
 * Get claimed rewards for a user
 */
export async function getClaimedRewards(userId: string) {
  return prisma.streakReward.findMany({
    where: { userId },
    orderBy: { milestone: "asc" },
  });
}

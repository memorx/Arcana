// Streak utility functions that can be used on both client and server
// These functions don't depend on Prisma

// Streak milestones and their rewards
export const STREAK_MILESTONES = [
  { days: 3, credits: 1 },
  { days: 7, credits: 3 },
  { days: 14, credits: 5 },
  { days: 30, credits: 10 },
  { days: 60, credits: 20 },
  { days: 100, credits: 50 },
] as const;

export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

/**
 * Get the next milestone for a given streak
 */
export function getNextMilestone(currentStreak: number): StreakMilestone | null {
  return STREAK_MILESTONES.find((m) => m.days > currentStreak) || null;
}

/**
 * Get progress towards next milestone (0-100)
 */
export function getMilestoneProgress(currentStreak: number): {
  progress: number;
  nextMilestone: StreakMilestone | null;
  previousMilestone: StreakMilestone | null;
} {
  const nextMilestone = getNextMilestone(currentStreak);

  if (!nextMilestone) {
    // All milestones completed
    return { progress: 100, nextMilestone: null, previousMilestone: STREAK_MILESTONES[STREAK_MILESTONES.length - 1] };
  }

  // Find previous milestone
  const nextIndex = STREAK_MILESTONES.findIndex((m) => m.days === nextMilestone.days);
  const previousMilestone = nextIndex > 0 ? STREAK_MILESTONES[nextIndex - 1] : null;

  const startDays = previousMilestone?.days || 0;
  const endDays = nextMilestone.days;
  const progress = Math.round(((currentStreak - startDays) / (endDays - startDays)) * 100);

  return { progress: Math.min(progress, 100), nextMilestone, previousMilestone };
}

import { prisma } from "@/lib/prisma";

/**
 * Update user's streak after completing a reading
 * Returns bonus credits if streak milestone reached
 */
export async function updateStreak(userId: string): Promise<{
  currentStreak: number;
  longestStreak: number;
  bonusCredits: number;
}> {
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
  let bonusCredits = 0;

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

  // Check for milestone bonuses
  if (newStreak === 7 && user.currentStreak < 7) {
    bonusCredits = 1; // 7-day streak bonus
  } else if (newStreak === 30 && user.currentStreak < 30) {
    bonusCredits = 3; // 30-day streak bonus
  }

  const newLongestStreak = Math.max(newStreak, user.longestStreak);

  // Update user
  await prisma.user.update({
    where: { id: userId },
    data: {
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastReadingDate: now,
      credits: bonusCredits > 0 ? { increment: bonusCredits } : undefined,
    },
  });

  // If bonus credits, create transaction
  if (bonusCredits > 0) {
    await prisma.creditTransaction.create({
      data: {
        userId,
        amount: bonusCredits,
        type: "BONUS",
      },
    });
  }

  return {
    currentStreak: newStreak,
    longestStreak: newLongestStreak,
    bonusCredits,
  };
}

/**
 * @jest-environment node
 */

// Mock Prisma before importing streak
jest.mock("@/lib/prisma", () => {
  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    creditTransaction: {
      create: jest.fn(),
    },
    streakReward: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  return { prisma: prismaMock };
});

import { updateStreak } from "@/lib/streak";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("updateStreak", () => {
  const userId = "test-user-id";

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({});
    (mockPrisma.creditTransaction.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.streakReward.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.streakReward.create as jest.Mock).mockResolvedValue({});
    // Run the transaction callback against the same mocked client
    (mockPrisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(mockPrisma)
    );
  });

  it("throws error if user not found", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(updateStreak(userId)).rejects.toThrow("User not found");
  });

  it("starts streak at 1 for first reading", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      currentStreak: 0,
      longestStreak: 0,
      lastReadingDate: null,
    });

    const result = await updateStreak(userId);

    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.reward).toBeNull();
  });

  it("keeps same streak for multiple readings on same day", async () => {
    const today = new Date();

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      currentStreak: 5,
      longestStreak: 10,
      lastReadingDate: today, // Same day
    });

    const result = await updateStreak(userId);

    expect(result.currentStreak).toBe(5); // Unchanged
    expect(result.longestStreak).toBe(10);
    expect(result.reward).toBeNull();
  });

  it("increments streak for consecutive day", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      currentStreak: 3,
      longestStreak: 5,
      lastReadingDate: yesterday,
    });

    const result = await updateStreak(userId);

    expect(result.currentStreak).toBe(4);
    expect(result.longestStreak).toBe(5); // Not exceeded
    expect(result.reward).toBeNull();
  });

  it("resets streak after gap of more than 1 day", async () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      currentStreak: 10,
      longestStreak: 15,
      lastReadingDate: threeDaysAgo,
    });

    const result = await updateStreak(userId);

    expect(result.currentStreak).toBe(1); // Reset
    expect(result.longestStreak).toBe(15); // Preserved
    expect(result.reward).toBeNull();
  });

  it("updates longest streak when exceeded", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      currentStreak: 5,
      longestStreak: 5,
      lastReadingDate: yesterday,
    });

    const result = await updateStreak(userId);

    expect(result.currentStreak).toBe(6);
    expect(result.longestStreak).toBe(6); // Updated
  });

  // Milestone rewards come from STREAK_MILESTONES in src/lib/streak-utils.ts
  // (3 days → 1, 7 → 3, 14 → 5, 30 → 10, 60 → 20, 100 → 50 credits)
  describe("milestone bonuses", () => {
    it("awards 3 credits for reaching 7-day streak", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        currentStreak: 6, // Will become 7
        longestStreak: 6,
        lastReadingDate: yesterday,
      });

      const result = await updateStreak(userId);

      expect(result.currentStreak).toBe(7);
      expect(result.reward).toEqual({ milestone: 7, creditsAwarded: 3 });

      // Verify credit transaction was created
      expect(mockPrisma.creditTransaction.create).toHaveBeenCalledWith({
        data: {
          userId,
          amount: 3,
          type: "BONUS",
        },
      });

      // Verify the milestone was recorded so it can't be claimed twice
      expect(mockPrisma.streakReward.create).toHaveBeenCalledWith({
        data: { userId, milestone: 7, creditsAwarded: 3 },
      });

      // Verify user credits were incremented
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            credits: { increment: 3 },
          }),
        })
      );
    });

    it("awards 10 credits for reaching 30-day streak", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        currentStreak: 29, // Will become 30
        longestStreak: 29,
        lastReadingDate: yesterday,
      });

      const result = await updateStreak(userId);

      expect(result.currentStreak).toBe(30);
      expect(result.reward).toEqual({ milestone: 30, creditsAwarded: 10 });

      expect(mockPrisma.creditTransaction.create).toHaveBeenCalledWith({
        data: {
          userId,
          amount: 10,
          type: "BONUS",
        },
      });
    });

    it("does not award bonus if milestone already reached", async () => {
      const today = new Date();

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        currentStreak: 7, // Already at 7
        longestStreak: 10,
        lastReadingDate: today, // Same day
      });

      const result = await updateStreak(userId);

      expect(result.currentStreak).toBe(7);
      expect(result.reward).toBeNull();
      expect(mockPrisma.creditTransaction.create).not.toHaveBeenCalled();
    });

    it("does not award bonus if the milestone reward was already claimed", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        currentStreak: 6, // Will become 7 again (streak was lost and rebuilt)
        longestStreak: 20,
        lastReadingDate: yesterday,
      });
      (mockPrisma.streakReward.findUnique as jest.Mock).mockResolvedValue({
        id: "reward-1",
        milestone: 7,
      });

      const result = await updateStreak(userId);

      expect(result.currentStreak).toBe(7);
      expect(result.reward).toBeNull();
      expect(mockPrisma.creditTransaction.create).not.toHaveBeenCalled();
    });

    it("does not award bonus at non-milestone streaks", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        currentStreak: 10, // Will become 11
        longestStreak: 15,
        lastReadingDate: yesterday,
      });

      const result = await updateStreak(userId);

      expect(result.currentStreak).toBe(11);
      expect(result.reward).toBeNull();
      expect(mockPrisma.creditTransaction.create).not.toHaveBeenCalled();
    });
  });

  describe("database updates", () => {
    it("updates user with new streak data and lastReadingDate", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        currentStreak: 2,
        longestStreak: 5,
        lastReadingDate: yesterday,
      });

      await updateStreak(userId);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          currentStreak: 3,
          longestStreak: 5,
          lastReadingDate: expect.any(Date),
        }),
      });
    });
  });
});

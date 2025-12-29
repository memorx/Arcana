/**
 * @jest-environment node
 */

// Mock Prisma before importing streak
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    creditTransaction: {
      create: jest.fn(),
    },
  },
}));

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
    expect(result.bonusCredits).toBe(0);
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
    expect(result.bonusCredits).toBe(0);
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
    expect(result.bonusCredits).toBe(0);
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
    expect(result.bonusCredits).toBe(0);
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

  describe("milestone bonuses", () => {
    it("awards 1 credit for reaching 7-day streak", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        currentStreak: 6, // Will become 7
        longestStreak: 6,
        lastReadingDate: yesterday,
      });

      const result = await updateStreak(userId);

      expect(result.currentStreak).toBe(7);
      expect(result.bonusCredits).toBe(1);

      // Verify credit transaction was created
      expect(mockPrisma.creditTransaction.create).toHaveBeenCalledWith({
        data: {
          userId,
          amount: 1,
          type: "BONUS",
        },
      });

      // Verify user credits were incremented
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            credits: { increment: 1 },
          }),
        })
      );
    });

    it("awards 3 credits for reaching 30-day streak", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        currentStreak: 29, // Will become 30
        longestStreak: 29,
        lastReadingDate: yesterday,
      });

      const result = await updateStreak(userId);

      expect(result.currentStreak).toBe(30);
      expect(result.bonusCredits).toBe(3);

      expect(mockPrisma.creditTransaction.create).toHaveBeenCalledWith({
        data: {
          userId,
          amount: 3,
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
      expect(result.bonusCredits).toBe(0);
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
      expect(result.bonusCredits).toBe(0);
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

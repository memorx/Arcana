/**
 * @jest-environment node
 */

// In-memory stand-in for the two tables the gift touches. `updateMany`
// honours the conditional `where` the same way Postgres does, so the
// idempotency test exercises the real condition written in birthday.ts.
type UserRow = { id: string; credits: number; lastBirthdayGiftYear: number | null };
type TxRow = { userId: string; amount: number; type: string };

const db: { users: UserRow[]; profiles: Map<string, Date>; transactions: TxRow[] } = {
  users: [],
  profiles: new Map(),
  transactions: [],
};

type YearFilter = null | { lt: number };
type UserWhere = { id: string; OR: { lastBirthdayGiftYear: YearFilter }[] };

function matchesYear(row: UserRow, filter: YearFilter): boolean {
  if (filter === null) return row.lastBirthdayGiftYear === null;
  return row.lastBirthdayGiftYear !== null && row.lastBirthdayGiftYear < filter.lt;
}

const fakeTx = {
  user: {
    updateMany: jest.fn(
      async ({
        where,
        data,
      }: {
        where: UserWhere;
        data: { credits: { increment: number }; lastBirthdayGiftYear: number };
      }) => {
        const rows = db.users.filter(
          (u) => u.id === where.id && where.OR.some((c) => matchesYear(u, c.lastBirthdayGiftYear))
        );
        for (const row of rows) {
          row.credits += data.credits.increment;
          row.lastBirthdayGiftYear = data.lastBirthdayGiftYear;
        }
        return { count: rows.length };
      }
    ),
  },
  creditTransaction: {
    create: jest.fn(async ({ data }: { data: TxRow }) => {
      db.transactions.push(data);
      return data;
    }),
  },
};

jest.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: {
      findUnique: jest.fn(async ({ where }: { where: { userId: string } }) => {
        const birthDate = db.profiles.get(where.userId);
        return birthDate ? { birthDate } : null;
      }),
    },
    $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(fakeTx)),
  },
}));

import { prisma } from "@/lib/prisma";
import { BIRTHDAY_GIFT_CREDITS, claimBirthdayGift, isBirthdayToday } from "@/lib/birthday";

const utc = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(Date.UTC(y, m - 1, d, h, min));

describe("isBirthdayToday", () => {
  it("matches month and day, ignoring the year", () => {
    expect(isBirthdayToday(utc(1990, 7, 15), utc(2026, 7, 15))).toBe(true);
    expect(isBirthdayToday(utc(1990, 7, 15), utc(2026, 7, 16))).toBe(false);
    expect(isBirthdayToday(utc(1990, 7, 15), utc(2026, 8, 15))).toBe(false);
  });

  it("reads UTC fields (the test runner is in America/Mexico_City)", () => {
    // 1990-07-15T00:00Z is still July 14 in Mexico City; the local fields
    // would say "not today".
    expect(new Date(utc(1990, 7, 15)).getDate()).toBe(14);
    expect(isBirthdayToday(utc(1990, 7, 15), utc(2026, 7, 15))).toBe(true);
    // 23:59 UTC is still the same UTC day.
    expect(isBirthdayToday(utc(1990, 7, 15), utc(2026, 7, 15, 23, 59))).toBe(true);
    expect(isBirthdayToday(utc(1990, 7, 15), utc(2026, 7, 14, 23, 59))).toBe(false);
  });

  it("celebrates February 29 on February 28 in common years only", () => {
    const leapling = utc(2000, 2, 29);
    expect(isBirthdayToday(leapling, utc(2027, 2, 28))).toBe(true);
    expect(isBirthdayToday(leapling, utc(2027, 3, 1))).toBe(false);
    expect(isBirthdayToday(leapling, utc(2028, 2, 29))).toBe(true);
    expect(isBirthdayToday(leapling, utc(2028, 2, 28))).toBe(false);
    // Someone born on Feb 28 is not affected.
    expect(isBirthdayToday(utc(1999, 2, 28), utc(2028, 2, 28))).toBe(true);
    expect(isBirthdayToday(utc(1999, 2, 28), utc(2028, 2, 29))).toBe(false);
  });

  it("is false without a valid birth date", () => {
    expect(isBirthdayToday(null, utc(2026, 7, 15))).toBe(false);
    expect(isBirthdayToday(undefined, utc(2026, 7, 15))).toBe(false);
    expect(isBirthdayToday(new Date("nope"), utc(2026, 7, 15))).toBe(false);
  });
});

describe("claimBirthdayGift", () => {
  const birthday = utc(2026, 7, 15);

  beforeEach(() => {
    jest.clearAllMocks();
    db.users = [{ id: "user-1", credits: 2, lastBirthdayGiftYear: null }];
    db.profiles = new Map([["user-1", utc(1990, 7, 15)]]);
    db.transactions = [];
  });

  it("gives 3 credits and a BIRTHDAY transaction on the birthday", async () => {
    const result = await claimBirthdayGift("user-1", { today: birthday });

    expect(result).toEqual({ granted: true, credits: 3, isBirthday: true });
    expect(BIRTHDAY_GIFT_CREDITS).toBe(3);
    expect(db.users[0]).toMatchObject({ credits: 5, lastBirthdayGiftYear: 2026 });
    expect(db.transactions).toEqual([{ userId: "user-1", amount: 3, type: "BIRTHDAY" }]);
  });

  it("two calls on the same day give the gift once", async () => {
    const first = await claimBirthdayGift("user-1", { today: birthday });
    const second = await claimBirthdayGift("user-1", { today: utc(2026, 7, 15, 18) });

    expect(first.granted).toBe(true);
    expect(second).toEqual({ granted: false, credits: 3, isBirthday: true });
    expect(db.users[0].credits).toBe(5);
    expect(db.transactions).toHaveLength(1);
  });

  it("two simultaneous calls give the gift once", async () => {
    const results = await Promise.all([
      claimBirthdayGift("user-1", { today: birthday }),
      claimBirthdayGift("user-1", { today: birthday }),
    ]);

    expect(results.filter((r) => r.granted)).toHaveLength(1);
    expect(db.users[0].credits).toBe(5);
    expect(db.transactions).toHaveLength(1);
  });

  it("gives it again the next year", async () => {
    db.users[0].lastBirthdayGiftYear = 2025;

    const result = await claimBirthdayGift("user-1", { today: birthday });

    expect(result.granted).toBe(true);
    expect(db.users[0]).toMatchObject({ credits: 5, lastBirthdayGiftYear: 2026 });
  });

  it("does not write anything when it is not the birthday", async () => {
    const result = await claimBirthdayGift("user-1", { today: utc(2026, 7, 16) });

    expect(result).toEqual({ granted: false, credits: 3, isBirthday: false });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(db.users[0].credits).toBe(2);
  });

  it("does not write anything without a profile", async () => {
    db.profiles.clear();

    const result = await claimBirthdayGift("user-1", { today: birthday });

    expect(result).toEqual({ granted: false, credits: 3, isBirthday: false });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("uses the birth date it is given instead of reading the profile", async () => {
    db.profiles.clear();

    const result = await claimBirthdayGift("user-1", {
      today: birthday,
      birthDate: utc(1990, 7, 15),
    });

    expect(result.granted).toBe(true);
    expect(prisma.userProfile.findUnique).not.toHaveBeenCalled();
  });

  it("treats an explicit null birth date as no profile", async () => {
    const result = await claimBirthdayGift("user-1", { today: birthday, birthDate: null });

    expect(result.isBirthday).toBe(false);
    expect(prisma.userProfile.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("uses today's UTC date by default", async () => {
    jest.useFakeTimers({ now: utc(2026, 7, 15, 3), doNotFake: ["nextTick", "setImmediate", "queueMicrotask"] });
    try {
      const result = await claimBirthdayGift("user-1");
      expect(result.granted).toBe(true);
      expect(db.users[0].lastBirthdayGiftYear).toBe(2026);
    } finally {
      jest.useRealTimers();
    }
  });
});

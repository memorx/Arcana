import { prisma } from "@/lib/prisma";
import { todayUtc } from "@/lib/systems";

/** Credits added once a year, on the person's birthday. */
export const BIRTHDAY_GIFT_CREDITS = 3 as const;
/** Abuse control: accounts younger than this get the greeting but not the credits. */
export const BIRTHDAY_GIFT_MIN_ACCOUNT_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface BirthdayGiftResult {
  /** True only for the call that actually added the credits this year. */
  granted: boolean;
  /** The gift was already given this year (by an earlier call). */
  alreadyGranted: boolean;
  credits: typeof BIRTHDAY_GIFT_CREDITS;
  /** Today (UTC day) is the person's birthday, whether or not this call granted the gift. */
  isBirthday: boolean;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function isValidDate(date: Date | null | undefined): date is Date {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

/**
 * Whether `today` is the birthday of someone born on `birthDate`.
 * Reads UTC fields only (birth dates are stored at 00:00 UTC; "today" is
 * `todayUtc()`), so the answer never depends on the server's time zone.
 * People born on February 29 celebrate on February 28 in common years.
 */
export function isBirthdayToday(
  birthDate: Date | null | undefined,
  today: Date = todayUtc(),
): boolean {
  if (!isValidDate(birthDate) || !isValidDate(today)) return false;

  const birthMonth = birthDate.getUTCMonth();
  const birthDay = birthDate.getUTCDate();
  const month = today.getUTCMonth();
  const day = today.getUTCDate();

  if (birthMonth === month && birthDay === day) return true;

  return (
    birthMonth === 1 &&
    birthDay === 29 &&
    month === 1 &&
    day === 28 &&
    !isLeapYear(today.getUTCFullYear())
  );
}

/**
 * Gives the yearly birthday gift (3 credits) if today is the person's
 * birthday, the account is at least 30 days old and they have not received
 * it this year. Idempotent: the credit
 * update is conditional on `lastBirthdayGiftYear`, so two calls on the same
 * day (cron + dashboard, or two tabs) grant it only once.
 *
 * `birthDate` can be passed when the caller already has the profile; when it
 * is omitted the profile is read from the database. `null` means "no profile".
 */
export async function claimBirthdayGift(
  userId: string,
  opts: { birthDate?: Date | null; today?: Date } = {},
): Promise<BirthdayGiftResult> {
  const today = opts.today ?? todayUtc();

  let birthDate = opts.birthDate;
  if (birthDate === undefined) {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { birthDate: true },
    });
    birthDate = profile?.birthDate ?? null;
  }

  if (!isBirthdayToday(birthDate, today)) {
    return {
      granted: false,
      alreadyGranted: false,
      credits: BIRTHDAY_GIFT_CREDITS,
      isBirthday: false,
    };
  }

  const year = today.getUTCFullYear();
  const createdBefore = new Date(today.getTime() - BIRTHDAY_GIFT_MIN_ACCOUNT_DAYS * DAY_MS);

  const { granted, alreadyGranted } = await prisma.$transaction(async (tx) => {
    const { count } = await tx.user.updateMany({
      where: {
        id: userId,
        createdAt: { lt: createdBefore },
        OR: [{ lastBirthdayGiftYear: null }, { lastBirthdayGiftYear: { lt: year } }],
      },
      data: {
        credits: { increment: BIRTHDAY_GIFT_CREDITS },
        lastBirthdayGiftYear: year,
      },
    });

    if (count === 0) {
      // Already given this year, or the account is too new
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { lastBirthdayGiftYear: true },
      });
      return { granted: false, alreadyGranted: user?.lastBirthdayGiftYear === year };
    }

    await tx.creditTransaction.create({
      data: { userId, amount: BIRTHDAY_GIFT_CREDITS, type: "BIRTHDAY" },
    });
    return { granted: true, alreadyGranted: false };
  });

  return { granted, alreadyGranted, credits: BIRTHDAY_GIFT_CREDITS, isBirthday: true };
}

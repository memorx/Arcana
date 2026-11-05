/**
 * Internal helpers shared by the systems modules.
 *
 * Every date function in `src/lib/systems` reads the UTC fields of a `Date`
 * (birth dates are stored as UTC midnight), so the result never depends on
 * the server's or the browser's time zone.
 */

/** Positive modulo: `mod(-1, 13) === 12`. */
export function mod(x: number, n: number): number {
  return ((x % n) + n) % n;
}

export function assertValidDate(date: Date, label = "date"): void {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new RangeError(`Invalid ${label}`);
  }
}

export interface UtcParts {
  year: number;
  /** 1–12 */
  month: number;
  /** 1–31 */
  day: number;
}

/** Calendar fields of a date, read in UTC. */
export function utcParts(date: Date): UtcParts {
  assertValidDate(date);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

/** Today's date at 00:00 UTC (same convention as the daily reading). */
export function todayUtc(): Date {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now;
}

/** Sum of the decimal digits of a non-negative integer. */
export function digitSum(n: number): number {
  let rest = Math.abs(Math.trunc(n));
  let sum = 0;
  while (rest > 0) {
    sum += rest % 10;
    rest = Math.floor(rest / 10);
  }
  return sum;
}

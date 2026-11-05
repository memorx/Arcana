/**
 * Pure date helpers for the Arcana Calendar. Days are handled as "YYYY-MM-DD"
 * keys and built with Date.UTC, because every function in `@/lib/systems`
 * reads UTC fields. Nothing here depends on the browser's time zone.
 */
import type { Locale } from "@/lib/systems";

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export type WeekStart = 0 | 1;

export function toLocale(locale: string): Locale {
  return locale === "en" ? "en" : "es";
}

export function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" → that day at 00:00 UTC. Throws on anything else. */
export function fromDayKey(key: string): Date {
  const match = DAY_KEY.exec(key);
  if (!match) throw new RangeError(`Invalid day key: ${key}`);
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    throw new RangeError(`Invalid day key: ${key}`);
  }
  return date;
}

export function isDayKey(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    fromDayKey(value);
    return true;
  } catch {
    return false;
  }
}

export function addDays(key: string, days: number): string {
  return toDayKey(new Date(fromDayKey(key).getTime() + days * DAY_MS));
}

/** `month` is 0–11. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** `month` is 0–11; the result is normalised (month 12 → January of next year). */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(Date.UTC(year, month + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

/** Same day of the month in another month, clamped (Jan 31 + 1 month → Feb 28/29). */
export function shiftMonthKeepingDay(key: string, delta: number): string {
  const date = fromDayKey(key);
  const { year, month } = shiftMonth(date.getUTCFullYear(), date.getUTCMonth(), delta);
  const day = Math.min(date.getUTCDate(), daysInMonth(year, month));
  return toDayKey(new Date(Date.UTC(year, month, day)));
}

export function monthOf(key: string): { year: number; month: number } {
  const date = fromDayKey(key);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

export function isInMonth(key: string, year: number, month: number): boolean {
  const m = monthOf(key);
  return m.year === year && m.month === month;
}

/** Monday for Spanish, Sunday for English. */
export function weekStartFor(locale: Locale): WeekStart {
  return locale === "en" ? 0 : 1;
}

/** Column (0–6) of a weekday (0 = Sunday) in a week that starts on `weekStart`. */
function columnOf(weekday: number, weekStart: WeekStart): number {
  return (weekday - weekStart + 7) % 7;
}

/**
 * Weeks of a month as rows of 7 cells: a day key, or null for the padding
 * before the 1st and after the last day.
 */
export function buildMonthGrid(year: number, month: number, weekStart: WeekStart): (string | null)[][] {
  const first = new Date(Date.UTC(year, month, 1));
  const lead = columnOf(first.getUTCDay(), weekStart);
  const total = daysInMonth(year, month);

  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= total; day++) {
    cells.push(toDayKey(new Date(Date.UTC(year, month, day))));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** First and last day of the week that contains `key`. */
export function weekBounds(key: string, weekStart: WeekStart): { start: string; end: string } {
  const offset = columnOf(fromDayKey(key).getUTCDay(), weekStart);
  return { start: addDays(key, -offset), end: addDays(key, 6 - offset) };
}

const intlLocale = (locale: Locale) => (locale === "en" ? "en-US" : "es-MX");

/** Weekday names in column order: `narrow` for small screens, `long` for screen readers. */
export function weekdayNames(
  locale: Locale,
  weekStart: WeekStart,
): { narrow: string; short: string; long: string }[] {
  // 2026-11-01 is a Sunday
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.UTC(2026, 10, 1 + ((i + weekStart) % 7)));
    const fmt = (weekday: "narrow" | "short" | "long") =>
      new Intl.DateTimeFormat(intlLocale(locale), { weekday, timeZone: "UTC" }).format(date);
    return { narrow: fmt("narrow"), short: fmt("short"), long: fmt("long") };
  });
}

/** "noviembre de 2026" / "November 2026". */
export function formatMonthYear(year: number, month: number, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, 1)));
}

/** "4 de noviembre" / "November 4". */
export function formatDayMonth(key: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(fromDayKey(key));
}

/** "miércoles, 4 de noviembre de 2026" / "Wednesday, November 4, 2026". */
export function formatFullDate(key: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(fromDayKey(key));
}

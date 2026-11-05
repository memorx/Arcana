import {
  addDays,
  buildMonthGrid,
  daysInMonth,
  formatDayMonth,
  formatFullDate,
  formatMonthYear,
  fromDayKey,
  isDayKey,
  isInMonth,
  monthOf,
  shiftMonth,
  shiftMonthKeepingDay,
  toDayKey,
  toLocale,
  weekBounds,
  weekdayNames,
  weekStartFor,
} from "@/components/calendar/calendar-utils";

// The runner is in America/Mexico_City (UTC−6): anything that leaked local
// time would shift days here.
describe("calendar-utils", () => {
  it("round-trips day keys at 00:00 UTC", () => {
    const date = fromDayKey("2026-11-04");
    expect(date.toISOString()).toBe("2026-11-04T00:00:00.000Z");
    expect(toDayKey(date)).toBe("2026-11-04");
  });

  it("rejects malformed or impossible days", () => {
    expect(() => fromDayKey("2026-2-30")).toThrow(RangeError);
    expect(() => fromDayKey("2026-02-30")).toThrow(RangeError);
    expect(() => fromDayKey("2026-13-01")).toThrow(RangeError);
    expect(isDayKey("2028-02-29")).toBe(true);
    expect(isDayKey("2027-02-29")).toBe(false);
    expect(isDayKey(null)).toBe(false);
    expect(isDayKey("1990-07-15T00:00:00.000Z")).toBe(false);
  });

  it("adds days across months, years and DST changes", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    // US DST ends 2026-11-01; Mexico has no DST but the browser could be anywhere
    expect(addDays("2026-10-31", 2)).toBe("2026-11-02");
    expect(addDays("2026-11-04", -7)).toBe("2026-10-28");
  });

  it("knows month lengths and shifts months", () => {
    expect(daysInMonth(2026, 1)).toBe(28);
    expect(daysInMonth(2028, 1)).toBe(29);
    expect(daysInMonth(2026, 10)).toBe(30);
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftMonthKeepingDay("2026-01-31", 1)).toBe("2026-02-28");
    expect(shiftMonthKeepingDay("2028-01-31", 1)).toBe("2028-02-29");
    expect(shiftMonthKeepingDay("2026-11-04", -12)).toBe("2025-11-04");
    expect(monthOf("2026-11-04")).toEqual({ year: 2026, month: 10 });
    expect(isInMonth("2026-11-04", 2026, 10)).toBe(true);
    expect(isInMonth("2026-12-01", 2026, 10)).toBe(false);
  });

  it("starts the week on Monday in Spanish and on Sunday in English", () => {
    expect(weekStartFor("es")).toBe(1);
    expect(weekStartFor("en")).toBe(0);
    expect(toLocale("en")).toBe("en");
    expect(toLocale("fr")).toBe("es");
  });

  it("lays out November 2026 (starts on a Sunday) for both week starts", () => {
    const monday = buildMonthGrid(2026, 10, 1);
    expect(monday[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(monday[1][0]).toBe("2026-11-02");
    expect(monday.flat().filter(Boolean)).toHaveLength(30);
    expect(monday.every((week) => week.length === 7)).toBe(true);
    expect(monday[monday.length - 1]).toEqual(["2026-11-30", null, null, null, null, null, null]);

    const sunday = buildMonthGrid(2026, 10, 0);
    expect(sunday[0][0]).toBe("2026-11-01");
    expect(sunday).toHaveLength(5);
  });

  it("finds the edges of the week", () => {
    // 2026-11-04 is a Wednesday
    expect(weekBounds("2026-11-04", 1)).toEqual({ start: "2026-11-02", end: "2026-11-08" });
    expect(weekBounds("2026-11-04", 0)).toEqual({ start: "2026-11-01", end: "2026-11-07" });
    expect(weekBounds("2026-11-01", 1)).toEqual({ start: "2026-10-26", end: "2026-11-01" });
  });

  it("names weekdays in column order", () => {
    const es = weekdayNames("es", 1);
    expect(es[0].long).toBe("lunes");
    expect(es[6].long).toBe("domingo");
    const en = weekdayNames("en", 0);
    expect(en[0].long).toBe("Sunday");
    expect(en[1].short).toBe("Mon");
  });

  it("formats dates in UTC", () => {
    expect(formatDayMonth("2026-11-04", "es")).toBe("4 de noviembre");
    expect(formatDayMonth("2026-11-04", "en")).toBe("November 4");
    expect(formatMonthYear(2026, 10, "es")).toBe("noviembre de 2026");
    expect(formatMonthYear(2026, 10, "en")).toBe("November 2026");
    expect(formatFullDate("2026-11-01", "es")).toBe("domingo, 1 de noviembre de 2026");
    expect(formatFullDate("2026-11-01", "en")).toBe("Sunday, November 1, 2026");
  });
});

/**
 * @jest-environment node
 */
import {
  MOON_PHASES,
  SYNODIC_MONTH,
  getMoonPhase,
  getNextFullMoon,
  getNextNewMoon,
} from "@/lib/systems/moon";

const utc = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(Date.UTC(y, m - 1, d, h, min));
const DAY = 86_400_000;

/** Phase on the day or on one of its neighbours (±1 day tolerance from the plan). */
function phaseNear(date: Date): string[] {
  return [-1, 0, 1].map((k) => getMoonPhase(new Date(date.getTime() + k * DAY)).phase);
}

describe("getMoonPhase (vectors from the plan, ±1 day)", () => {
  it("2000-01-06 → new moon (the reference)", () => {
    expect(phaseNear(utc(2000, 1, 6))).toContain("new");
    expect(getMoonPhase(utc(2000, 1, 6)).phase).toBe("new");
  });

  it("2000-01-21 → full moon (total lunar eclipse)", () => {
    expect(phaseNear(utc(2000, 1, 21))).toContain("full");
    expect(getMoonPhase(utc(2000, 1, 21)).phase).toBe("full");
  });

  it("2026-01-03 → full moon", () => {
    expect(phaseNear(utc(2026, 1, 3))).toContain("full");
    expect(getMoonPhase(utc(2026, 1, 3)).phase).toBe("full");
  });
});

describe("getMoonPhase (shape)", () => {
  it("illumination is ~0 at new moon and ~1 at full moon", () => {
    expect(getMoonPhase(utc(2000, 1, 6)).illumination).toBeLessThan(0.02);
    expect(getMoonPhase(utc(2000, 1, 21)).illumination).toBeGreaterThan(0.98);
  });

  it("age stays within one synodic month", () => {
    for (let t = Date.UTC(1950, 0, 1); t < Date.UTC(2050, 0, 1); t += 97 * DAY) {
      const { age, illumination } = getMoonPhase(new Date(t));
      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThanOrEqual(SYNODIC_MONTH);
      expect(illumination).toBeGreaterThanOrEqual(0);
      expect(illumination).toBeLessThanOrEqual(1);
    }
  });

  it("goes through the eight phases in order during a lunation", () => {
    const order = MOON_PHASES.map((p) => p.phase);
    const seen: string[] = [];
    for (let d = 0; d < 30; d++) {
      const phase = getMoonPhase(new Date(Date.UTC(2000, 0, 7) + d * DAY)).phase;
      if (seen[seen.length - 1] !== phase) seen.push(phase);
    }
    // Starts the day after the new moon of Jan 6, 2000 and wraps back to the next one.
    expect(seen).toEqual([...order, "new"]);
  });

  it("gives the whole UTC day the same phase", () => {
    expect(getMoonPhase(utc(2026, 1, 3, 0, 0))).toEqual(getMoonPhase(utc(2026, 1, 3, 23, 59)));
  });

  it("has bilingual names and guidance for the eight phases", () => {
    expect(MOON_PHASES).toHaveLength(8);
    for (const p of MOON_PHASES) {
      expect(p.name.en && p.name.es && p.guidance.en && p.guidance.es && p.emoji).toBeTruthy();
    }
    expect(getMoonPhase(utc(2026, 1, 3)).name).toEqual({ en: "Full Moon", es: "Luna llena" });
  });

  it("throws on an invalid date", () => {
    expect(() => getMoonPhase(new Date("x"))).toThrow(RangeError);
  });
});

describe("getNextFullMoon / getNextNewMoon", () => {
  const within = (actual: Date, expected: Date, days = 1) =>
    expect(Math.abs(actual.getTime() - expected.getTime())).toBeLessThanOrEqual(days * DAY);

  it.each([
    [utc(2000, 1, 10), utc(2000, 1, 21, 4, 40)],
    [utc(2025, 12, 25), utc(2026, 1, 3, 10, 3)],
    [utc(2026, 2, 15), utc(2026, 3, 3, 11, 38)], // total lunar eclipse
  ])("full moon after %s ≈ %s", (from, expected) => {
    const next = getNextFullMoon(from);
    expect(next.getTime()).toBeGreaterThan(from.getTime());
    within(next, expected);
  });

  it.each([
    [utc(2024, 3, 30), utc(2024, 4, 8, 18, 21)], // total solar eclipse
    [utc(2026, 2, 1), utc(2026, 2, 17, 12, 1)], // annular solar eclipse
    [utc(2026, 8, 1), utc(2026, 8, 12, 17, 37)], // total solar eclipse
  ])("new moon after %s ≈ %s", (from, expected) => {
    const next = getNextNewMoon(from);
    expect(next.getTime()).toBeGreaterThan(from.getTime());
    within(next, expected);
  });

  it("is strictly after the given instant, one synodic month apart", () => {
    const first = getNextFullMoon(utc(2026, 1, 1));
    const second = getNextFullMoon(first);
    expect(second.getTime()).toBeGreaterThan(first.getTime());
    expect((second.getTime() - first.getTime()) / DAY).toBeCloseTo(SYNODIC_MONTH, 3);
  });

  it("puts the next new moon within the next synodic month", () => {
    const from = utc(2026, 11, 4);
    const next = getNextNewMoon(from);
    expect((next.getTime() - from.getTime()) / DAY).toBeLessThanOrEqual(SYNODIC_MONTH);
  });

  it("throws on an invalid date", () => {
    expect(() => getNextFullMoon(new Date(NaN))).toThrow(RangeError);
    expect(() => getNextNewMoon(new Date(NaN))).toThrow(RangeError);
  });
});

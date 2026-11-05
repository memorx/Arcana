/**
 * @jest-environment node
 */
import {
  getBirthdayNumber,
  getExpressionNumber,
  getLifePathNumber,
  getNumberMeaning,
  getNumerologyProfile,
  getPersonalDay,
  getPersonalMonth,
  getPersonalYear,
  getPersonalityNumber,
  getSoulUrgeNumber,
  normalizeName,
  reduceNumber,
  type CoreNumber,
} from "@/lib/systems/numerology";

const utc = (y: number, m: number, d: number, h = 0) => new Date(Date.UTC(y, m - 1, d, h));

describe("reduceNumber", () => {
  it.each([
    [9, true, 9],
    [10, true, 1],
    [29, true, 11],
    [29, false, 2],
    [38, true, 11],
    [22, true, 22],
    [22, false, 4],
    [33, true, 33],
    [33, false, 6],
    [99, true, 9],
    [1990, true, 1],
    [2009, true, 11],
  ])("reduceNumber(%i, %s) → %i", (n, keep, expected) => {
    expect(reduceNumber(n, keep)).toBe(expected);
  });

  it("keeps master numbers by default", () => {
    expect(reduceNumber(11)).toBe(11);
  });

  it("rejects 0, negatives and NaN", () => {
    expect(() => reduceNumber(0)).toThrow(RangeError);
    expect(() => reduceNumber(-5)).toThrow(RangeError);
    expect(() => reduceNumber(NaN)).toThrow(RangeError);
  });
});

describe("getLifePathNumber", () => {
  it("1990-07-15 → 5 (7 + 6 + 1 = 14 → 5)", () => {
    expect(getLifePathNumber(utc(1990, 7, 15))).toBe(5);
  });

  it("1988-08-08 → 6 (8 + 8 + 8 = 24 → 6)", () => {
    expect(getLifePathNumber(utc(1988, 8, 8))).toBe(6);
  });

  it("2000-11-11 → 6 (11 + 11 + 2 = 24); its birthday number keeps the master 11", () => {
    expect(getLifePathNumber(utc(2000, 11, 11))).toBe(6);
    expect(getBirthdayNumber(utc(2000, 11, 11))).toBe(11);
  });

  it("keeps master numbers in the final sum", () => {
    expect(getLifePathNumber(utc(1990, 1, 9))).toBe(11); // 1 + 9 + 1
    expect(getLifePathNumber(utc(2000, 11, 9))).toBe(22); // 11 + 9 + 2
    expect(getLifePathNumber(utc(2009, 11, 11))).toBe(33); // 11 + 11 + 11
  });

  it("reads the UTC day", () => {
    // 1990-07-15 00:00Z is July 14 in Mexico City; 23:00Z is July 16 in Tokyo.
    expect(getLifePathNumber(utc(1990, 7, 15, 0))).toBe(5);
    expect(getLifePathNumber(utc(1990, 7, 15, 23))).toBe(5);
  });
});

describe("getBirthdayNumber", () => {
  it.each([
    [1, 1],
    [9, 9],
    [10, 1],
    [11, 11],
    [22, 22],
    [29, 11],
    [31, 4],
  ])("day %i → %i", (day, expected) => {
    expect(getBirthdayNumber(utc(1990, 1, day))).toBe(expected);
  });
});

describe("personal cycles (no master numbers)", () => {
  const birth = utc(1990, 7, 15);
  const on = utc(2026, 11, 4);

  it("personal year: 7 + 6 + (2026 → 1) = 14 → 5", () => {
    expect(getPersonalYear(birth, on)).toBe(5);
  });

  it("personal month: 5 + 11 = 16 → 7", () => {
    expect(getPersonalMonth(birth, on)).toBe(7);
  });

  it("personal day: 7 + 4 = 11 → 2 (not kept as master)", () => {
    expect(getPersonalDay(birth, on)).toBe(2);
  });

  it("always stays within 1–9 over a whole year", () => {
    for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2027, 0, 1); t += 86_400_000) {
      const day = getPersonalDay(birth, new Date(t));
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(9);
    }
  });

  it("advances one by one from day to day within a month", () => {
    const a = getPersonalDay(birth, utc(2026, 11, 4));
    const b = getPersonalDay(birth, utc(2026, 11, 5));
    expect(b).toBe((a % 9) + 1);
  });
});

describe("names", () => {
  it('"John Smith" → expression 8 (20 → 2, 24 → 6)', () => {
    expect(getExpressionNumber("John Smith")).toBe(8);
  });

  it('"John Smith" → soul urge 6 and personality 11', () => {
    expect(getSoulUrgeNumber("John Smith")).toBe(6);
    expect(getPersonalityNumber("John Smith")).toBe(11);
  });

  it("removes accents and treats ñ as n and ü as u", () => {
    expect(getExpressionNumber("José Peña")).toBe(4);
    expect(getExpressionNumber("José Peña")).toBe(getExpressionNumber("Jose Pena"));
    expect(getExpressionNumber("JOSÉ PEÑA")).toBe(getExpressionNumber("jose pena"));
    expect(getExpressionNumber("Ñu")).toBe(8);
    expect(getExpressionNumber("Güero")).toBe(getExpressionNumber("Guero"));
    expect(normalizeName("María-José Núñez Argüelles")).toEqual(["maria", "jose", "nunez", "arguelles"]);
  });

  it("works with precomposed and decomposed accents alike", () => {
    const composed = "María";
    const decomposed = "María";
    expect(getExpressionNumber(composed)).toBe(getExpressionNumber(decomposed));
  });

  it("treats spaces and hyphens as separators and ignores symbols", () => {
    expect(getExpressionNumber("Mary-Jane O'Neil")).toBe(getExpressionNumber("Mary Jane ONeil"));
    expect(getExpressionNumber("  Ana   Sofía  ")).toBe(getExpressionNumber("Ana Sofia"));
    expect(getExpressionNumber("Ana_Sofía")).toBe(getExpressionNumber("Ana Sofia"));
    expect(getExpressionNumber("Ana 2 Sofía!!")).toBe(getExpressionNumber("Ana Sofia"));
  });

  it("counts y as a vowel only when no other vowel is next to it", () => {
    expect(getSoulUrgeNumber("Lynn")).toBe(7); // y is the vowel
    expect(getSoulUrgeNumber("Maya")).toBe(2); // a + a; y is a consonant
    expect(getSoulUrgeNumber("Yolanda")).toBe(8); // o + a + a
    expect(getPersonalityNumber("Yolanda")).toBe(1); // y l n d = 19 → 1
  });

  it("returns null when there are no letters of that kind", () => {
    expect(getExpressionNumber("")).toBeNull();
    expect(getExpressionNumber("123 !!")).toBeNull();
    expect(getSoulUrgeNumber("Brr")).toBeNull();
    expect(getPersonalityNumber("Ai")).toBeNull();
  });
});

describe("getNumberMeaning", () => {
  const all: CoreNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33];

  it.each(all)("%i has bilingual name, keywords and description", (n) => {
    const m = getNumberMeaning(n);
    expect(m.number).toBe(n);
    for (const field of [m.name, m.keywords, m.description]) {
      expect(field.en.trim()).not.toBe("");
      expect(field.es.trim()).not.toBe("");
    }
    expect(m.tarotArcana).toBeGreaterThanOrEqual(0);
    expect(m.tarotArcana).toBeLessThanOrEqual(21);
  });

  it("maps numbers to the Major Arcana", () => {
    expect(getNumberMeaning(1).tarotArcana).toBe(1);
    expect(getNumberMeaning(11).tarotArcana).toBe(11);
    expect(getNumberMeaning(22).tarotArcana).toBe(0);
  });

  it("rejects numbers that are not core numbers", () => {
    expect(() => getNumberMeaning(10 as CoreNumber)).toThrow(RangeError);
  });
});

describe("getNumerologyProfile", () => {
  it("gathers every number", () => {
    expect(getNumerologyProfile(utc(1990, 7, 15), "John Smith", utc(2026, 11, 4))).toEqual({
      lifePath: 5,
      birthday: 6,
      expression: 8,
      soulUrge: 6,
      personality: 11,
      personalYear: 5,
      personalMonth: 7,
      personalDay: 2,
    });
  });

  it("defaults onDate to today and keeps null name numbers", () => {
    const profile = getNumerologyProfile(utc(1990, 7, 15), "");
    expect(profile.expression).toBeNull();
    expect(profile.personalYear).toBeGreaterThanOrEqual(1);
  });
});

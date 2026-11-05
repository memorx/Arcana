/**
 * @jest-environment node
 */
import {
  BLUEPRINT_DESCRIPTION_MAX,
  MAJOR_ARCANA,
  describeBlueprintForAI,
  describeDayEnergies,
  getArcanaBlueprint,
  getBirthCards,
  getChineseSign,
  getDayEnergies,
  getLifePathNumber,
  getMoonPhase,
  getNumerologyProfile,
  getTonalli,
  getWesternSign,
  todayUtc,
  type Locale,
} from "@/lib/systems";

const utc = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(Date.UTC(y, m - 1, d, h, min));
const LOCALES: Locale[] = ["en", "es"];
const BAD = /undefined|null|NaN|\[object Object\]/;

describe("getArcanaBlueprint", () => {
  const birth = utc(1990, 7, 15);
  const on = utc(2026, 11, 4);
  const bp = getArcanaBlueprint(birth, "  John   Smith ", on);

  it("gathers the five systems plus the moon at birth", () => {
    expect(bp.western).toEqual(getWesternSign(birth));
    expect(bp.chinese).toEqual(getChineseSign(birth));
    expect(bp.tonalli).toEqual(getTonalli(birth));
    expect(bp.numerology).toEqual(getNumerologyProfile(birth, "John Smith", on));
    expect(bp.birthCards).toEqual(getBirthCards(birth));
    expect(bp.moonAtBirth).toEqual(getMoonPhase(birth));
  });

  it("matches the known values for 1990-07-15", () => {
    expect(bp.western.key).toBe("Cancer");
    expect(bp.chinese.label.es).toBe("Caballo de Metal");
    expect(bp.tonalli.label.es).toBe("12 Cóatl · 12 Serpiente");
    expect(bp.numerology.lifePath).toBe(5);
    expect(bp.birthCards.personality).toBe(5);
  });

  it("stores the birth date as an ISO day and normalizes the name", () => {
    expect(bp.birthDate).toBe("1990-07-15");
    expect(bp.fullName).toBe("John Smith");
  });

  it("uses the UTC day for the ISO date", () => {
    expect(getArcanaBlueprint(utc(1990, 7, 15, 23), "Ana", on).birthDate).toBe("1990-07-15");
  });

  it("defaults onDate to today", () => {
    const today = todayUtc();
    expect(getArcanaBlueprint(birth, "Ana").numerology.personalDay).toBe(
      getNumerologyProfile(birth, "Ana", today).personalDay,
    );
  });
});

describe("describeBlueprintForAI", () => {
  const bp = getArcanaBlueprint(utc(1990, 7, 15), "John Smith", utc(2026, 11, 4));

  it("writes a complete Spanish summary", () => {
    const text = describeBlueprintForAI(bp, "es");
    expect(text).toContain("Mapa Arcano (nacimiento 1990-07-15)");
    expect(text).toContain("Zodiaco occidental: Cáncer (agua, cardinal; regente: Luna). Cuidado, memoria, intuición.");
    expect(text).toContain("Zodiaco chino: Caballo de Metal (Yang)");
    expect(text).toContain("Tonalpohualli (tradición mexica): 12 Cóatl · 12 Serpiente");
    expect(text).toContain("camino de vida 5 (la libertad), expresión 8, alma 6, personalidad 11");
    expect(text).toContain("Cartas natales del tarot: personalidad El Hierofante, alma El Hierofante.");
    expect(text).not.toContain("John");
  });

  it("writes a complete English summary", () => {
    const text = describeBlueprintForAI(bp, "en");
    expect(text).toContain("Arcana Blueprint (born 1990-07-15)");
    expect(text).toContain("Western zodiac: Cancer (water, cardinal; ruler: Moon). Care, memory, intuition.");
    expect(text).toContain("Chinese zodiac: Metal Horse (Yang)");
    expect(text).toContain("Tonalpohualli (Mexica tradition): 12 Cóatl · 12 Serpent");
    expect(text).toContain("life path 5 (freedom)");
    expect(text).toContain("Tarot birth cards: personality The Hierophant, soul The Hierophant.");
  });

  it.each(LOCALES)("fits in 900 characters with no undefined values (%s)", (locale) => {
    const names = ["", "Ana", "María José Núñez de la Fuente-Argüelles", "Bartolomé ".repeat(40)];
    let longest = 0;
    let i = 0;
    for (let t = Date.UTC(1925, 0, 1); t < Date.UTC(2030, 0, 1); t += 11 * 86_400_000) {
      const blueprint = getArcanaBlueprint(new Date(t), names[i++ % names.length], utc(2026, 11, 4));
      const text = describeBlueprintForAI(blueprint, locale);
      longest = Math.max(longest, text.length);
      expect(text.length).toBeLessThanOrEqual(BLUEPRINT_DESCRIPTION_MAX);
      expect(text).not.toMatch(BAD);
    }
    // The full version (with traits and meaning) is the normal case, far from the cap.
    expect(longest).toBeLessThan(BLUEPRINT_DESCRIPTION_MAX);
  });

  it("mentions the hidden factor when there is one and skips missing name numbers", () => {
    const bp19 = getArcanaBlueprint(utc(1950, 10, 12), "Brr", utc(2026, 11, 4)); // 1972 → 19
    const es = describeBlueprintForAI(bp19, "es");
    expect(es).toContain("personalidad El Sol, alma El Mago, factor oculto La Rueda de la Fortuna");
    expect(es).not.toContain("alma null");
    expect(es).toMatch(/expresión \d+/);
    expect(es).not.toMatch(BAD);
  });

  it("drops the optional sentences when the text would pass 900 characters", () => {
    const long = { en: "x".repeat(800), es: "x".repeat(800) };
    const bigTraits = { ...bp, western: { ...bp.western, traits: long } };
    for (const locale of LOCALES) {
      const text = describeBlueprintForAI(bigTraits, locale);
      expect(text.length).toBeLessThanOrEqual(BLUEPRINT_DESCRIPTION_MAX);
      expect(text).toMatch(/[.…]$/);
      expect(text).not.toContain("xxx");
    }
  });

  it("cuts with an ellipsis when even the compact text is too long", () => {
    const hugeName = { en: "y".repeat(1000), es: "y".repeat(1000) };
    const text = describeBlueprintForAI({ ...bp, western: { ...bp.western, name: hugeName } }, "es");
    expect(text.length).toBe(BLUEPRINT_DESCRIPTION_MAX);
    expect(text.endsWith("…")).toBe(true);
  });

  it("names The Fool for a personality of 22", () => {
    const bp22 = getArcanaBlueprint(utc(1970, 11, 12), "Ana", utc(2026, 11, 4));
    expect(describeBlueprintForAI(bp22, "en")).toContain(`personality ${MAJOR_ARCANA[0].name}`);
  });
});

describe("time-zone independence", () => {
  it("never reads local date fields (local getters spied to throw)", () => {
    const boom = (): never => {
      throw new Error("local date getter used");
    };
    const spies = [
      jest.spyOn(Date.prototype, "getDate").mockImplementation(boom),
      jest.spyOn(Date.prototype, "getMonth").mockImplementation(boom),
      jest.spyOn(Date.prototype, "getFullYear").mockImplementation(boom),
      jest.spyOn(Date.prototype, "getDay").mockImplementation(boom),
    ];
    const birth = utc(1990, 7, 15);
    let spyWorks = false;
    let results: unknown[] = [];
    try {
      try {
        new Date().getDate();
      } catch {
        spyWorks = true;
      }
      results = [
        getChineseSign(birth).label.es,
        getTonalli(birth).label.es,
        getLifePathNumber(birth),
        getBirthCards(birth).sum,
        getMoonPhase(birth).phase,
      ];
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
    expect(spyWorks).toBe(true);
    expect(results).toEqual([
      "Caballo de Metal",
      "12 Cóatl · 12 Serpiente",
      5,
      2012,
      getMoonPhase(birth).phase,
    ]);
  });

  // getWesternSign is excluded above: it hands src/lib/zodiac.ts a local Date built
  // from the UTC fields, and zodiac.ts reads local getters by design.
  it("getWesternSign uses the UTC day at the Aries cusp", () => {
    expect(getWesternSign(utc(1990, 3, 21, 0, 0)).key).toBe("Aries");
    expect(getWesternSign(utc(1990, 3, 20, 23, 59)).key).toBe("Pisces");
  });
});

describe("getDayEnergies / describeDayEnergies", () => {
  const day = utc(2026, 11, 4);

  it("returns tonalli and moon, and no personal day without a birth date", () => {
    const e = getDayEnergies(day);
    expect(e.tonalli.label.es).toBe("13 Miquiztli · 13 Muerte");
    expect(e.moon).toEqual(getMoonPhase(day));
    expect(e.personalDay).toBeNull();
    expect(getDayEnergies(day, null).personalDay).toBeNull();
  });

  it("adds the personal day with a birth date", () => {
    expect(getDayEnergies(day, utc(1990, 7, 15)).personalDay).toBe(2);
  });

  it("describes the day in two lines, or three with a personal day (es)", () => {
    const two = describeDayEnergies(getDayEnergies(day), "es");
    expect(two.split("\n")).toHaveLength(2);
    expect(two).toContain("Tonalli del día (tradición mexica): 13 Miquiztli · 13 Muerte, trecena Ce Océlotl.");
    expect(two).toContain("Fase lunar: ");

    const three = describeDayEnergies(getDayEnergies(day, utc(1990, 7, 15)), "es");
    expect(three.split("\n")).toHaveLength(3);
    expect(three).toContain("Día personal 2: cooperación, sensibilidad, diplomacia.");
  });

  it("describes the day in English", () => {
    const text = describeDayEnergies(getDayEnergies(day, utc(1990, 7, 15)), "en");
    expect(text).toContain("Day sign (Mexica tonalpohualli): 13 Miquiztli · 13 Death, trecena Ce Océlotl.");
    expect(text).toContain("Moon phase: ");
    expect(text).toContain("Personal day 2: cooperation, sensitivity, diplomacy.");
  });

  it.each(LOCALES)("never prints undefined over a year (%s)", (locale) => {
    for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2027, 0, 1); t += 86_400_000) {
      const text = describeDayEnergies(getDayEnergies(new Date(t), utc(1990, 7, 15)), locale);
      expect(text).not.toMatch(BAD);
      expect(text.split("\n").length).toBeLessThanOrEqual(3);
    }
  });
});

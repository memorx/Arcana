/**
 * @jest-environment node
 */
import {
  CHINESE_ANIMALS,
  LUNAR_NEW_YEAR,
  getChineseCompatibility,
  getChineseSign,
  getChineseYearSign,
} from "@/lib/systems/chinese-zodiac";

const utc = (y: number, m: number, d: number, h = 0) => new Date(Date.UTC(y, m - 1, d, h));

describe("getChineseSign (vectors from the plan)", () => {
  it.each([
    ["1990-01-15", "Snake", "Earth", 1989, "Serpiente de Tierra", "Earth Snake"],
    ["1990-02-20", "Horse", "Metal", 1990, "Caballo de Metal", "Metal Horse"],
    ["2000-02-05", "Dragon", "Metal", 2000, "Dragón de Metal", "Metal Dragon"],
    ["2024-02-10", "Dragon", "Wood", 2024, "Dragón de Madera", "Wood Dragon"],
    ["2024-02-09", "Rabbit", "Water", 2023, "Conejo de Agua", "Water Rabbit"],
  ])("%s → %s %s", (iso, animal, element, year, es, en) => {
    const sign = getChineseSign(new Date(`${iso}T00:00:00.000Z`));
    expect(sign.animal).toBe(animal);
    expect(sign.element).toBe(element);
    expect(sign.year).toBe(year);
    expect(sign.label).toEqual({ en, es });
  });

  it("uses the New Year day itself as the first day of the new animal", () => {
    expect(getChineseSign(utc(1990, 1, 26)).animal).toBe("Snake");
    expect(getChineseSign(utc(1990, 1, 27)).animal).toBe("Horse");
    expect(getChineseSign(utc(1985, 2, 19)).animal).toBe("Rat");
    expect(getChineseSign(utc(1985, 2, 20)).animal).toBe("Ox");
  });

  it("reads the UTC day, not the local one", () => {
    // 2024-02-10 00:00Z is still Feb 9 in Mexico City. This only discriminates when the
    // machine is not on UTC; the time-zone-proof check is in index.test.ts (spied getters).
    expect(getChineseSign(utc(2024, 2, 10, 0)).animal).toBe("Dragon");
    expect(getChineseSign(utc(2024, 2, 9, 23)).animal).toBe("Rabbit");
  });

  it("treats January dates before the New Year as the previous animal", () => {
    expect(getChineseSign(utc(2000, 1, 1)).animal).toBe("Rabbit");
    expect(getChineseSign(utc(2026, 1, 1)).label.es).toBe("Serpiente de Madera");
    expect(getChineseSign(utc(2026, 11, 4)).label.es).toBe("Caballo de Fuego");
  });

  it("outside the table it uses the Lichun approximation (February 4th)", () => {
    // Approximate on purpose: there is no verified table outside 1924–2043.
    expect(getChineseSign(utc(1923, 2, 3)).year).toBe(1922);
    expect(getChineseSign(utc(1923, 2, 4)).year).toBe(1923);
    expect(getChineseSign(utc(2050, 2, 4)).year).toBe(2050);
  });
});

describe("LUNAR_NEW_YEAR table", () => {
  const years = Object.keys(LUNAR_NEW_YEAR).map(Number);

  it("covers 1924–2043 with no gaps", () => {
    expect(years).toHaveLength(120);
    expect(Math.min(...years)).toBe(1924);
    expect(Math.max(...years)).toBe(2043);
  });

  it("always falls between January 21 and February 20", () => {
    for (const y of years) {
      const [m, d] = LUNAR_NEW_YEAR[y].split("-").map(Number);
      const doy = m === 1 ? d : 31 + d;
      expect(doy).toBeGreaterThanOrEqual(21);
      expect(doy).toBeLessThanOrEqual(51);
    }
  });

  it("is 12 or 13 lunar months from one year to the next", () => {
    for (const y of years.slice(1)) {
      const day = (yy: number) => {
        const [m, d] = LUNAR_NEW_YEAR[yy].split("-").map(Number);
        return Date.UTC(yy, m - 1, d) / 86_400_000;
      };
      expect([353, 354, 355, 383, 384, 385]).toContain(day(y) - day(y - 1));
    }
  });

  it.each([
    [1924, 2, 5],
    [1933, 1, 26],
    [1950, 2, 17],
    [1961, 2, 15],
    [1966, 1, 21],
    [1976, 1, 31],
    [1988, 2, 17],
    [1995, 1, 31],
    [2008, 2, 7],
    [2015, 2, 19],
    [2030, 2, 3],
    [2038, 2, 4],
    [2043, 2, 10],
  ])("New Year %i-%i-%i starts the year; the day before belongs to the previous one", (y, m, d) => {
    expect(getChineseSign(utc(y, m, d)).year).toBe(y);
    expect(getChineseSign(new Date(Date.UTC(y, m - 1, d) - 86_400_000)).year).toBe(y - 1);
  });
});

describe("getChineseYearSign", () => {
  it("starts the 60-year cycle with the Wood Rat in 1924", () => {
    expect(getChineseYearSign(1924)).toMatchObject({ animal: "Rat", element: "Wood", polarity: "Yang" });
    expect(getChineseYearSign(1925)).toMatchObject({ animal: "Ox", element: "Wood", polarity: "Yin" });
    expect(getChineseYearSign(1984)).toMatchObject({ animal: "Rat", element: "Wood" });
    expect(getChineseYearSign(1983)).toMatchObject({ animal: "Pig", element: "Water", polarity: "Yin" });
    expect(getChineseYearSign(2026)).toMatchObject({ animal: "Horse", element: "Fire", polarity: "Yang" });
  });

  it("works before 1924 with a positive modulo", () => {
    expect(getChineseYearSign(1900)).toMatchObject({ animal: "Rat", element: "Metal", polarity: "Yang" });
    expect(getChineseYearSign(1923)).toMatchObject({ animal: "Pig", element: "Water", polarity: "Yin" });
  });

  it("includes trine, secret friend and clash", () => {
    const dragon = getChineseYearSign(2024);
    expect(dragon.trine.sort()).toEqual(["Monkey", "Rat"]);
    expect(dragon.secretFriend).toBe("Rooster");
    expect(dragon.clash).toBe("Dog");
    expect(getChineseYearSign(1990)).toMatchObject({ clash: "Rat", secretFriend: "Goat" });
  });

  it("rejects non-integer years", () => {
    expect(() => getChineseYearSign(1990.5)).toThrow(RangeError);
  });
});

describe("getChineseCompatibility", () => {
  it.each([
    ["Rat", "Rat", "same", 4],
    ["Rat", "Dragon", "trine", 5],
    ["Monkey", "Rat", "trine", 5],
    ["Rat", "Ox", "secret-friend", 5],
    ["Tiger", "Pig", "secret-friend", 5],
    ["Rat", "Horse", "clash", 2],
    ["Rooster", "Rabbit", "clash", 2],
    ["Rat", "Tiger", "neutral", 3],
  ] as const)("%s + %s → %s (%i)", (a, b, relation, score) => {
    const result = getChineseCompatibility(a, b);
    expect(result.relation).toBe(relation);
    expect(result.score).toBe(score);
    expect(result.summary.es).toBeTruthy();
  });

  it("is symmetric for all 144 pairs", () => {
    for (const a of CHINESE_ANIMALS) {
      for (const b of CHINESE_ANIMALS) {
        expect(getChineseCompatibility(a, b).relation).toBe(getChineseCompatibility(b, a).relation);
      }
    }
  });

  it("gives every animal exactly 2 trine partners, 1 secret friend and 1 clash", () => {
    for (const a of CHINESE_ANIMALS) {
      const relations = CHINESE_ANIMALS.filter((b) => b !== a).map(
        (b) => getChineseCompatibility(a, b).relation,
      );
      expect(relations.filter((r) => r === "trine")).toHaveLength(2);
      expect(relations.filter((r) => r === "secret-friend")).toHaveLength(1);
      expect(relations.filter((r) => r === "clash")).toHaveLength(1);
    }
  });
});

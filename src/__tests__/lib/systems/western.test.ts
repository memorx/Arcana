/**
 * @jest-environment node
 */
import {
  WESTERN_SIGNS,
  WESTERN_SIGN_KEYS,
  getElementCompatibility,
  getWesternSign,
  getWesternSignByKey,
  type WesternElement,
} from "@/lib/systems/western";

const utc = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(Date.UTC(y, m - 1, d, h, min));

describe("getWesternSign", () => {
  it.each([
    [3, 20, "Pisces"],
    [3, 21, "Aries"],
    [4, 19, "Aries"],
    [4, 20, "Taurus"],
    [12, 21, "Sagittarius"],
    [12, 22, "Capricorn"],
    [1, 19, "Capricorn"],
    [1, 20, "Aquarius"],
    [2, 18, "Aquarius"],
    [2, 19, "Pisces"],
    [2, 29, "Pisces"],
  ])("%i/%i → %s", (month, day, expected) => {
    const year = month === 2 && day === 29 ? 2000 : 1990;
    expect(getWesternSign(utc(year, month, day)).key).toBe(expected);
  });

  it("reads the UTC calendar day, whatever the local time zone", () => {
    // Midnight UTC is still March 20 in Mexico City; 23:59 UTC is March 22 in Tokyo.
    // Only discriminates off UTC; see also the cusp check in index.test.ts.
    expect(getWesternSign(utc(1990, 3, 21, 0, 0)).key).toBe("Aries");
    expect(getWesternSign(utc(1990, 3, 21, 23, 59)).key).toBe("Aries");
    expect(getWesternSign(utc(1990, 4, 19, 23, 59)).key).toBe("Aries");
    expect(getWesternSign(utc(1990, 4, 20, 0, 0)).key).toBe("Taurus");
  });

  it("returns the full bilingual sign", () => {
    const sign = getWesternSign(utc(1990, 7, 15));
    expect(sign).toMatchObject({
      key: "Cancer",
      name: { en: "Cancer", es: "Cáncer" },
      emoji: "♋",
      element: "Water",
      modality: "Cardinal",
      ruler: { en: "Moon", es: "Luna" },
      tarotArcana: 7,
    });
    expect(sign.description.es.length).toBeGreaterThan(60);
  });

  it("throws on an invalid date", () => {
    expect(() => getWesternSign(new Date("nope"))).toThrow(RangeError);
  });
});

describe("WESTERN_SIGNS", () => {
  it("has the 12 signs with the tarot cards from the plan", () => {
    const tarot = Object.fromEntries(WESTERN_SIGN_KEYS.map((k) => [k, WESTERN_SIGNS[k].tarotArcana]));
    expect(tarot).toEqual({
      Aries: 4,
      Taurus: 5,
      Gemini: 6,
      Cancer: 7,
      Leo: 8,
      Virgo: 9,
      Libra: 11,
      Scorpio: 13,
      Sagittarius: 14,
      Capricorn: 15,
      Aquarius: 17,
      Pisces: 18,
    });
  });

  it("uses the Spanish names of src/lib/zodiac.ts", () => {
    expect(WESTERN_SIGN_KEYS.map((k) => WESTERN_SIGNS[k].name.es)).toEqual([
      "Aries",
      "Tauro",
      "Géminis",
      "Cáncer",
      "Leo",
      "Virgo",
      "Libra",
      "Escorpio",
      "Sagitario",
      "Capricornio",
      "Acuario",
      "Piscis",
    ]);
  });

  it("has three signs per element and four per modality", () => {
    const count = (fn: (k: (typeof WESTERN_SIGN_KEYS)[number]) => string) =>
      WESTERN_SIGN_KEYS.reduce<Record<string, number>>((acc, k) => {
        acc[fn(k)] = (acc[fn(k)] ?? 0) + 1;
        return acc;
      }, {});
    expect(count((k) => WESTERN_SIGNS[k].element)).toEqual({ Fire: 3, Earth: 3, Air: 3, Water: 3 });
    expect(count((k) => WESTERN_SIGNS[k].modality)).toEqual({ Cardinal: 4, Fixed: 4, Mutable: 4 });
  });

  it("finds a sign by its stored key", () => {
    expect(getWesternSignByKey("Leo")?.name.es).toBe("Leo");
    expect(getWesternSignByKey("Ophiuchus")).toBeNull();
  });
});

describe("getElementCompatibility", () => {
  const elements: WesternElement[] = ["Fire", "Earth", "Air", "Water"];
  const expected: Record<string, number> = {
    "Fire-Fire": 4,
    "Earth-Earth": 4,
    "Air-Air": 4,
    "Water-Water": 4,
    "Fire-Air": 5,
    "Earth-Water": 5,
    "Fire-Water": 2,
    "Earth-Air": 2,
    "Fire-Earth": 3,
    "Air-Water": 3,
  };

  it.each(elements.flatMap((a) => elements.map((b) => [a, b] as const)))(
    "%s + %s",
    (a, b) => {
      const key = expected[`${a}-${b}`] !== undefined ? `${a}-${b}` : `${b}-${a}`;
      const result = getElementCompatibility(a, b);
      expect(result.score).toBe(expected[key]);
      expect(result.summary.en).toBeTruthy();
      expect(result.summary.es).toBeTruthy();
    },
  );

  it("is symmetric", () => {
    for (const a of elements) {
      for (const b of elements) {
        expect(getElementCompatibility(a, b)).toBe(getElementCompatibility(b, a));
      }
    }
  });
});

/**
 * @jest-environment node
 */
import fs from "fs";
import path from "path";
import { MAJOR_ARCANA, getBirthCards, getTarotYearCard } from "@/lib/systems/birth-cards";

const utc = (y: number, m: number, d: number, h = 0) => new Date(Date.UTC(y, m - 1, d, h));

/** Reads the 22 Major Arcana straight from prisma/seed.ts. */
function seedMajorArcana(): { number: number; name: string; nameEs: string }[] {
  const seed = fs.readFileSync(path.join(process.cwd(), "prisma", "seed.ts"), "utf8");
  const start = seed.indexOf("const majorArcana");
  const block = seed.slice(start, seed.indexOf("];", start));
  const cards: { number: number; name: string; nameEs: string }[] = [];
  const re = /name:\s*"([^"]+)",\s*nameEs:\s*"([^"]+)",\s*number:\s*(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) cards.push({ name: m[1], nameEs: m[2], number: Number(m[3]) });
  return cards;
}

describe("MAJOR_ARCANA", () => {
  it("has 22 cards indexed 0–21", () => {
    expect(MAJOR_ARCANA).toHaveLength(22);
    MAJOR_ARCANA.forEach((card, i) => expect(card.index).toBe(i));
  });

  it("uses exactly the name and nameEs of prisma/seed.ts", () => {
    const seed = seedMajorArcana();
    expect(seed).toHaveLength(22);
    expect(MAJOR_ARCANA.map(({ index, name, nameEs }) => ({ number: index, name, nameEs }))).toEqual(seed);
  });

  it("starts with The Fool and ends with The World, Rider–Waite order", () => {
    expect(MAJOR_ARCANA[0].name).toBe("The Fool");
    expect(MAJOR_ARCANA[8].name).toBe("Strength");
    expect(MAJOR_ARCANA[11].name).toBe("Justice");
    expect(MAJOR_ARCANA[21].nameEs).toBe("El Mundo");
  });

  it("has bilingual keywords for every card", () => {
    for (const card of MAJOR_ARCANA) {
      expect(card.keywords.en.trim()).not.toBe("");
      expect(card.keywords.es.trim()).not.toBe("");
    }
  });
});

describe("getBirthCards (vectors from the plan)", () => {
  it("1990-07-15 → 2012 → 5: personality and soul The Hierophant", () => {
    expect(getBirthCards(utc(1990, 7, 15))).toEqual({ personality: 5, soul: 5, hidden: null, sum: 2012 });
  });

  it("1975-12-28 → 2015 → 8: Strength", () => {
    expect(getBirthCards(utc(1975, 12, 28))).toEqual({ personality: 8, soul: 8, hidden: null, sum: 2015 });
  });

  it("1962-08-21 → 1991 → 20: Judgement with soul 2", () => {
    expect(getBirthCards(utc(1962, 8, 21))).toEqual({ personality: 20, soul: 2, hidden: null, sum: 1991 });
  });
});

describe("getBirthCards (special cases)", () => {
  it("19 → 10 → 1: The Sun, hidden Wheel of Fortune, soul The Magician", () => {
    // 1950 + 10 + 12 = 1972 → 19
    expect(getBirthCards(utc(1950, 10, 12))).toEqual({ personality: 19, soul: 1, hidden: 10, sum: 1972 });
  });

  it("22 is The Fool (0) with soul The Emperor (4)", () => {
    // 1970 + 11 + 12 = 1993 → 22
    expect(getBirthCards(utc(1970, 11, 12))).toEqual({ personality: 0, soul: 4, hidden: null, sum: 1993 });
  });

  it("reduces again when the digit sum is above 22", () => {
    // 1980 + 7 + 12 = 1999 → 28 → 10
    expect(getBirthCards(utc(1980, 7, 12))).toEqual({ personality: 10, soul: 1, hidden: null, sum: 1999 });
  });

  it("reads the UTC day", () => {
    // Only discriminates off UTC; the time-zone-proof check is in index.test.ts (spied getters).
    expect(getBirthCards(utc(1990, 7, 15, 0)).sum).toBe(2012);
    expect(getBirthCards(utc(1990, 7, 15, 23)).sum).toBe(2012);
  });

  it("always returns valid Major Arcana indexes", () => {
    for (let t = Date.UTC(1940, 0, 1); t < Date.UTC(2010, 0, 1); t += 13 * 86_400_000) {
      const cards = getBirthCards(new Date(t));
      expect(cards.personality).toBeGreaterThanOrEqual(0);
      expect(cards.personality).toBeLessThanOrEqual(21);
      expect(cards.soul).toBeGreaterThanOrEqual(1);
      expect(cards.soul).toBeLessThanOrEqual(9);
      if (cards.hidden !== null) expect(cards.hidden).toBe(10);
    }
  });
});

describe("getTarotYearCard", () => {
  it("adds birth month and day to the given year", () => {
    // 7 + 15 + 2026 = 2048 → 14 Temperance
    expect(getTarotYearCard(utc(1990, 7, 15), 2026)).toBe(14);
    // 7 + 15 + 1990 = 2012 → 5, same as the personality card
    expect(getTarotYearCard(utc(1990, 7, 15), 1990)).toBe(5);
  });

  it("returns 0 (The Fool) for 22", () => {
    // 11 + 12 + 1970 = 1993 → 22
    expect(getTarotYearCard(utc(1960, 11, 12), 1970)).toBe(0);
  });

  it("rejects a non-integer year", () => {
    expect(() => getTarotYearCard(utc(1990, 7, 15), 2026.5)).toThrow(RangeError);
  });
});

/**
 * @jest-environment node
 */
import {
  DAY_SIGNS,
  LORDS_OF_THE_NIGHT,
  TONALPOHUALLI_CORRELATION,
  TRECENAS,
  getTonalli,
  julianDayNumber,
  tonalliFromJDN,
} from "@/lib/systems/tonalpohualli";

const utc = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(Date.UTC(y, m - 1, d, h, min));

describe("julianDayNumber", () => {
  it("2000-01-01 → 2451545", () => {
    expect(julianDayNumber(utc(2000, 1, 1))).toBe(2451545);
  });

  it.each([
    [utc(1970, 1, 1), 2440588],
    [utc(1858, 11, 17), 2400001], // MJD 0 is JD 2400000.5, i.e. this noon is JDN 2400001
    [utc(2026, 11, 4), 2461349],
    [utc(2012, 12, 21), 2456283],
    [utc(1582, 10, 15), 2299161], // first day of the Gregorian calendar
    [utc(2000, 2, 29), 2451604],
    [utc(2000, 3, 1), 2451605],
    [utc(1900, 3, 1), 2415080],
  ])("%s → %i", (date, jdn) => {
    expect(julianDayNumber(date)).toBe(jdn);
  });

  it("23 Aug 1521 Gregorian is the same day as 13 Aug 1521 Julian (JDN 2276828)", () => {
    expect(julianDayNumber(utc(1521, 8, 23))).toBe(2276828);
  });

  it("reads the UTC day whatever the hour", () => {
    expect(julianDayNumber(utc(2026, 11, 4, 0, 0))).toBe(2461349);
    expect(julianDayNumber(utc(2026, 11, 4, 23, 59))).toBe(2461349);
  });

  it("increments by one across month and year boundaries", () => {
    let prev = julianDayNumber(utc(1899, 12, 1));
    for (let t = Date.UTC(1899, 11, 2); t <= Date.UTC(1901, 2, 31); t += 86_400_000) {
      const jdn = julianDayNumber(new Date(t));
      expect(jdn).toBe(prev + 1);
      prev = jdn;
    }
  });

  it("throws on an invalid date", () => {
    expect(() => julianDayNumber(new Date(NaN))).toThrow(RangeError);
  });
});

describe("tonalliFromJDN / getTonalli (mandatory vectors)", () => {
  it("13 August 1521 Julian (JDN 2276828), fall of Tenochtitlan → 1 Cóatl", () => {
    const t = tonalliFromJDN(2276828);
    expect(t.number).toBe(1);
    expect(t.sign.nahuatl).toBe("Cóatl");
    expect(t.sign.index).toBe(4);
    expect(t.label).toEqual({ en: "1 Cóatl · 1 Serpent", es: "1 Cóatl · 1 Serpiente" });
    expect(t.trecena.nahuatl).toBe("Ce Cóatl");
  });

  it("4 November 2026 (JDN 2461349) → 13 Miquiztli", () => {
    const t = getTonalli(utc(2026, 11, 4));
    expect(t.number).toBe(13);
    expect(t.sign.nahuatl).toBe("Miquiztli");
    expect(t.label).toEqual({ en: "13 Miquiztli · 13 Death", es: "13 Miquiztli · 13 Muerte" });
    expect(t.cycleDay).toBe(25);
    expect(t.trecena.nahuatl).toBe("Ce Océlotl");
    expect(t.lordOfNight.nahuatl).toBe("Tepeyóllotl");
  });

  it("21 December 2012 (JDN 2456283) → 4 Xóchitl, the Maya 4 Ahau that closed baktun 13", () => {
    const t = getTonalli(utc(2012, 12, 21));
    expect(julianDayNumber(utc(2012, 12, 21))).toBe(2456283);
    expect(2456283 - TONALPOHUALLI_CORRELATION).toBe(1872000);
    expect(t.number).toBe(4);
    expect(t.sign.index).toBe(19);
    expect(t.sign.nahuatl).toBe("Xóchitl");
    expect(t.label.es).toBe("4 Xóchitl · 4 Flor");
  });

  it("2000-01-01 (JDN 2451545) is consistent with the formulas", () => {
    const d = 2451545 - TONALPOHUALLI_CORRELATION;
    const t = getTonalli(utc(2000, 1, 1));
    expect(t.number).toBe((((d + 3) % 13) + 13) % 13 + 1);
    expect(t.sign.index).toBe((((d + 19) % 20) + 20) % 20);
  });

  it("uses the UTC day: 4 Nov 2026 23:59 UTC is still 13 Miquiztli", () => {
    expect(getTonalli(utc(2026, 11, 4, 23, 59)).label.es).toBe("13 Miquiztli · 13 Muerte");
    expect(getTonalli(utc(2026, 11, 5, 0, 0)).label.es).toBe("1 Mázatl · 1 Venado");
  });
});

describe("cycle structure", () => {
  const start = 2461349 - 25; // 1 Cipactli before 4 Nov 2026

  it("cycleDay 0 is 1 Cipactli and the count repeats every 260 days", () => {
    const first = tonalliFromJDN(start);
    expect(first.cycleDay).toBe(0);
    expect(first.label.es).toBe("1 Cipactli · 1 Cocodrilo");
    expect(tonalliFromJDN(start + 260).label).toEqual(first.label);
    expect(tonalliFromJDN(start - 260).label).toEqual(first.label);
  });

  it("visits all 260 combinations exactly once and cycleDay matches number and sign", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 260; i++) {
      const t = tonalliFromJDN(start + i);
      expect(t.cycleDay).toBe(i);
      expect(t.cycleDay % 13).toBe(t.number - 1);
      expect(t.cycleDay % 20).toBe(t.sign.index);
      expect(t.trecena.index).toBe(Math.floor(i / 13));
      expect(t.lordOfNight.index).toBe(i % 9);
      seen.add(`${t.number}-${t.sign.index}`);
    }
    expect(seen.size).toBe(260);
  });

  it("each trecena starts on number 1 of the sign it is named after", () => {
    for (const trecena of TRECENAS) {
      const t = tonalliFromJDN(start + trecena.index * 13);
      expect(t.number).toBe(1);
      expect(trecena.nahuatl).toBe(`Ce ${t.sign.nahuatl}`);
      expect(t.trecena).toBe(trecena);
    }
  });

  it("handles JDNs before the correlation constant (positive modulo)", () => {
    const t = tonalliFromJDN(0);
    expect(t.number).toBeGreaterThanOrEqual(1);
    expect(t.number).toBeLessThanOrEqual(13);
    expect(t.cycleDay).toBeGreaterThanOrEqual(0);
    expect(t.cycleDay % 13).toBe(t.number - 1);
    expect(t.cycleDay % 20).toBe(t.sign.index);
  });

  it("rejects non-integer JDNs", () => {
    expect(() => tonalliFromJDN(2451545.5)).toThrow(RangeError);
  });
});

describe("content", () => {
  it("has the 20 day signs in the traditional order", () => {
    expect(DAY_SIGNS.map((s) => s.nahuatl)).toEqual([
      "Cipactli",
      "Ehécatl",
      "Calli",
      "Cuetzpalin",
      "Cóatl",
      "Miquiztli",
      "Mázatl",
      "Tochtli",
      "Atl",
      "Itzcuintli",
      "Ozomatli",
      "Malinalli",
      "Ácatl",
      "Océlotl",
      "Cuauhtli",
      "Cozcacuauhtli",
      "Ollin",
      "Técpatl",
      "Quiáhuitl",
      "Xóchitl",
    ]);
    DAY_SIGNS.forEach((s, i) => expect(s.index).toBe(i));
  });

  it("cycles the directions East, North, West, South", () => {
    expect(DAY_SIGNS.slice(0, 5).map((s) => s.direction.en)).toEqual(["East", "North", "West", "South", "East"]);
    expect(DAY_SIGNS[19].direction.es).toBe("Sur");
  });

  it("has 20 trecenas in calendar order", () => {
    expect(TRECENAS.map((t) => t.nahuatl)).toEqual([
      "Ce Cipactli",
      "Ce Océlotl",
      "Ce Mázatl",
      "Ce Xóchitl",
      "Ce Ácatl",
      "Ce Miquiztli",
      "Ce Quiáhuitl",
      "Ce Malinalli",
      "Ce Cóatl",
      "Ce Técpatl",
      "Ce Ozomatli",
      "Ce Cuetzpalin",
      "Ce Ollin",
      "Ce Itzcuintli",
      "Ce Calli",
      "Ce Cozcacuauhtli",
      "Ce Atl",
      "Ce Ehécatl",
      "Ce Cuauhtli",
      "Ce Tochtli",
    ]);
  });

  it("has the nine Lords of the Night in the Codex Borbonicus order", () => {
    expect(LORDS_OF_THE_NIGHT.map((l) => l.nahuatl)).toEqual([
      "Xiuhtecuhtli",
      "Itztli",
      "Piltzintecuhtli",
      "Centéotl",
      "Mictlantecuhtli",
      "Chalchiuhtlicue",
      "Tlazoltéotl",
      "Tepeyóllotl",
      "Tláloc",
    ]);
  });
});

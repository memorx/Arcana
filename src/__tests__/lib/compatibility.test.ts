/**
 * @jest-environment node
 */
import {
  CARD_ROLES,
  NUMBER_PAIRINGS,
  OVERALL_LABELS,
  OVERALL_SUM_RANGE,
  SYSTEM_SCORE_RANGES,
  overallFromSum,
  RELATIONSHIP_NUMBERS,
  TONALLI_RESONANCES,
  buildCompatibilitySummary,
  computeCompatibility,
  getNumberPairing,
  getStoredOverall,
  parseBirthDateInput,
  parseCompatibilitySummary,
  toIsoDay,
  toTextBlocks,
  type CompatibilityCard,
} from "@/lib/compatibility";
import { getLifePathNumber, getTonalli, type Bilingual } from "@/lib/systems";

const utc = (y: number, m: number, d: number, h = 0, min = 0) => new Date(Date.UTC(y, m - 1, d, h, min));
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);

const ME = { birthDate: utc(1990, 7, 15), fullName: "John Smith" };

describe("computeCompatibility — Chinese zodiac", () => {
  it("scores the same trine 5 (Rat 1984 and Dragon 1988)", () => {
    const r = computeCompatibility({ birthDate: utc(1984, 6, 1) }, { birthDate: utc(1988, 6, 1) });
    expect(r.chinese.a.animal).toBe("Rat");
    expect(r.chinese.b.animal).toBe("Dragon");
    expect(r.chinese.relation).toBe("trine");
    expect(r.chinese.score).toBe(5);
  });

  it("scores secret friends 5 (Rat and Ox)", () => {
    const r = computeCompatibility({ birthDate: utc(1984, 6, 1) }, { birthDate: utc(1985, 6, 1) });
    expect(r.chinese.relation).toBe("secret-friend");
    expect(r.chinese.score).toBe(5);
  });

  it("scores a clash with the library's lowest Chinese score (Rat and Horse → 2, Lote A)", () => {
    const r = computeCompatibility({ birthDate: utc(1984, 6, 1) }, { birthDate: utc(1990, 6, 1) });
    expect(r.chinese.b.animal).toBe("Horse");
    expect(r.chinese.relation).toBe("clash");
    expect(r.chinese.score).toBe(2);
    expect(r.chinese.summary.es).toContain("acuerdos claros");
  });

  it("uses the Lunar New Year boundary (1990-01-15 is still the Snake)", () => {
    const r = computeCompatibility({ birthDate: utc(1990, 1, 15) }, { birthDate: utc(1990, 2, 20) });
    expect(r.chinese.a.animal).toBe("Snake");
    expect(r.chinese.b.animal).toBe("Horse");
  });
});

describe("computeCompatibility — western elements", () => {
  it("fire and air score 5", () => {
    // Aries (fire) and Gemini (air)
    const r = computeCompatibility({ birthDate: utc(1990, 4, 1) }, { birthDate: utc(1991, 6, 1) });
    expect([r.western.a.element, r.western.b.element]).toEqual(["Fire", "Air"]);
    expect(r.western.score).toBe(5);
    expect(r.western.a.elementName.es).toBe("Fuego");
  });

  it("fire and water score 2", () => {
    // Aries (fire) and Cancer (water)
    const r = computeCompatibility({ birthDate: utc(1990, 4, 1) }, { birthDate: utc(1991, 7, 1) });
    expect(r.western.score).toBe(2);
  });

  it("reads the UTC day: 21 March 00:00Z is Aries even in Mexico City", () => {
    const r = computeCompatibility({ birthDate: utc(1990, 3, 21, 0, 0) }, { birthDate: utc(1990, 3, 20, 23, 59) });
    expect(r.western.a.key).toBe("Aries");
    expect(r.western.b.key).toBe("Pisces");
  });
});

describe("computeCompatibility — numerology", () => {
  it("adds the life paths and reduces the bond number to one digit", () => {
    // 1990-07-15 → 5; 1988-08-08 → 6; 5 + 6 = 11 → 2 (masters are not kept here)
    const r = computeCompatibility({ birthDate: utc(1990, 7, 15) }, { birthDate: utc(1988, 8, 8) });
    expect(r.numerology.a).toBe(5);
    expect(r.numerology.b).toBe(6);
    expect(r.numerology.relationshipNumber).toBe(2);
    expect(r.numerology.relationshipName).toEqual(RELATIONSHIP_NUMBERS[2].name);
    expect(r.numerology.summary).toEqual(RELATIONSHIP_NUMBERS[2].summary);
  });

  it("keeps a master life path but reduces it for the bond (11 + 5 = 16 → 7)", () => {
    const r = computeCompatibility({ birthDate: utc(1990, 7, 15) }, { birthDate: utc(1990, 1, 9) });
    expect(r.numerology.b).toBe(11);
    expect(r.numerology.relationshipNumber).toBe(7);
  });

  it("scores the same number and the same family 5, different families 3", () => {
    expect(getNumberPairing(1, 5)).toBe("family");
    expect(getNumberPairing(2, 8)).toBe("family");
    expect(getNumberPairing(11, 4)).toBe("family"); // 11 → 2
    expect(getNumberPairing(33, 9)).toBe("family"); // 33 → 6
    expect(getNumberPairing(6, 6)).toBe("same");
    expect(getNumberPairing(5, 6)).toBe("different");

    const same = computeCompatibility({ birthDate: utc(1988, 8, 8) }, { birthDate: utc(2000, 11, 11) });
    expect([same.numerology.a, same.numerology.b]).toEqual([6, 6]);
    expect(same.numerology.pairing).toBe("same");
    expect(same.numerology.score).toBe(5);

    const different = computeCompatibility({ birthDate: utc(1990, 7, 15) }, { birthDate: utc(1988, 8, 8) });
    expect(different.numerology.pairing).toBe("different");
    expect(different.numerology.score).toBe(3);
  });

  it("never scores the same life path below two of the same family", () => {
    // 1988-08-08 → 6 and 2000-11-11 → 6 (same number); then a real same-family partner for 6 (3 or 9)
    const same = computeCompatibility({ birthDate: utc(1988, 8, 8) }, { birthDate: utc(2000, 11, 11) });
    let family: ReturnType<typeof computeCompatibility> | null = null;
    for (let i = 0; i < 400 && !family; i++) {
      const r = computeCompatibility({ birthDate: utc(1988, 8, 8) }, { birthDate: addDays(utc(1980, 1, 1), i) });
      if (r.numerology.pairing === "family") family = r;
    }
    expect(family).not.toBeNull();
    expect(same.numerology.score).toBeGreaterThanOrEqual(family!.numerology.score);
  });

  it("without the partner's full name uses only the life paths", () => {
    const r = computeCompatibility(ME, { birthDate: utc(1988, 8, 8) });
    expect(r.numerology.names).toBeNull();
    expect(r.numerology.score).toBe(3);

    const blank = computeCompatibility(ME, { birthDate: utc(1988, 8, 8), fullName: "   " });
    expect(blank.numerology.names).toBeNull();
  });

  it("with both full names also compares the expression numbers", () => {
    // "John Smith" → 8 on both sides: same (5); life paths 5 and 6: different (3) → (5 + 3) / 2 → 4
    const r = computeCompatibility(ME, { birthDate: utc(1988, 8, 8), fullName: "John Smith" });
    expect(r.numerology.names).toEqual({ a: 8, b: 8, pairing: "same" });
    expect(r.numerology.score).toBe(4);
    // The bond number still comes from the life paths
    expect(r.numerology.relationshipNumber).toBe(2);
  });

  it("ignores a name that has no letters", () => {
    const r = computeCompatibility(ME, { birthDate: utc(1988, 8, 8), fullName: "李小龍" });
    expect(r.numerology.names).toBeNull();
  });

  it("every pair of life paths gives a bond number from 1 to 9", () => {
    const start = utc(1950, 1, 1);
    for (let i = 0; i < 400; i++) {
      const a = addDays(start, i * 37);
      const b = addDays(start, i * 53 + 11);
      const r = computeCompatibility({ birthDate: a }, { birthDate: b });
      expect(r.numerology.relationshipNumber).toBeGreaterThanOrEqual(1);
      expect(r.numerology.relationshipNumber).toBeLessThanOrEqual(9);
      expect(r.numerology.a).toBe(getLifePathNumber(a));
    }
  });
});

describe("computeCompatibility — tonalpohualli", () => {
  // 4 Nov 2026 is 13 Miquiztli, the last day of its trecena
  const base = utc(2026, 11, 4);

  it("the same day is the same tonalli (5)", () => {
    const r = computeCompatibility({ birthDate: base }, { birthDate: addDays(base, 260) });
    expect(r.tonalli.resonance).toBe("same-tonalli");
    expect(r.tonalli.sameSign).toBe(true);
    expect(r.tonalli.sameTrecena).toBe(true);
    expect(r.tonalli.score).toBe(5);
    expect(r.tonalli.a.label.es).toBe("13 Miquiztli · 13 Muerte");
  });

  it("20 days apart: same sign, different number (5)", () => {
    const r = computeCompatibility({ birthDate: base }, { birthDate: addDays(base, 20) });
    expect(r.tonalli.resonance).toBe("same-sign");
    expect(r.tonalli.sameTrecena).toBe(false);
    expect(r.tonalli.score).toBe(5);
  });

  it("consecutive days inside one trecena share it (5)", () => {
    const a = addDays(base, 1); // 1 Mázatl, first day of a trecena
    const b = addDays(base, 2);
    expect(getTonalli(a).number).toBe(1);
    const r = computeCompatibility({ birthDate: a }, { birthDate: b });
    expect(r.tonalli.resonance).toBe("same-trecena");
    expect(r.tonalli.sameSign).toBe(false);
    expect(r.tonalli.sameTrecena).toBe(true);
    expect(r.tonalli.score).toBe(5);
  });

  it("signs four apart in different trecenas share a direction (4)", () => {
    const r = computeCompatibility({ birthDate: base }, { birthDate: addDays(base, 4) });
    expect(r.tonalli.sameTrecena).toBe(false);
    expect(r.tonalli.sameDirection).toBe(true);
    expect(r.tonalli.a.direction).toEqual(r.tonalli.b.direction);
    expect(r.tonalli.resonance).toBe("same-direction");
    expect(r.tonalli.score).toBe(4);
  });

  it("otherwise the directions differ (3)", () => {
    const r = computeCompatibility({ birthDate: base }, { birthDate: addDays(base, 14) });
    expect(r.tonalli.resonance).toBe("different");
    expect(r.tonalli.score).toBe(3);
  });
});

describe("computeCompatibility — overall", () => {
  type Result = ReturnType<typeof computeCompatibility>;
  const sumOf = (r: Result) => r.western.score + r.chinese.score + r.numerology.score + r.tonalli.score;

  /** First real pair of birth dates whose four system scores all meet `wanted`. */
  function findPair(wanted: (r: Result) => boolean): Result | null {
    for (let i = 0; i < 40; i++) {
      const a = addDays(utc(1980, 1, 1), i * 97);
      for (let j = 0; j < 9000; j++) {
        const r = computeCompatibility({ birthDate: a }, { birthDate: addDays(utc(1960, 1, 1), j * 3) });
        if (wanted(r)) return r;
      }
    }
    return null;
  }

  it("derives the possible sums from the scales of each system", () => {
    expect(SYSTEM_SCORE_RANGES).toEqual({
      western: { min: 2, max: 5 },
      chinese: { min: 2, max: 5 },
      numerology: { min: 3, max: 5 },
      tonalli: { min: 3, max: 5 },
    });
    expect(OVERALL_SUM_RANGE).toEqual({ min: 10, max: 20 });
  });

  it("rescales the sum so 1 and 5 are both reachable", () => {
    const { min, max } = OVERALL_SUM_RANGE;
    expect(overallFromSum(min)).toBe(1);
    expect(overallFromSum(max)).toBe(5);
    let previous = 1;
    for (let sum = min; sum <= max; sum++) {
      const score = overallFromSum(sum);
      expect(score).toBeGreaterThanOrEqual(previous);
      expect(score).toBe(Math.round(1 + ((sum - min) * 4) / (max - min)));
      previous = score;
    }
  });

  it("gives 5 to the most affine pair and 1 to the least affine", () => {
    const R = SYSTEM_SCORE_RANGES;
    const best = findPair(
      (r) =>
        r.western.score === R.western.max &&
        r.chinese.score === R.chinese.max &&
        r.numerology.score === R.numerology.max &&
        r.tonalli.score === R.tonalli.max
    );
    const worst = findPair(
      (r) =>
        r.western.score === R.western.min &&
        r.chinese.score === R.chinese.min &&
        r.numerology.score === R.numerology.min &&
        r.tonalli.score === R.tonalli.min
    );
    expect(best).not.toBeNull();
    expect(worst).not.toBeNull();
    expect(best!.overall).toBe(5);
    expect(best!.overallLabel).toEqual(OVERALL_LABELS[5]);
    expect(worst!.overall).toBe(1);
    expect(worst!.overallLabel).toEqual(OVERALL_LABELS[1]);
  });

  it("is the rescaled sum of the four systems for any pair", () => {
    const pairs: [Date, Date][] = [
      [utc(1984, 6, 1), utc(1988, 6, 1)],
      [utc(1984, 6, 1), utc(1990, 6, 1)],
      [utc(1990, 7, 15), utc(1988, 8, 8)],
      [utc(1975, 12, 28), utc(1962, 8, 21)],
      [utc(2000, 2, 5), utc(2024, 2, 10)],
    ];
    for (const [a, b] of pairs) {
      const r = computeCompatibility({ birthDate: a }, { birthDate: b });
      expect(r.overall).toBe(overallFromSum(sumOf(r)));
      expect(r.overallLabel).toEqual(OVERALL_LABELS[r.overall]);
    }
  });

  it("does not depend on the hour of the UTC day", () => {
    const early = computeCompatibility({ birthDate: utc(1990, 7, 15, 0, 0) }, { birthDate: utc(1984, 2, 2, 0, 0) });
    const late = computeCompatibility({ birthDate: utc(1990, 7, 15, 23, 59) }, { birthDate: utc(1984, 2, 2, 23, 59) });
    expect(late).toEqual(early);
  });
});

describe("parseBirthDateInput", () => {
  const today = utc(2026, 11, 5);

  it("parses YYYY-MM-DD as midnight UTC", () => {
    const r = parseBirthDateInput("1990-07-15", today);
    expect(r).toEqual({ ok: true, date: utc(1990, 7, 15) });
    if (r.ok) expect(toIsoDay(r.date)).toBe("1990-07-15");
  });

  it("accepts today and rejects tomorrow", () => {
    expect(parseBirthDateInput("2026-11-05", today).ok).toBe(true);
    expect(parseBirthDateInput("2026-11-06", today)).toEqual({ ok: false, error: "future" });
  });

  it.each(["", "1990-7-15", "15/07/1990", "1990-13-01", "2023-02-29", "1990-02-30", "1990-07-15T00:00:00Z", "abc"])(
    "rejects %p",
    (value) => {
      expect(parseBirthDateInput(value, today)).toEqual({ ok: false, error: "invalid" });
    },
  );

  it("rejects non-strings and dates before 1900", () => {
    expect(parseBirthDateInput(19900715, today)).toEqual({ ok: false, error: "invalid" });
    expect(parseBirthDateInput(undefined, today)).toEqual({ ok: false, error: "invalid" });
    expect(parseBirthDateInput("1899-12-31", today)).toEqual({ ok: false, error: "too_old" });
    expect(parseBirthDateInput("2024-02-29", today).ok).toBe(true);
  });
});

describe("stored summary", () => {
  const cards: CompatibilityCard[] = CARD_ROLES.map((r, i) => ({
    position: i + 1,
    role: r.role,
    roleLabel: r.label,
    cardId: `card-${i}`,
    isReversed: i === 1,
    name: `Card ${i}`,
    nameEs: `Carta ${i}`,
    imageUrl: `/cards/${i}.jpg`,
    arcana: "MAJOR",
    suit: null,
    number: i,
  }));

  it("round-trips through JSON", () => {
    const systems = computeCompatibility(ME, { birthDate: utc(1988, 8, 8) });
    const summary = buildCompatibilitySummary(systems, cards);
    expect(summary.scores).toEqual({
      western: systems.western.score,
      chinese: systems.chinese.score,
      numerology: systems.numerology.score,
      tonalli: systems.tonalli.score,
      overall: systems.overall,
    });
    const parsed = parseCompatibilitySummary(JSON.parse(JSON.stringify(summary)));
    expect(parsed).toEqual(JSON.parse(JSON.stringify(summary)));
    expect(getStoredOverall(summary)).toBe(systems.overall);
  });

  it("rejects JSON with the wrong shape", () => {
    expect(parseCompatibilitySummary(null)).toBeNull();
    expect(parseCompatibilitySummary({})).toBeNull();
    expect(parseCompatibilitySummary({ version: 2 })).toBeNull();
    const systems = computeCompatibility(ME, { birthDate: utc(1988, 8, 8) });
    const summary = buildCompatibilitySummary(systems, cards);
    expect(parseCompatibilitySummary({ ...summary, scores: { ...summary.scores, overall: 7 } })).toBeNull();
    expect(parseCompatibilitySummary({ ...summary, cards: [{ cardId: 1 }] })).toBeNull();
    expect(getStoredOverall({ scores: { overall: "5" } })).toBeNull();
    expect(getStoredOverall("x")).toBeNull();
  });

  it("names the three card roles in both languages", () => {
    expect(CARD_ROLES.map((r) => r.role)).toEqual(["me", "partner", "bond"]);
    expect(CARD_ROLES.map((r) => r.label.es)).toEqual(["Tú", "La otra persona", "El vínculo"]);
    expect(CARD_ROLES.map((r) => r.label.en)).toEqual(["You", "The other person", "The bond"]);
  });
});

describe("toTextBlocks", () => {
  it("splits paragraphs and detects short section titles", () => {
    const text = [
      "Cómo se encuentran",
      "",
      "Ana y tú se encuentran en un lugar de calma. El Mago habla de tu iniciativa.",
      "## Qué se piden",
      "**Qué cuidar**",
      "1. Una pregunta para los dos:",
      "¿Qué necesita escuchar cada quien esta semana?",
    ].join("\n");
    expect(toTextBlocks(text)).toEqual([
      { type: "heading", text: "Cómo se encuentran" },
      { type: "paragraph", text: "Ana y tú se encuentran en un lugar de calma. El Mago habla de tu iniciativa." },
      { type: "heading", text: "Qué se piden" },
      { type: "heading", text: "Qué cuidar" },
      { type: "heading", text: "Una pregunta para los dos" },
      { type: "paragraph", text: "¿Qué necesita escuchar cada quien esta semana?" },
    ]);
  });

  it("never takes a short question, exclamation or quote for a title", () => {
    const lines = [
      "«¿Qué quieren cuidar juntos?»",
      "¿Qué quieren cuidar juntos?",
      "¡Qué buen equipo hacen",
      "“Lo que se nombra, se cuida”",
      '"Despacio."',
      "Dijo que sí (de verdad).",
      "What do you both want to protect?”",
    ];
    for (const line of lines) {
      expect(toTextBlocks(line)).toEqual([{ type: "paragraph", text: line }]);
    }
    // A plain short line or one ending in a colon is still a title
    expect(toTextBlocks("Qué cuidar:")).toEqual([{ type: "heading", text: "Qué cuidar" }]);
  });

  it("keeps long lines without final punctuation as paragraphs", () => {
    const long = "Una línea larga que no termina en punto pero claramente es un párrafo y no un título de sección";
    expect(toTextBlocks(long)).toEqual([{ type: "paragraph", text: long }]);
  });

  it("handles Windows line endings and empty text", () => {
    expect(toTextBlocks("Uno.\r\nDos.")).toHaveLength(2);
    expect(toTextBlocks("   \n\n")).toEqual([]);
  });
});

describe("bilingual content", () => {
  const all: [string, Bilingual][] = [
    ...Object.entries(RELATIONSHIP_NUMBERS).flatMap(([n, v]) => [
      [`relationship ${n} name`, v.name] as [string, Bilingual],
      [`relationship ${n} summary`, v.summary] as [string, Bilingual],
    ]),
    ...Object.entries(NUMBER_PAIRINGS).map(([k, v]) => [`pairing ${k}`, v] as [string, Bilingual]),
    ...Object.entries(TONALLI_RESONANCES).map(([k, v]) => [`tonalli ${k}`, v] as [string, Bilingual]),
    ...Object.entries(OVERALL_LABELS).map(([k, v]) => [`overall ${k}`, v] as [string, Bilingual]),
  ];

  it("covers the nine bond numbers and the five overall scores", () => {
    expect(Object.keys(RELATIONSHIP_NUMBERS)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
    expect(Object.keys(OVERALL_LABELS).sort()).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("has trimmed, single-line text in both languages", () => {
    for (const [path, text] of all) {
      for (const s of [text.en, text.es]) {
        expect({ path, ok: s.length > 0 && s === s.trim() && !s.includes("\n") && !/\s{2,}/.test(s) }).toEqual({
          path,
          ok: true,
        });
      }
    }
  });

  it("writes Spanish with accents and avoids clichés, predictions and fate", () => {
    const enBanned = /universe|cosmic|vibration|destined|soul ?mate|karma|will happen|forever/i;
    const esBanned = /universo|cósmic|vibraci|destinad|alma gemela|almas gemelas|karma|te pasará|para siempre/i;
    for (const [path, { en, es }] of all) {
      expect({ path, en, bad: enBanned.test(en) }).toEqual({ path, en, bad: false });
      expect({ path, es, bad: esBanned.test(es) }).toEqual({ path, es, bad: false });
      expect({ path, es, missingAccent: /cion\b|\bdia\b|\bdias\b|\b(tambien|despues|segun|asi|aqui)\b/i.test(es) }).toEqual({
        path,
        es,
        missingAccent: false,
      });
    }
  });

  it("frames the tonalpohualli as a living Mexica tradition", () => {
    expect(TONALLI_RESONANCES.different.es).toContain("En la tradición mexica");
    expect(TONALLI_RESONANCES.different.en).toContain("In the Mexica tradition");
  });
});

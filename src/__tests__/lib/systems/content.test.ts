/**
 * @jest-environment node
 *
 * Integrity of the bilingual content across every systems module.
 */
import {
  CHINESE_ANIMALS,
  CHINESE_ANIMAL_INFO,
  CHINESE_ELEMENT_INFO,
  DAY_SIGNS,
  LORDS_OF_THE_NIGHT,
  MAJOR_ARCANA,
  MOON_PHASES,
  TONALPOHUALLI_INTRO,
  TRECENAS,
  WESTERN_ELEMENT_NAMES,
  WESTERN_MODALITY_NAMES,
  WESTERN_SIGNS,
  WESTERN_SIGN_KEYS,
  getChineseCompatibility,
  getElementCompatibility,
  getNumberMeaning,
  type Bilingual,
  type CoreNumber,
  type WesternElement,
} from "@/lib/systems";

function isBilingual(x: unknown): x is Bilingual {
  return (
    typeof x === "object" &&
    x !== null &&
    Object.keys(x).sort().join() === "en,es" &&
    typeof (x as Bilingual).en === "string" &&
    typeof (x as Bilingual).es === "string"
  );
}

/** Every `{ en, es }` pair reachable from a value, with its path. */
function collect(value: unknown, path: string, out: [string, Bilingual][] = []): [string, Bilingual][] {
  if (isBilingual(value)) {
    out.push([path, value]);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => collect(v, `${path}[${i}]`, out));
  } else if (typeof value === "object" && value !== null) {
    for (const [k, v] of Object.entries(value)) collect(v, `${path}.${k}`, out);
  }
  return out;
}

const elements: WesternElement[] = ["Fire", "Earth", "Air", "Water"];
const coreNumbers: CoreNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33];

const ALL: [string, Bilingual][] = collect(
  {
    WESTERN_SIGNS,
    WESTERN_ELEMENT_NAMES,
    WESTERN_MODALITY_NAMES,
    elementCompatibility: elements.flatMap((a) => elements.map((b) => getElementCompatibility(a, b))),
    CHINESE_ANIMAL_INFO,
    CHINESE_ELEMENT_INFO,
    chineseCompatibility: CHINESE_ANIMALS.flatMap((a) => CHINESE_ANIMALS.map((b) => getChineseCompatibility(a, b))),
    DAY_SIGNS,
    TRECENAS,
    LORDS_OF_THE_NIGHT,
    TONALPOHUALLI_INTRO,
    numberMeanings: coreNumbers.map(getNumberMeaning),
    MAJOR_ARCANA,
    MOON_PHASES,
  },
  "systems",
);

describe("bilingual content", () => {
  it("finds a meaningful amount of content", () => {
    expect(ALL.length).toBeGreaterThan(400);
  });

  it("has non-empty, trimmed, single-line text in both languages", () => {
    for (const [path, text] of ALL) {
      for (const locale of ["en", "es"] as const) {
        const s = text[locale];
        expect({ path, locale, ok: s.length > 0 && s === s.trim() && !s.includes("\n") }).toEqual({
          path,
          locale,
          ok: true,
        });
        expect(s).not.toMatch(/undefined|null|NaN|TODO|\s{2,}/);
      }
    }
  });

  it("writes Spanish with accents (no unaccented -cion endings, México with accent)", () => {
    for (const [path, { es }] of ALL) {
      expect({ path, es, missingAccent: /cion\b|\bMexico\b|\bdia\b|\bdias\b/.test(es) }).toEqual({
        path,
        es,
        missingAccent: false,
      });
    }
  });

  it("avoids esoteric clichés, predictions and talking about the Mexica in the past tense", () => {
    const enBanned = /universe|cosmic|vibration|destined|will happen|aztecs believed/i;
    const esBanned = /universo|cósmic|vibraci|destinad|te pasará|aztecas creían/i;
    for (const [path, { en, es }] of ALL) {
      expect({ path, en, bad: enBanned.test(en) }).toEqual({ path, en, bad: false });
      expect({ path, es, bad: esBanned.test(es) }).toEqual({ path, es, bad: false });
    }
  });

  it("keeps descriptions to 2–3 sentences and traits to one line", () => {
    const sentences = (s: string) => s.split(/(?<=[.!?])\s+/).filter(Boolean).length;
    const descriptions = [
      ...WESTERN_SIGN_KEYS.map((k) => WESTERN_SIGNS[k].description),
      ...CHINESE_ANIMALS.map((a) => CHINESE_ANIMAL_INFO[a].description),
      ...coreNumbers.map((n) => getNumberMeaning(n).description),
    ];
    for (const d of descriptions) {
      for (const s of [d.en, d.es]) {
        expect(sentences(s)).toBeGreaterThanOrEqual(2);
        expect(sentences(s)).toBeLessThanOrEqual(3);
      }
    }
  });

  it("frames the tonalpohualli as a living Mexica tradition", () => {
    expect(TONALPOHUALLI_INTRO.es).toContain("En la tradición mexica");
    expect(TONALPOHUALLI_INTRO.es).toContain("calendario vivo");
    expect(TONALPOHUALLI_INTRO.en).toContain("In the Mexica tradition");
  });
});

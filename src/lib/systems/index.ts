/**
 * Arcana's wisdom systems: one entry point for the Arcana Blueprint
 * (/blueprint), the day energies (/calendar, daily card, email) and the
 * plain-text summaries that go into AI prompts.
 */
import { getBirthCards, MAJOR_ARCANA, type BirthCards } from "./birth-cards";
import { getChineseSign, type ChineseSign } from "./chinese-zodiac";
import { getMoonPhase, type MoonPhaseInfo } from "./moon";
import {
  getNumberMeaning,
  getNumerologyProfile,
  getPersonalDay,
  type NumerologyProfile,
  type PersonalNumber,
} from "./numerology";
import { todayUtc, utcParts } from "./shared";
import { getTonalli, type Tonalli } from "./tonalpohualli";
import type { Locale } from "./types";
import {
  getWesternSign,
  WESTERN_ELEMENT_NAMES,
  WESTERN_MODALITY_NAMES,
  type WesternSign,
} from "./western";

export * from "./types";
export * from "./western";
export * from "./chinese-zodiac";
export * from "./tonalpohualli";
export * from "./numerology";
export * from "./birth-cards";
export * from "./moon";
export { todayUtc } from "./shared";

export interface ArcanaBlueprint {
  western: WesternSign;
  chinese: ChineseSign;
  tonalli: Tonalli;
  numerology: NumerologyProfile;
  birthCards: BirthCards;
  moonAtBirth: MoonPhaseInfo;
  /** ISO date of birth, "YYYY-MM-DD" (UTC day). */
  birthDate: string;
  /** Name as given, trimmed, with inner whitespace collapsed. */
  fullName: string;
}

export interface DayEnergies {
  tonalli: Tonalli;
  moon: MoonPhaseInfo;
  /** 1–9, or null when there is no birth date. */
  personalDay: PersonalNumber | null;
}

/** Hard limit for `describeBlueprintForAI`. */
export const BLUEPRINT_DESCRIPTION_MAX = 900;

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

function isoDay(date: Date): string {
  const { year, month, day } = utcParts(date);
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/**
 * Every system for one person. `onDate` (default: today at 00:00 UTC) only
 * affects the personal year, month and day.
 */
export function getArcanaBlueprint(
  birthDate: Date,
  fullName: string,
  onDate: Date = todayUtc(),
): ArcanaBlueprint {
  return {
    western: getWesternSign(birthDate),
    chinese: getChineseSign(birthDate),
    tonalli: getTonalli(birthDate),
    numerology: getNumerologyProfile(birthDate, fullName, onDate),
    birthCards: getBirthCards(birthDate),
    moonAtBirth: getMoonPhase(birthDate),
    birthDate: isoDay(birthDate),
    fullName: fullName.trim().replace(/\s+/g, " "),
  };
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
/** Trims and makes sure the text ends with a period. */
const sentence = (s: string) => {
  const t = s.trim();
  return /[.!?…]$/.test(t) ? t : `${t}.`;
};

function cardName(index: number, locale: Locale): string {
  const card = MAJOR_ARCANA[index];
  return locale === "es" ? card.nameEs : card.name;
}

const BLUEPRINT_LABELS = {
  en: {
    title: "Arcana Blueprint",
    born: "born",
    western: "Western zodiac",
    ruler: "ruler:",
    chinese: "Chinese zodiac",
    tonalli: "Tonalpohualli (Mexica tradition)",
    trecena: "trecena",
    numerology: "Numerology",
    lifePath: "life path",
    expression: "expression",
    soulUrge: "soul urge",
    personality: "personality",
    birthday: "birthday",
    personalYear: "personal year",
    cards: "Tarot birth cards",
    cardPersonality: "personality",
    cardSoul: "soul",
    cardHidden: "hidden factor",
    moon: "Moon at birth",
  },
  es: {
    title: "Mapa Arcano",
    born: "nacimiento",
    western: "Zodiaco occidental",
    ruler: "regente:",
    chinese: "Zodiaco chino",
    tonalli: "Tonalpohualli (tradición mexica)",
    trecena: "trecena",
    numerology: "Numerología",
    lifePath: "camino de vida",
    expression: "expresión",
    soulUrge: "alma",
    personality: "personalidad",
    birthday: "cumpleaños",
    personalYear: "año personal",
    cards: "Cartas natales del tarot",
    cardPersonality: "personalidad",
    cardSoul: "alma",
    cardHidden: "factor oculto",
    moon: "Luna al nacer",
  },
} as const;

/**
 * Plain-text summary of a blueprint for AI prompts, at most 900 characters.
 * It does not include the person's name; pass it separately if needed.
 */
export function describeBlueprintForAI(bp: ArcanaBlueprint, locale: Locale): string {
  const L = BLUEPRINT_LABELS[locale];
  const { western, chinese, tonalli, numerology: n, birthCards, moonAtBirth } = bp;

  const lifePathName = getNumberMeaning(n.lifePath).name[locale];
  const numbers = [
    `${L.lifePath} ${n.lifePath} (${lowerFirst(lifePathName)})`,
    n.expression !== null ? `${L.expression} ${n.expression}` : null,
    n.soulUrge !== null ? `${L.soulUrge} ${n.soulUrge}` : null,
    n.personality !== null ? `${L.personality} ${n.personality}` : null,
    `${L.birthday} ${n.birthday}`,
    `${L.personalYear} ${n.personalYear}`,
  ].filter((x): x is string => x !== null);

  const cards = [
    `${L.cardPersonality} ${cardName(birthCards.personality, locale)}`,
    `${L.cardSoul} ${cardName(birthCards.soul, locale)}`,
    birthCards.hidden !== null ? `${L.cardHidden} ${cardName(birthCards.hidden, locale)}` : null,
  ].filter((x): x is string => x !== null);

  // [essential line, optional sentence dropped first if the text gets too long]
  const lines: [string, string][] = [
    [`${L.title} (${L.born} ${bp.birthDate})`, ""],
    [
      `- ${L.western}: ${western.name[locale]} (${lowerFirst(
        WESTERN_ELEMENT_NAMES[western.element][locale],
      )}, ${lowerFirst(WESTERN_MODALITY_NAMES[western.modality][locale])}; ${L.ruler} ${western.ruler[locale]})`,
      sentence(western.traits[locale]),
    ],
    [`- ${L.chinese}: ${chinese.label[locale]} (${chinese.polarity})`, sentence(chinese.traits[locale])],
    [
      `- ${L.tonalli}: ${tonalli.label[locale]}, ${L.trecena} ${tonalli.trecena.nahuatl}`,
      sentence(tonalli.sign.meaning[locale]),
    ],
    [`- ${L.numerology}: ${numbers.join(", ")}`, ""],
    [`- ${L.cards}: ${cards.join(", ")}`, ""],
    [`- ${L.moon}: ${moonAtBirth.name[locale]}`, ""],
  ];

  const full = lines.map(([line, detail]) => (detail ? `${line}. ${detail}` : `${line}.`)).join("\n");
  if (full.length <= BLUEPRINT_DESCRIPTION_MAX) return full;

  const compact = lines.map(([line]) => `${line}.`).join("\n");
  if (compact.length <= BLUEPRINT_DESCRIPTION_MAX) return compact;
  return `${compact.slice(0, BLUEPRINT_DESCRIPTION_MAX - 1)}…`;
}

/** Tonalli, moon phase and (with a birth date) personal day for a date. */
export function getDayEnergies(date: Date, birthDate?: Date | null): DayEnergies {
  return {
    tonalli: getTonalli(date),
    moon: getMoonPhase(date),
    personalDay: birthDate ? getPersonalDay(birthDate, date) : null,
  };
}

/** One to three plain-text lines for prompts and the daily email. */
export function describeDayEnergies(e: DayEnergies, locale: Locale): string {
  const pct = Math.round(e.moon.illumination * 100);
  const lines =
    locale === "es"
      ? [
          `Tonalli del día (tradición mexica): ${e.tonalli.label.es}, trecena ${
            e.tonalli.trecena.nahuatl
          }. ${sentence(e.tonalli.sign.meaning.es)}`,
          `Fase lunar: ${e.moon.name.es}, ${pct}% de iluminación. ${sentence(e.moon.guidance.es)}`,
        ]
      : [
          `Day sign (Mexica tonalpohualli): ${e.tonalli.label.en}, trecena ${
            e.tonalli.trecena.nahuatl
          }. ${sentence(e.tonalli.sign.meaning.en)}`,
          `Moon phase: ${e.moon.name.en}, ${pct}% illuminated. ${sentence(e.moon.guidance.en)}`,
        ];

  if (e.personalDay !== null) {
    const meaning = getNumberMeaning(e.personalDay);
    lines.push(
      locale === "es"
        ? `Día personal ${e.personalDay}: ${meaning.keywords.es}.`
        : `Personal day ${e.personalDay}: ${meaning.keywords.en}.`,
    );
  }
  return lines.join("\n");
}

/**
 * Tarot birth cards, after Mary K. Greer (*Who Are You in the Tarot?*).
 *
 * Add month + day + year as whole numbers (7 + 15 + 1990 = 2012), then add
 * the digits of the result (2 + 0 + 1 + 2 = 5), repeating while it is
 * above 22. That number is the personality card (22 is The Fool, 0).
 * Reducing it to one digit gives the soul card; when the reduction passes
 * through a two-digit step (19 → 10 → 1), that step is the hidden factor.
 */
import { digitSum, utcParts } from "./shared";
import type { Bilingual } from "./types";

export interface MajorArcanaInfo {
  /** 0–21, Rider–Waite order (Strength 8, Justice 11). */
  index: number;
  /** Same as `Card.name` in prisma/seed.ts. */
  name: string;
  /** Same as `Card.nameEs` in prisma/seed.ts. */
  nameEs: string;
  keywords: Bilingual;
}

export const MAJOR_ARCANA: readonly MajorArcanaInfo[] = [
  {
    name: "The Fool",
    nameEs: "El Loco",
    keywords: { en: "new beginnings, trust, spontaneity", es: "nuevos comienzos, confianza, espontaneidad" },
  },
  {
    name: "The Magician",
    nameEs: "El Mago",
    keywords: { en: "will, skill, making things real", es: "voluntad, habilidad, concreción" },
  },
  {
    name: "The High Priestess",
    nameEs: "La Sacerdotisa",
    keywords: { en: "intuition, mystery, inner knowing", es: "intuición, misterio, saber interior" },
  },
  {
    name: "The Empress",
    nameEs: "La Emperatriz",
    keywords: { en: "abundance, creativity, nurturing", es: "abundancia, creatividad, cuidado" },
  },
  {
    name: "The Emperor",
    nameEs: "El Emperador",
    keywords: { en: "structure, authority, protection", es: "estructura, autoridad, protección" },
  },
  {
    name: "The Hierophant",
    nameEs: "El Hierofante",
    keywords: { en: "tradition, learning, belonging", es: "tradición, aprendizaje, pertenencia" },
  },
  {
    name: "The Lovers",
    nameEs: "Los Enamorados",
    keywords: { en: "choice, union, values", es: "elección, unión, valores" },
  },
  {
    name: "The Chariot",
    nameEs: "El Carro",
    keywords: { en: "direction, willpower, progress", es: "dirección, voluntad, avance" },
  },
  {
    name: "Strength",
    nameEs: "La Fuerza",
    keywords: { en: "courage, gentleness, self-mastery", es: "valor, ternura, dominio de sí" },
  },
  {
    name: "The Hermit",
    nameEs: "El Ermitaño",
    keywords: { en: "introspection, guidance, chosen solitude", es: "introspección, guía, soledad elegida" },
  },
  {
    name: "Wheel of Fortune",
    nameEs: "La Rueda de la Fortuna",
    keywords: { en: "cycles, change, timing", es: "ciclos, cambio, momento oportuno" },
  },
  {
    name: "Justice",
    nameEs: "La Justicia",
    keywords: { en: "fairness, truth, balance", es: "equidad, verdad, equilibrio" },
  },
  {
    name: "The Hanged Man",
    nameEs: "El Colgado",
    keywords: { en: "pause, surrender, new perspective", es: "pausa, entrega, nueva perspectiva" },
  },
  {
    name: "Death",
    nameEs: "La Muerte",
    keywords: { en: "endings, transformation, release", es: "finales, transformación, soltar" },
  },
  {
    name: "Temperance",
    nameEs: "La Templanza",
    keywords: { en: "balance, patience, integration", es: "equilibrio, paciencia, integración" },
  },
  {
    name: "The Devil",
    nameEs: "El Diablo",
    keywords: { en: "attachment, desire, shadow", es: "apego, deseo, sombra" },
  },
  {
    name: "The Tower",
    nameEs: "La Torre",
    keywords: { en: "upheaval, revelation, liberation", es: "sacudida, revelación, liberación" },
  },
  {
    name: "The Star",
    nameEs: "La Estrella",
    keywords: { en: "hope, renewal, inspiration", es: "esperanza, renovación, inspiración" },
  },
  {
    name: "The Moon",
    nameEs: "La Luna",
    keywords: { en: "dreams, intuition, the unknown", es: "sueños, intuición, lo desconocido" },
  },
  {
    name: "The Sun",
    nameEs: "El Sol",
    keywords: { en: "joy, vitality, clarity", es: "alegría, vitalidad, claridad" },
  },
  {
    name: "Judgement",
    nameEs: "El Juicio",
    keywords: { en: "awakening, calling, inner renewal", es: "despertar, llamado, renovación interior" },
  },
  {
    name: "The World",
    nameEs: "El Mundo",
    keywords: { en: "completion, integration, wholeness", es: "culminación, integración, plenitud" },
  },
].map((card, index) => ({ index, ...card }));

export interface BirthCards {
  /** Major Arcana index 0–21 (22 → 0, The Fool). */
  personality: number;
  /** Major Arcana index 1–9. */
  soul: number;
  /** Two-digit step between personality and soul (only 19 → 10 → 1), else null. */
  hidden: number | null;
  /** month + day + year as whole numbers (e.g. 2012). */
  sum: number;
}

/** Digit sum of month + day + year, repeated while above 22. Returns 1–22. */
function greerNumber(month: number, day: number, year: number): number {
  let n = digitSum(month + day + year);
  while (n > 22) n = digitSum(n);
  return n;
}

/** Personality, soul and hidden-factor cards for a birth date (UTC day). */
export function getBirthCards(birthDate: Date): BirthCards {
  const { year, month, day } = utcParts(birthDate);
  const sum = month + day + year;
  const n = greerNumber(month, day, year);

  if (n <= 9) return { personality: n, soul: n, hidden: null, sum };

  let soul = digitSum(n);
  let hidden: number | null = null;
  if (soul > 9) {
    hidden = soul;
    soul = digitSum(soul);
  }
  return { personality: n === 22 ? 0 : n, soul, hidden, sum };
}

/** Year card: birth month + birth day + `year`, reduced the same way (22 → 0). */
export function getTarotYearCard(birthDate: Date, year: number): number {
  if (!Number.isInteger(year)) throw new RangeError("Invalid year");
  const { month, day } = utcParts(birthDate);
  const n = greerNumber(month, day, year);
  return n === 22 ? 0 : n;
}

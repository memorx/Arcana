/**
 * Pythagorean numerology.
 *
 * Dates: life path reduces month, day and year separately (keeping the
 * master numbers 11, 22 and 33), adds them and reduces again.
 * Names: A=1 … I=9, J=1 … R=9, S=1 … Z=8. Accents are removed (á→a, ñ→n,
 * ü→u) and anything that is not a letter is ignored. Each part of the name
 * (split on spaces and hyphens) is reduced on its own, then the parts are
 * added and reduced again, keeping master numbers.
 */
import { digitSum, todayUtc, utcParts } from "./shared";
import type { Bilingual } from "./types";

export type CoreNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 11 | 22 | 33;
export type PersonalNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

const MASTER_NUMBERS = [11, 22, 33];

/**
 * Adds the digits until one digit remains, or a master number (11, 22, 33)
 * when `keepMasters` is true (the default). Throws on 0 or negatives.
 */
export function reduceNumber(n: number, keepMasters = true): CoreNumber {
  if (!Number.isFinite(n) || Math.trunc(n) < 1) {
    throw new RangeError(`Cannot reduce ${n}`);
  }
  let x = Math.trunc(n);
  while (x > 9 && !(keepMasters && MASTER_NUMBERS.includes(x))) {
    x = digitSum(x);
  }
  return x as CoreNumber;
}

function reduceSingle(n: number): PersonalNumber {
  return reduceNumber(n, false) as PersonalNumber;
}

/** Life path: month, day and year reduced separately, then added and reduced. */
export function getLifePathNumber(birthDate: Date): CoreNumber {
  const { year, month, day } = utcParts(birthDate);
  return reduceNumber(reduceNumber(month) + reduceNumber(day) + reduceNumber(year));
}

/** Birthday number: the day of the month, reduced (11, 22 and 29→11 keep the master). */
export function getBirthdayNumber(birthDate: Date): CoreNumber {
  return reduceNumber(utcParts(birthDate).day);
}

/** Personal year (1–9): birth month + birth day + the calendar year of `onDate`. */
export function getPersonalYear(birthDate: Date, onDate: Date): PersonalNumber {
  const birth = utcParts(birthDate);
  const { year } = utcParts(onDate);
  return reduceSingle(reduceSingle(birth.month) + reduceSingle(birth.day) + reduceSingle(year));
}

/** Personal month (1–9): personal year + calendar month of `onDate`. */
export function getPersonalMonth(birthDate: Date, onDate: Date): PersonalNumber {
  const { month } = utcParts(onDate);
  return reduceSingle(getPersonalYear(birthDate, onDate) + month);
}

/** Personal day (1–9): personal month + calendar day of `onDate`. */
export function getPersonalDay(birthDate: Date, onDate: Date): PersonalNumber {
  const { day } = utcParts(onDate);
  return reduceSingle(getPersonalMonth(birthDate, onDate) + day);
}

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

const VOWELS = "aeiou";

/** Splits a name into lowercase a–z parts, without accents or symbols. */
export function normalizeName(fullName: string): string[] {
  return fullName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[\s\-‐-―_]+/)
    .map((part) => part.replace(/[^a-z]/g, ""))
    .filter(Boolean);
}

function letterValue(letter: string): number {
  return ((letter.charCodeAt(0) - 97) % 9) + 1;
}

/** "y" counts as a vowel when no other vowel is next to it (Lynn, Ruby; not Maya, Yolanda). */
function isVowelAt(letters: string, i: number): boolean {
  const c = letters[i];
  if (VOWELS.includes(c)) return true;
  if (c !== "y") return false;
  const prev = letters[i - 1];
  const next = letters[i + 1];
  return !(prev && VOWELS.includes(prev)) && !(next && VOWELS.includes(next));
}

type LetterFilter = "all" | "vowels" | "consonants";

function nameNumber(fullName: string, filter: LetterFilter): CoreNumber | null {
  let total = 0;
  for (const part of normalizeName(fullName)) {
    let sum = 0;
    for (let i = 0; i < part.length; i++) {
      const vowel = isVowelAt(part, i);
      if (filter === "all" || (filter === "vowels") === vowel) sum += letterValue(part[i]);
    }
    if (sum > 0) total += reduceNumber(sum);
  }
  return total > 0 ? reduceNumber(total) : null;
}

/** Expression (destiny) number: every letter of the full name. `null` if it has no letters. */
export function getExpressionNumber(fullName: string): CoreNumber | null {
  return nameNumber(fullName, "all");
}

/** Soul urge (heart's desire): the vowels. `null` if the name has no vowels. */
export function getSoulUrgeNumber(fullName: string): CoreNumber | null {
  return nameNumber(fullName, "vowels");
}

/** Personality number: the consonants. `null` if the name has no consonants. */
export function getPersonalityNumber(fullName: string): CoreNumber | null {
  return nameNumber(fullName, "consonants");
}

// ---------------------------------------------------------------------------
// Meanings
// ---------------------------------------------------------------------------

export interface NumberMeaning {
  number: CoreNumber;
  name: Bilingual;
  keywords: Bilingual;
  description: Bilingual;
  /** Major Arcana card associated with the number (22 → 0 The Fool, 33 → 6 The Lovers). */
  tarotArcana: number;
}

const MEANINGS: Record<CoreNumber, Omit<NumberMeaning, "number">> = {
  1: {
    name: { en: "The beginning", es: "El comienzo" },
    keywords: { en: "independence, initiative, leadership", es: "independencia, iniciativa, liderazgo" },
    description: {
      en: "One is the first step and the courage to take it alone. It speaks of someone who learns by doing and needs room to find their own way. Its challenge is asking for help without feeling smaller.",
      es: "El uno es el primer paso y el valor de darlo aunque sea en solitario. Habla de alguien que aprende haciendo y que necesita espacio para trazar su propio camino. Su reto es pedir ayuda sin sentirse menos.",
    },
    tarotArcana: 1,
  },
  2: {
    name: { en: "Partnership", es: "La alianza" },
    keywords: { en: "cooperation, sensitivity, diplomacy", es: "cooperación, sensibilidad, diplomacia" },
    description: {
      en: "Two listens, connects and senses what others feel. Its strength is patience and the gift of bringing people together. Its challenge is trusting its own voice as much as it values everyone else's.",
      es: "El dos escucha, une y percibe lo que otros sienten. Su fuerza está en la paciencia y en el don de acercar a las personas. Su reto es confiar en su propia voz tanto como valora la de los demás.",
    },
    tarotArcana: 2,
  },
  3: {
    name: { en: "Expression", es: "La expresión" },
    keywords: { en: "creativity, communication, joy", es: "creatividad, comunicación, alegría" },
    description: {
      en: "Three wants to express what it lives: in words, art, humor or play. It brings lightness and optimism wherever it goes. Its challenge is focusing its many talents on what truly matters to it.",
      es: "El tres quiere expresar lo que vive: con palabras, arte, humor o juego. Lleva ligereza y optimismo a donde va. Su reto es enfocar sus muchos talentos en lo que de verdad le importa.",
    },
    tarotArcana: 3,
  },
  4: {
    name: { en: "Foundation", es: "Los cimientos" },
    keywords: { en: "structure, effort, stability", es: "estructura, esfuerzo, estabilidad" },
    description: {
      en: "Four builds step by step and values what lasts. It is reliable, practical and patient with the process. Its challenge is allowing itself some flexibility when the plan changes.",
      es: "El cuatro construye paso a paso y valora lo que dura. Es confiable, práctico y paciente con el proceso. Su reto es permitirse flexibilidad cuando el plan cambia.",
    },
    tarotArcana: 4,
  },
  5: {
    name: { en: "Freedom", es: "La libertad" },
    keywords: { en: "change, curiosity, adventure", es: "cambio, curiosidad, aventura" },
    description: {
      en: "Five learns through experience and needs movement to feel alive. It adapts quickly and brings fresh air to any routine. Its challenge is finding a freedom that does not require running away.",
      es: "El cinco aprende de la experiencia y necesita movimiento para sentir la vida. Se adapta rápido y le da aire fresco a cualquier rutina. Su reto es encontrar una libertad que no implique huir.",
    },
    tarotArcana: 5,
  },
  6: {
    name: { en: "Care", es: "El cuidado" },
    keywords: { en: "responsibility, love, home", es: "responsabilidad, amor, hogar" },
    description: {
      en: "Six looks after people, homes and communities. It has a strong sense of responsibility and a big heart. Its challenge is caring without carrying everything alone.",
      es: "El seis cuida a las personas, los hogares y las comunidades. Tiene un fuerte sentido de responsabilidad y un gran corazón. Su reto es cuidar sin cargarlo todo en solitario.",
    },
    tarotArcana: 6,
  },
  7: {
    name: { en: "The inner search", es: "La búsqueda interior" },
    keywords: { en: "reflection, wisdom, intuition", es: "reflexión, sabiduría, intuición" },
    description: {
      en: "Seven asks the deep questions and needs silence to hear the answers. It trusts what it has examined for itself. Its challenge is opening its inner world to the people it trusts.",
      es: "El siete se hace las preguntas profundas y necesita silencio para escuchar las respuestas. Confía en lo que ha examinado por su cuenta. Su reto es abrir su mundo interior a las personas en quienes confía.",
    },
    tarotArcana: 7,
  },
  8: {
    name: { en: "Personal power", es: "El poder personal" },
    keywords: { en: "ambition, achievement, balance", es: "ambición, logro, equilibrio" },
    description: {
      en: "Eight knows how to turn effort into results and resources into opportunities. It has natural authority and a sense of the long game. Its challenge is balancing ambition with rest and generosity.",
      es: "El ocho sabe convertir el esfuerzo en resultados y los recursos en oportunidades. Tiene autoridad natural y visión de largo plazo. Su reto es equilibrar la ambición con el descanso y la generosidad.",
    },
    tarotArcana: 8,
  },
  9: {
    name: { en: "Completion", es: "La plenitud" },
    keywords: { en: "compassion, closure, generosity", es: "compasión, cierre de ciclos, generosidad" },
    description: {
      en: "Nine sees the whole picture and feels with others. It knows how to close cycles and let go with gratitude. Its challenge is giving itself what it so easily gives to the world.",
      es: "El nueve mira el panorama completo y siente con los demás. Sabe cerrar ciclos y soltar con gratitud. Su reto es darse lo que con tanta facilidad le da al mundo.",
    },
    tarotArcana: 9,
  },
  11: {
    name: { en: "Intuitive mastery", es: "La maestría intuitiva" },
    keywords: { en: "inspiration, sensitivity, vision", es: "inspiración, sensibilidad, visión" },
    description: {
      en: "Eleven is a master number: a heightened sensitivity that picks up what goes unsaid. It can inspire others through its intuition and its ideals. Its challenge is grounding that sensitivity so it does not overwhelm.",
      es: "El once es un número maestro: una sensibilidad aguda que percibe lo que no se dice. Puede inspirar a otros con su intuición y sus ideales. Su reto es aterrizar esa sensibilidad para que no lo desborde.",
    },
    tarotArcana: 11,
  },
  22: {
    name: { en: "The master builder", es: "La gran construcción" },
    keywords: { en: "vision made real, purpose, service", es: "visión hecha realidad, propósito, servicio" },
    description: {
      en: "Twenty-two is the master builder: wide visions with the practical sense to make them real. It thinks about what can serve many people. Its challenge is moving one step at a time without losing sight of the dream.",
      es: "El veintidós es el gran constructor: visiones amplias con el sentido práctico para volverlas reales. Piensa en lo que puede servir a muchas personas. Su reto es avanzar paso a paso sin perder de vista el sueño.",
    },
    tarotArcana: 0,
  },
  33: {
    name: { en: "Compassionate mastery", es: "La maestría compasiva" },
    keywords: { en: "compassion, guidance, healing", es: "compasión, guía, sanación" },
    description: {
      en: "Thirty-three is the master of compassion: care that turns into guidance and teaching. It tends to show up as deep empathy and a calling to help. Its challenge is setting gentle limits so its care can last.",
      es: "El treinta y tres es el maestro de la compasión: un cuidado que se vuelve guía y enseñanza. Suele aparecer como una empatía profunda y una vocación de ayudar. Su reto es poner límites amables para que su cuidado pueda durar.",
    },
    tarotArcana: 6,
  },
};

export function getNumberMeaning(n: CoreNumber): NumberMeaning {
  const meaning = MEANINGS[n];
  if (!meaning) throw new RangeError(`Not a core number: ${n}`);
  return { number: n, ...meaning };
}

export interface NumerologyProfile {
  lifePath: CoreNumber;
  birthday: CoreNumber;
  /** `null` when the name has no letters of that kind. */
  expression: CoreNumber | null;
  soulUrge: CoreNumber | null;
  personality: CoreNumber | null;
  personalYear: PersonalNumber;
  personalMonth: PersonalNumber;
  personalDay: PersonalNumber;
}

/** Every number at once. `onDate` defaults to today (00:00 UTC). */
export function getNumerologyProfile(
  birthDate: Date,
  fullName: string,
  onDate: Date = todayUtc(),
): NumerologyProfile {
  return {
    lifePath: getLifePathNumber(birthDate),
    birthday: getBirthdayNumber(birthDate),
    expression: getExpressionNumber(fullName),
    soulUrge: getSoulUrgeNumber(fullName),
    personality: getPersonalityNumber(fullName),
    personalYear: getPersonalYear(birthDate, onDate),
    personalMonth: getPersonalMonth(birthDate, onDate),
    personalDay: getPersonalDay(birthDate, onDate),
  };
}

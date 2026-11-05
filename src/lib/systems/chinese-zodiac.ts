/**
 * Chinese zodiac: 12 animals × 5 elements (60-year cycle).
 *
 * The animal changes on the Lunar New Year, not on January 1st: a birth
 * date before that year's New Year belongs to the previous year's animal.
 */
import { mod, utcParts } from "./shared";
import type { Bilingual } from "./types";

export type ChineseAnimal =
  | "Rat"
  | "Ox"
  | "Tiger"
  | "Rabbit"
  | "Dragon"
  | "Snake"
  | "Horse"
  | "Goat"
  | "Monkey"
  | "Rooster"
  | "Dog"
  | "Pig";
export type ChineseElement = "Wood" | "Fire" | "Earth" | "Metal" | "Water";

export interface ChineseSign {
  animal: ChineseAnimal;
  element: ChineseElement;
  polarity: "Yin" | "Yang";
  /** Lunar year the sign belongs to (e.g. 1989 for 1990-01-15). */
  year: number;
  animalName: Bilingual;
  elementName: Bilingual;
  /** "Wood Dragon" / "Dragón de Madera" */
  label: Bilingual;
  emoji: string;
  traits: Bilingual;
  description: Bilingual;
  /** The other two animals of its trine (allies). */
  trine: ChineseAnimal[];
  secretFriend: ChineseAnimal;
  clash: ChineseAnimal;
}

/**
 * Lunar New Year (Spring Festival) dates, 1924–2043, as "MM-DD" in China
 * Standard Time (UTC+8).
 *
 * Source: the standard Chinese calendar (rules of GB/T 33661-2017; the
 * same dates appear in the Hong Kong Observatory's Gregorian–Lunar
 * conversion tables). Cross-checked while writing this module against
 * astronomical new moons (Meeus, *Astronomical Algorithms*, ch. 49) in
 * UTC+8: every entry is a new-moon day. In 1966, 1985, 2004, 2023 and
 * 2042 two new moons fall between Jan 21 and Feb 20; the table follows
 * the official calendar (e.g. 1985 starts on Feb 20, after a leap month).
 */
export const LUNAR_NEW_YEAR: Readonly<Record<number, string>> = {
  1924: "02-05", 1925: "01-24", 1926: "02-13", 1927: "02-02", 1928: "01-23",
  1929: "02-10", 1930: "01-30", 1931: "02-17", 1932: "02-06", 1933: "01-26",
  1934: "02-14", 1935: "02-04", 1936: "01-24", 1937: "02-11", 1938: "01-31",
  1939: "02-19", 1940: "02-08", 1941: "01-27", 1942: "02-15", 1943: "02-05",
  1944: "01-25", 1945: "02-13", 1946: "02-02", 1947: "01-22", 1948: "02-10",
  1949: "01-29", 1950: "02-17", 1951: "02-06", 1952: "01-27", 1953: "02-14",
  1954: "02-03", 1955: "01-24", 1956: "02-12", 1957: "01-31", 1958: "02-18",
  1959: "02-08", 1960: "01-28", 1961: "02-15", 1962: "02-05", 1963: "01-25",
  1964: "02-13", 1965: "02-02", 1966: "01-21", 1967: "02-09", 1968: "01-30",
  1969: "02-17", 1970: "02-06", 1971: "01-27", 1972: "02-15", 1973: "02-03",
  1974: "01-23", 1975: "02-11", 1976: "01-31", 1977: "02-18", 1978: "02-07",
  1979: "01-28", 1980: "02-16", 1981: "02-05", 1982: "01-25", 1983: "02-13",
  1984: "02-02", 1985: "02-20", 1986: "02-09", 1987: "01-29", 1988: "02-17",
  1989: "02-06", 1990: "01-27", 1991: "02-15", 1992: "02-04", 1993: "01-23",
  1994: "02-10", 1995: "01-31", 1996: "02-19", 1997: "02-07", 1998: "01-28",
  1999: "02-16", 2000: "02-05", 2001: "01-24", 2002: "02-12", 2003: "02-01",
  2004: "01-22", 2005: "02-09", 2006: "01-29", 2007: "02-18", 2008: "02-07",
  2009: "01-26", 2010: "02-14", 2011: "02-03", 2012: "01-23", 2013: "02-10",
  2014: "01-31", 2015: "02-19", 2016: "02-08", 2017: "01-28", 2018: "02-16",
  2019: "02-05", 2020: "01-25", 2021: "02-12", 2022: "02-01", 2023: "01-22",
  2024: "02-10", 2025: "01-29", 2026: "02-17", 2027: "02-06", 2028: "01-26",
  2029: "02-13", 2030: "02-03", 2031: "01-23", 2032: "02-11", 2033: "01-31",
  2034: "02-19", 2035: "02-08", 2036: "01-28", 2037: "02-15", 2038: "02-04",
  2039: "01-24", 2040: "02-12", 2041: "02-01", 2042: "01-22", 2043: "02-10",
};

/**
 * APPROXIMATION. Outside 1924–2043 there is no table: we use February 4th
 * (Lichun, the start of spring), the boundary many Chinese almanacs use for
 * the zodiac year. Births close to the real New Year of those years can land
 * on the wrong animal. Do not extend the table without a verified source.
 */
const FALLBACK_NEW_YEAR = "02-04";

export const CHINESE_ANIMALS: readonly ChineseAnimal[] = [
  "Rat",
  "Ox",
  "Tiger",
  "Rabbit",
  "Dragon",
  "Snake",
  "Horse",
  "Goat",
  "Monkey",
  "Rooster",
  "Dog",
  "Pig",
];

interface AnimalInfo {
  name: Bilingual;
  emoji: string;
  traits: Bilingual;
  description: Bilingual;
}

export const CHINESE_ANIMAL_INFO: Record<ChineseAnimal, AnimalInfo> = {
  Rat: {
    name: { en: "Rat", es: "Rata" },
    emoji: "🐀",
    traits: { en: "Sharpness, resourcefulness, charm.", es: "Agudeza, inventiva, encanto." },
    description: {
      en: "The Rat sees opportunities others miss and knows how to make a lot out of a little. Quick and sociable, it looks after the people it loves with real attention. Its growth lies in trusting that there will be enough.",
      es: "La Rata ve oportunidades que otros no ven y sabe hacer mucho con poco. Rápida y sociable, cuida con atención a quienes quiere. Su crecimiento está en confiar en que habrá suficiente.",
    },
  },
  Ox: {
    name: { en: "Ox", es: "Buey" },
    emoji: "🐂",
    traits: { en: "Perseverance, reliability, calm.", es: "Perseverancia, confiabilidad, calma." },
    description: {
      en: "The Ox moves at its own pace and gets there. Others lean on its honesty and on its way of carrying a task to the end. The invitation for it is to make room for change without feeling it is losing ground.",
      es: "El Buey avanza a su ritmo y llega. Otros se apoyan en su honestidad y en su manera de llevar una tarea hasta el final. Lo que le toca es abrirle espacio al cambio sin sentir que pierde terreno.",
    },
  },
  Tiger: {
    name: { en: "Tiger", es: "Tigre" },
    emoji: "🐅",
    traits: { en: "Courage, passion, independence.", es: "Valor, pasión, independencia." },
    description: {
      en: "The Tiger acts from conviction and stands up for what it believes is fair. Its energy is magnetic and its heart, generous. It grows by learning that patience can also be a form of strength.",
      es: "El Tigre actúa desde la convicción y defiende lo que considera justo. Su energía es magnética y su corazón, generoso. Crece al aprender que la paciencia también puede ser una forma de fuerza.",
    },
  },
  Rabbit: {
    name: { en: "Rabbit", es: "Conejo" },
    emoji: "🐇",
    traits: { en: "Gentleness, diplomacy, good taste.", es: "Gentileza, diplomacia, buen gusto." },
    description: {
      en: "The Rabbit creates calm around it and has a fine sense of beauty and timing. It reads people well and avoids needless conflict. It grows when it says what it needs, even if that stirs the calm.",
      es: "El Conejo crea calma a su alrededor y tiene un fino sentido de la belleza y de la oportunidad. Lee bien a las personas y evita los conflictos innecesarios. Crece cuando dice lo que necesita, aunque eso altere la calma.",
    },
  },
  Dragon: {
    name: { en: "Dragon", es: "Dragón" },
    emoji: "🐉",
    traits: { en: "Vitality, vision, confidence.", es: "Vitalidad, visión, confianza." },
    description: {
      en: "The Dragon arrives with presence and big ideas. It inspires others with its enthusiasm and its certainty that things can be done. It grows when it listens as much as it leads.",
      es: "El Dragón llega con presencia y con ideas grandes. Inspira a otros con su entusiasmo y con la certeza de que las cosas se pueden hacer. Crece cuando escucha tanto como guía.",
    },
  },
  Snake: {
    name: { en: "Snake", es: "Serpiente" },
    emoji: "🐍",
    traits: { en: "Insight, elegance, discretion.", es: "Intuición, elegancia, discreción." },
    description: {
      en: "The Snake observes before it moves and understands more than it says. It values depth, beauty and well-chosen words. The invitation for it is to share what it knows before it feels completely sure.",
      es: "La Serpiente observa antes de moverse y entiende más de lo que dice. Valora la profundidad, la belleza y las palabras bien elegidas. Lo que le toca es compartir lo que sabe antes de sentirse del todo segura.",
    },
  },
  Horse: {
    name: { en: "Horse", es: "Caballo" },
    emoji: "🐎",
    traits: { en: "Freedom, energy, frankness.", es: "Libertad, energía, franqueza." },
    description: {
      en: "The Horse needs open space and moves with contagious enthusiasm. It is sincere, warm and quick to help. It grows when it stays long enough to see what it started bloom.",
      es: "El Caballo necesita espacio abierto y avanza con un entusiasmo contagioso. Es sincero, cálido y siempre dispuesto a ayudar. Crece cuando se queda el tiempo suficiente para ver florecer lo que empezó.",
    },
  },
  Goat: {
    name: { en: "Goat", es: "Cabra" },
    emoji: "🐐",
    traits: { en: "Sensitivity, creativity, kindness.", es: "Sensibilidad, creatividad, bondad." },
    description: {
      en: "The Goat lives close to its feelings and turns them into art, care and beauty. It is gentle with others and looks for harmony around it. Its growth lies in trusting its own judgment as much as it trusts others.",
      es: "La Cabra vive cerca de sus emociones y las convierte en arte, cuidado y belleza. Es amable con los demás y busca armonía en su entorno. Su crecimiento está en confiar en su propio criterio tanto como confía en otros.",
    },
  },
  Monkey: {
    name: { en: "Monkey", es: "Mono" },
    emoji: "🐒",
    traits: { en: "Ingenuity, humor, adaptability.", es: "Ingenio, humor, adaptabilidad." },
    description: {
      en: "The Monkey solves problems with creativity and a good sense of humor. It learns fast and enjoys a challenge. It grows when it puts its talent at the service of something that lasts.",
      es: "El Mono resuelve problemas con creatividad y buen humor. Aprende rápido y disfruta los retos. Crece cuando pone su talento al servicio de algo que dure.",
    },
  },
  Rooster: {
    name: { en: "Rooster", es: "Gallo" },
    emoji: "🐓",
    traits: { en: "Honesty, diligence, observation.", es: "Honestidad, diligencia, observación." },
    description: {
      en: "The Rooster sees clearly and says what it sees. It is organized, hardworking and proud of a job well done. The invitation for it is to be as gentle with mistakes, its own and others', as it is demanding of quality.",
      es: "El Gallo ve con claridad y dice lo que ve. Es organizado, trabajador y se enorgullece del trabajo bien hecho. Lo que le toca es ser tan amable con los errores, propios y ajenos, como exigente con la calidad.",
    },
  },
  Dog: {
    name: { en: "Dog", es: "Perro" },
    emoji: "🐕",
    traits: { en: "Loyalty, fairness, protection.", es: "Lealtad, sentido de justicia, protección." },
    description: {
      en: "The Dog stands by its people and by what is right. It is honest, attentive and quick to defend whoever needs it. It grows when it lets go of worries that are not its to carry.",
      es: "El Perro está con los suyos y del lado de lo justo. Es honesto, atento y siempre dispuesto a defender a quien lo necesite. Crece cuando suelta las preocupaciones que no le toca cargar.",
    },
  },
  Pig: {
    name: { en: "Pig", es: "Cerdo" },
    emoji: "🐖",
    traits: { en: "Generosity, sincerity, enjoyment.", es: "Generosidad, sinceridad, gozo." },
    description: {
      en: "The Pig enjoys life and shares it openly. It is kind, trusting and generous with its time. Its growth lies in protecting its good heart without closing it.",
      es: "El Cerdo disfruta la vida y la comparte sin reservas. Es amable, confiado y generoso con su tiempo. Su crecimiento está en proteger su buen corazón sin cerrarlo.",
    },
  },
};

export const CHINESE_ELEMENT_INFO: Record<ChineseElement, { name: Bilingual; traits: Bilingual }> = {
  Wood: {
    name: { en: "Wood", es: "Madera" },
    traits: { en: "Growth, generosity, cooperation.", es: "Crecimiento, generosidad, cooperación." },
  },
  Fire: {
    name: { en: "Fire", es: "Fuego" },
    traits: { en: "Passion, warmth, expression.", es: "Pasión, calidez, expresión." },
  },
  Earth: {
    name: { en: "Earth", es: "Tierra" },
    traits: { en: "Stability, practicality, care.", es: "Estabilidad, sentido práctico, cuidado." },
  },
  Metal: {
    name: { en: "Metal", es: "Metal" },
    traits: { en: "Determination, clarity, integrity.", es: "Determinación, claridad, integridad." },
  },
  Water: {
    name: { en: "Water", es: "Agua" },
    traits: { en: "Intuition, flexibility, depth.", es: "Intuición, flexibilidad, profundidad." },
  },
};

const ELEMENT_ORDER: readonly ChineseElement[] = ["Wood", "Fire", "Earth", "Metal", "Water"];

/** Trines (三合): animals that share goals and pace. */
const TRINES: readonly ChineseAnimal[][] = [
  ["Rat", "Dragon", "Monkey"],
  ["Ox", "Snake", "Rooster"],
  ["Tiger", "Horse", "Dog"],
  ["Rabbit", "Goat", "Pig"],
];

/** Secret friends (六合, the six harmonies). */
const SECRET_FRIENDS: Record<ChineseAnimal, ChineseAnimal> = {
  Rat: "Ox",
  Ox: "Rat",
  Tiger: "Pig",
  Pig: "Tiger",
  Rabbit: "Dog",
  Dog: "Rabbit",
  Dragon: "Rooster",
  Rooster: "Dragon",
  Snake: "Monkey",
  Monkey: "Snake",
  Horse: "Goat",
  Goat: "Horse",
};

/** Lunar New Year of a Gregorian year as a UTC timestamp at 00:00 of that day. */
function lunarNewYearUtc(year: number): number {
  const mmdd = LUNAR_NEW_YEAR[year] ?? FALLBACK_NEW_YEAR;
  const [month, day] = mmdd.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

/** Lunar year (the year whose New Year has already happened) for a date. */
function lunarYearOf(date: Date): number {
  const { year, month, day } = utcParts(date);
  return Date.UTC(year, month - 1, day) < lunarNewYearUtc(year) ? year - 1 : year;
}

/** Sign of a lunar year: 1924 = Wood Rat (Yang), the start of a 60-year cycle. */
export function getChineseYearSign(year: number): ChineseSign {
  if (!Number.isInteger(year)) throw new RangeError("Invalid year");
  const offset = year - 1924;
  const animal = CHINESE_ANIMALS[mod(offset, 12)];
  const element = ELEMENT_ORDER[Math.floor(mod(offset, 10) / 2)];
  const polarity = mod(year, 2) === 0 ? "Yang" : "Yin";
  const info = CHINESE_ANIMAL_INFO[animal];
  const elementName = CHINESE_ELEMENT_INFO[element].name;
  const trine = TRINES.find((group) => group.includes(animal))!.filter((a) => a !== animal);

  return {
    animal,
    element,
    polarity,
    year,
    animalName: info.name,
    elementName,
    label: {
      en: `${elementName.en} ${info.name.en}`,
      es: `${info.name.es} de ${elementName.es}`,
    },
    emoji: info.emoji,
    traits: info.traits,
    description: info.description,
    trine,
    secretFriend: SECRET_FRIENDS[animal],
    clash: CHINESE_ANIMALS[mod(CHINESE_ANIMALS.indexOf(animal) + 6, 12)],
  };
}

/** Sign for a birth date, using the Lunar New Year as the boundary. */
export function getChineseSign(birthDate: Date): ChineseSign {
  return getChineseYearSign(lunarYearOf(birthDate));
}

export type ChineseRelation = "same" | "trine" | "secret-friend" | "clash" | "neutral";

const RELATIONS: Record<ChineseRelation, { score: 1 | 2 | 3 | 4 | 5; summary: Bilingual }> = {
  same: {
    score: 4,
    summary: {
      en: "Same animal: you recognize each other's ways at once. The challenge is not to reinforce the same blind spots.",
      es: "Mismo animal: reconocen al instante la forma de ser del otro. El reto es no reforzar los mismos puntos ciegos.",
    },
  },
  trine: {
    score: 5,
    summary: {
      en: "Trine: you belong to the same group of allies and tend to want similar things from life.",
      es: "Trino: pertenecen al mismo grupo de aliados y suelen querer cosas parecidas de la vida.",
    },
  },
  "secret-friend": {
    score: 5,
    summary: {
      en: "Secret friends: a quiet, deep affinity in which each one brings what the other lacks.",
      es: "Amigos secretos: una afinidad silenciosa y profunda en la que cada uno aporta lo que al otro le falta.",
    },
  },
  clash: {
    score: 2,
    summary: {
      en: "Opposite signs: your rhythms differ, so the bond grows through clear agreements and patience.",
      es: "Signos opuestos: sus ritmos son distintos, así que el vínculo crece con acuerdos claros y paciencia.",
    },
  },
  neutral: {
    score: 3,
    summary: {
      en: "A neutral pairing: what you build depends more on attention and shared intentions than on the signs.",
      es: "Una combinación neutral: lo que construyan depende más de la atención y de las intenciones compartidas que de los signos.",
    },
  },
};

/** Relationship between two animals: same, trine, secret friend, clash or neutral. */
export function getChineseCompatibility(
  a: ChineseAnimal,
  b: ChineseAnimal,
): { score: 1 | 2 | 3 | 4 | 5; relation: ChineseRelation; summary: Bilingual } {
  let relation: ChineseRelation = "neutral";
  if (a === b) relation = "same";
  else if (TRINES.some((group) => group.includes(a) && group.includes(b))) relation = "trine";
  else if (SECRET_FRIENDS[a] === b) relation = "secret-friend";
  else if (mod(CHINESE_ANIMALS.indexOf(a) - CHINESE_ANIMALS.indexOf(b), 12) === 6) relation = "clash";
  return { relation, ...RELATIONS[relation] };
}

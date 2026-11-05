/**
 * Tonalpohualli: the Mexica sacred count of 260 days (20 day signs × 13 numbers).
 *
 * Correlation: Alfonso Caso's, which matches the GMT constant 584283 used
 * for the Maya Tzolk'in. With d = JDN − 584283:
 *   number    = ((d + 3) mod 13) + 1
 *   signIndex = (d + 19) mod 20      (0 = Cipactli … 19 = Xóchitl)
 * Check: 13 August 1521 (Julian), the fall of Tenochtitlan, is 1 Cóatl.
 *
 * The tonalpohualli is a living calendar, still kept by communities,
 * daykeepers and danzantes in Mexico. The texts below describe what each
 * sign means in that tradition; they are not predictions.
 */
import { mod, utcParts } from "./shared";
import type { Bilingual } from "./types";

export interface DaySign {
  /** 0–19, same order as the Maya days Imix…Ahau */
  index: number;
  nahuatl: string;
  name: Bilingual;
  glyph: string;
  direction: Bilingual;
  patron: string;
  meaning: Bilingual;
  traits: Bilingual;
}

export interface Trecena {
  /**
   * 0–19. The 260-day count has twenty trecenas of 13 days; each one is
   * named after its first day ("Ce Cipactli", "Ce Océlotl"…).
   */
  index: number;
  nahuatl: string;
  name: Bilingual;
  patron: string;
  meaning: Bilingual;
}

export interface LordOfNight {
  /** 0–8 */
  index: number;
  nahuatl: string;
  meaning: Bilingual;
}

export interface Tonalli {
  /** 1–13 */
  number: number;
  sign: DaySign;
  trecena: Trecena;
  lordOfNight: LordOfNight;
  /** 0–259; 0 = 1 Cipactli */
  cycleDay: number;
  /** "13 Miquiztli · 13 Muerte" */
  label: Bilingual;
}

/** Caso / GMT correlation constant. */
export const TONALPOHUALLI_CORRELATION = 584283;

export const TONALPOHUALLI_INTRO: Bilingual = {
  en: "In the Mexica tradition, the tonalpohualli, the count of days, weaves 20 day signs and 13 numbers into a cycle of 260 days. Your tonalli is the sign of the day you were born: a way of naming the character you arrived with. It is a living calendar, still kept by communities and daykeepers in Mexico.",
  es: "En la tradición mexica, el tonalpohualli, la cuenta de los días, entrelaza 20 signos y 13 números en un ciclo de 260 días. Tu tonalli es el signo del día en que naciste: una manera de nombrar el carácter con el que llegaste. Es un calendario vivo que todavía guardan comunidades y contadores del tiempo en México.",
};

const EAST: Bilingual = { en: "East", es: "Oriente" };
const NORTH: Bilingual = { en: "North", es: "Norte" };
const WEST: Bilingual = { en: "West", es: "Poniente" };
const SOUTH: Bilingual = { en: "South", es: "Sur" };
const DIRECTIONS = [EAST, NORTH, WEST, SOUTH];

type DaySignData = Omit<DaySign, "index" | "direction">;

const DAY_SIGN_DATA: DaySignData[] = [
  {
    nahuatl: "Cipactli",
    name: { en: "Crocodile", es: "Cocodrilo" },
    glyph: "🐊",
    patron: "Tonacatecuhtli",
    meaning: {
      en: "The primordial earth from which the world was made: origin, beginnings and the impulse to start.",
      es: "La tierra primordial de la que se hizo el mundo: el origen, los comienzos y el impulso de empezar.",
    },
    traits: { en: "Initiative, nourishment, pioneering spirit.", es: "Iniciativa, sustento, espíritu pionero." },
  },
  {
    nahuatl: "Ehécatl",
    name: { en: "Wind", es: "Viento" },
    glyph: "🌬️",
    patron: "Quetzalcóatl",
    meaning: {
      en: "The breath of life that sweeps the path for the rain: movement, communication and change.",
      es: "El aliento de vida que barre el camino de la lluvia: el movimiento, la comunicación y el cambio.",
    },
    traits: { en: "Expression, adaptability, ideas.", es: "Expresión, adaptabilidad, ideas." },
  },
  {
    nahuatl: "Calli",
    name: { en: "House", es: "Casa" },
    glyph: "🏠",
    patron: "Tepeyóllotl",
    meaning: {
      en: "Shelter and the inner space: rest, family and looking inward.",
      es: "El refugio y el espacio interior: el descanso, la familia y la mirada hacia dentro.",
    },
    traits: { en: "Protection, belonging, reflection.", es: "Protección, pertenencia, reflexión." },
  },
  {
    nahuatl: "Cuetzpalin",
    name: { en: "Lizard", es: "Lagartija" },
    glyph: "🦎",
    patron: "Huehuecóyotl",
    meaning: {
      en: "Vitality and resilience: the ability to recover, adapt and keep going.",
      es: "La vitalidad y la resiliencia: la capacidad de recuperarse, adaptarse y seguir.",
    },
    traits: { en: "Resilience, agility, playfulness.", es: "Resiliencia, agilidad, sentido del juego." },
  },
  {
    nahuatl: "Cóatl",
    name: { en: "Serpent", es: "Serpiente" },
    glyph: "🐍",
    patron: "Chalchiuhtlicue",
    meaning: {
      en: "The life force that moves close to the earth: wisdom, renewal and fertility.",
      es: "La fuerza vital que se mueve pegada a la tierra: la sabiduría, la renovación y la fertilidad.",
    },
    traits: { en: "Intuition, renewal, depth.", es: "Intuición, renovación, profundidad." },
  },
  {
    nahuatl: "Miquiztli",
    name: { en: "Death", es: "Muerte" },
    glyph: "💀",
    patron: "Tecciztécatl",
    meaning: {
      en: "Transformation and the ancestors: endings that make room for what is coming.",
      es: "La transformación y los ancestros: los finales que abren espacio a lo que viene.",
    },
    traits: { en: "Transformation, humility, memory.", es: "Transformación, humildad, memoria." },
  },
  {
    nahuatl: "Mázatl",
    name: { en: "Deer", es: "Venado" },
    glyph: "🦌",
    patron: "Tláloc",
    meaning: {
      en: "Gentleness and sensitivity: harmony with the land and with others.",
      es: "La gentileza y la sensibilidad: la armonía con la tierra y con los demás.",
    },
    traits: { en: "Sensitivity, grace, alertness.", es: "Sensibilidad, gracia, atención." },
  },
  {
    nahuatl: "Tochtli",
    name: { en: "Rabbit", es: "Conejo" },
    glyph: "🐇",
    patron: "Mayáhuel",
    meaning: {
      en: "Abundance and fertility: celebration and the fruits of the earth.",
      es: "La abundancia y la fertilidad: la celebración y los frutos de la tierra.",
    },
    traits: { en: "Abundance, enjoyment, fertility.", es: "Abundancia, gozo, fertilidad." },
  },
  {
    nahuatl: "Atl",
    name: { en: "Water", es: "Agua" },
    glyph: "💧",
    patron: "Xiuhtecuhtli",
    meaning: {
      en: "Purification and emotion: what flows, cleanses and gives life.",
      es: "La purificación y la emoción: lo que fluye, limpia y da vida.",
    },
    traits: { en: "Emotion, purification, flow.", es: "Emoción, purificación, fluidez." },
  },
  {
    nahuatl: "Itzcuintli",
    name: { en: "Dog", es: "Perro" },
    glyph: "🐕",
    patron: "Mictlantecuhtli",
    meaning: {
      en: "Loyalty and guidance: the companion who helps cross the thresholds.",
      es: "La lealtad y la guía: el compañero que ayuda a cruzar los umbrales.",
    },
    traits: { en: "Loyalty, guidance, generosity.", es: "Lealtad, guía, generosidad." },
  },
  {
    nahuatl: "Ozomatli",
    name: { en: "Monkey", es: "Mono" },
    glyph: "🐒",
    patron: "Xochipilli",
    meaning: {
      en: "Play, art and joy: the creativity that dances.",
      es: "El juego, el arte y la alegría: la creatividad que baila.",
    },
    traits: { en: "Creativity, humor, charm.", es: "Creatividad, humor, encanto." },
  },
  {
    nahuatl: "Malinalli",
    name: { en: "Grass", es: "Hierba" },
    glyph: "🌾",
    patron: "Patécatl",
    meaning: {
      en: "Persistence and regeneration: the grass that grows back after being cut.",
      es: "La persistencia y la regeneración: la hierba que vuelve a crecer después de cortarla.",
    },
    traits: { en: "Tenacity, healing, regeneration.", es: "Tenacidad, sanación, regeneración." },
  },
  {
    nahuatl: "Ácatl",
    name: { en: "Reed", es: "Caña" },
    glyph: "🎋",
    patron: "Tezcatlipoca",
    meaning: {
      en: "Order and knowledge: the hollow reed that carries the word.",
      es: "El orden y el conocimiento: la caña hueca que lleva la palabra.",
    },
    traits: { en: "Clarity, authority, learning.", es: "Claridad, autoridad, aprendizaje." },
  },
  {
    nahuatl: "Océlotl",
    name: { en: "Jaguar", es: "Jaguar" },
    glyph: "🐆",
    patron: "Tlazoltéotl",
    meaning: {
      en: "Inner strength and the mystery of the night: courage and the warrior spirit.",
      es: "La fuerza interior y el misterio de la noche: el valor y el espíritu guerrero.",
    },
    traits: { en: "Courage, intuition, mystery.", es: "Valor, intuición, misterio." },
  },
  {
    nahuatl: "Cuauhtli",
    name: { en: "Eagle", es: "Águila" },
    glyph: "🦅",
    patron: "Xipe Tótec",
    meaning: {
      en: "Vision and freedom: the sun that rises and looks from above.",
      es: "La visión y la libertad: el sol que se eleva y mira desde lo alto.",
    },
    traits: { en: "Vision, ambition, freedom.", es: "Visión, ambición, libertad." },
  },
  {
    nahuatl: "Cozcacuauhtli",
    name: { en: "Vulture", es: "Zopilote" },
    glyph: "🪶",
    patron: "Itzpapálotl",
    meaning: {
      en: "The wisdom of the elders and long life: turning what is old into nourishment.",
      es: "La sabiduría de los mayores y la larga vida: convertir lo viejo en alimento.",
    },
    traits: { en: "Wisdom, patience, longevity.", es: "Sabiduría, paciencia, longevidad." },
  },
  {
    nahuatl: "Ollin",
    name: { en: "Movement", es: "Movimiento" },
    glyph: "🌀",
    patron: "Xólotl",
    meaning: {
      en: "Movement and change: the heartbeat of the Fifth Sun, Nahui Ollin.",
      es: "El movimiento y el cambio: el latido del Quinto Sol, Nahui Ollin.",
    },
    traits: { en: "Change, energy, momentum.", es: "Cambio, energía, impulso." },
  },
  {
    nahuatl: "Técpatl",
    name: { en: "Flint", es: "Pedernal" },
    glyph: "🪨",
    patron: "Tezcatlipoca",
    meaning: {
      en: "Clarity and decision: the flint that cuts away what is no longer needed.",
      es: "La claridad y la decisión: el pedernal que corta lo que ya no hace falta.",
    },
    traits: { en: "Decision, honesty, focus.", es: "Decisión, honestidad, enfoque." },
  },
  {
    nahuatl: "Quiáhuitl",
    name: { en: "Rain", es: "Lluvia" },
    glyph: "🌧️",
    patron: "Chantico",
    meaning: {
      en: "The rain that makes the earth fertile: the gifts that come from above.",
      es: "La lluvia que fecunda la tierra: los dones que llegan de lo alto.",
    },
    traits: { en: "Generosity, renewal, receptivity.", es: "Generosidad, renovación, receptividad." },
  },
  {
    nahuatl: "Xóchitl",
    name: { en: "Flower", es: "Flor" },
    glyph: "🌸",
    patron: "Xochiquetzal",
    meaning: {
      en: "Beauty and art: in xóchitl in cuícatl, flower and song, the poetry of life.",
      es: "La belleza y el arte: in xóchitl in cuícatl, flor y canto, la poesía de la vida.",
    },
    traits: { en: "Beauty, sensitivity, creativity.", es: "Belleza, sensibilidad, creatividad." },
  },
];

/** The 20 day signs, 0 = Cipactli … 19 = Xóchitl. Directions cycle East, North, West, South. */
export const DAY_SIGNS: readonly DaySign[] = DAY_SIGN_DATA.map((data, index) => ({
  index,
  ...data,
  direction: DIRECTIONS[index % 4],
}));

/** Patron and theme of each trecena, in calendar order (Codex Borbonicus). */
const TRECENA_DATA: { patron: string; meaning: Bilingual }[] = [
  {
    patron: "Tonacatecuhtli",
    meaning: { en: "Beginnings: a time to plant intentions.", es: "Comienzos: tiempo de sembrar intenciones." },
  },
  {
    patron: "Quetzalcóatl",
    meaning: { en: "Inner courage and facing what is hidden.", es: "Valor interior y mirar de frente lo oculto." },
  },
  {
    patron: "Tepeyóllotl",
    meaning: { en: "Gentleness, listening and caring for our bonds.", es: "Gentileza, escucha y cuidado de los vínculos." },
  },
  {
    patron: "Huehuecóyotl",
    meaning: { en: "Beauty, art and the pleasure of creating.", es: "Belleza, arte y el gusto de crear." },
  },
  {
    patron: "Chalchiuhtlicue",
    meaning: { en: "Order, knowledge and clear decisions.", es: "Orden, conocimiento y decisiones claras." },
  },
  {
    patron: "Tecciztécatl",
    meaning: { en: "Closing cycles and honoring the ancestors.", es: "Cerrar ciclos y honrar a los ancestros." },
  },
  {
    patron: "Tláloc",
    meaning: { en: "Receiving, and letting what was sown grow.", es: "Recibir y dejar crecer lo sembrado." },
  },
  {
    patron: "Mayáhuel",
    meaning: { en: "Persistence, healing and starting again.", es: "Persistencia, sanación y volver a empezar." },
  },
  {
    patron: "Xiuhtecuhtli",
    meaning: { en: "Life force, wisdom and renewal.", es: "Fuerza vital, sabiduría y renovación." },
  },
  {
    patron: "Mictlantecuhtli",
    meaning: { en: "Discernment: cutting away what no longer serves.", es: "Discernimiento: cortar lo que ya no sirve." },
  },
  {
    patron: "Patécatl",
    meaning: { en: "Play, joy and creative freedom.", es: "Juego, alegría y libertad creativa." },
  },
  {
    patron: "Itztlacoliuhqui",
    meaning: { en: "Resilience and adapting with a light touch.", es: "Resiliencia y adaptarse con ligereza." },
  },
  {
    patron: "Tlazoltéotl",
    meaning: { en: "Movement, change and purification.", es: "Movimiento, cambio y purificación." },
  },
  {
    patron: "Xipe Tótec",
    meaning: { en: "Loyalty, companionship and renewal.", es: "Lealtad, compañía y renovación." },
  },
  {
    patron: "Itzpapálotl",
    meaning: { en: "Turning inward: home, rest and reflection.", es: "Volver hacia dentro: el hogar, el descanso y la reflexión." },
  },
  {
    patron: "Xólotl",
    meaning: { en: "The wisdom of the elders and patience.", es: "La sabiduría de los mayores y la paciencia." },
  },
  {
    patron: "Chalchiuhtotolin",
    meaning: { en: "Emotion, cleansing and letting things flow.", es: "Emoción, limpieza y dejar fluir." },
  },
  {
    patron: "Chantico",
    meaning: { en: "New ideas, conversation and fresh air.", es: "Ideas nuevas, conversación y aire fresco." },
  },
  {
    patron: "Xochiquetzal",
    meaning: { en: "Vision, ambition and looking from above.", es: "Visión, ambición y mirar desde lo alto." },
  },
  {
    patron: "Xiuhtecuhtli",
    meaning: { en: "Abundance, celebration and gratitude.", es: "Abundancia, celebración y gratitud." },
  },
];

/** The 20 trecenas, each named after its first day (number 1, "ce" in Nahuatl). */
export const TRECENAS: readonly Trecena[] = TRECENA_DATA.map((data, index) => {
  const first = DAY_SIGNS[(index * 13) % 20];
  return {
    index,
    nahuatl: `Ce ${first.nahuatl}`,
    name: { en: `1 ${first.name.en}`, es: `1 ${first.name.es}` },
    patron: data.patron,
    meaning: data.meaning,
  };
});

/** The nine Lords of the Night (Yohualteuctin), Codex Borbonicus order. */
export const LORDS_OF_THE_NIGHT: readonly LordOfNight[] = [
  {
    nahuatl: "Xiuhtecuhtli",
    meaning: { en: "Lord of fire and time: the hearth at the center.", es: "Señor del fuego y del tiempo: el fogón del centro." },
  },
  {
    nahuatl: "Itztli",
    meaning: { en: "The obsidian blade: clarity that cuts through.", es: "La navaja de obsidiana: la claridad que corta." },
  },
  {
    nahuatl: "Piltzintecuhtli",
    meaning: { en: "The young lord: the light of the sun being born.", es: "El joven señor: la luz del sol que nace." },
  },
  {
    nahuatl: "Centéotl",
    meaning: { en: "The maize: nourishment and what sustains us.", es: "El maíz: el sustento y lo que nos alimenta." },
  },
  {
    nahuatl: "Mictlantecuhtli",
    meaning: { en: "Lord of Mictlán: rest and the memory of the dead.", es: "Señor del Mictlán: el descanso y la memoria de los muertos." },
  },
  {
    nahuatl: "Chalchiuhtlicue",
    meaning: { en: "She of the jade skirt: waters that cleanse and give life.", es: "La de la falda de jade: las aguas que limpian y dan vida." },
  },
  {
    nahuatl: "Tlazoltéotl",
    meaning: { en: "She who cleanses: healing through honesty.", es: "La que limpia: la sanación a través de la honestidad." },
  },
  {
    nahuatl: "Tepeyóllotl",
    meaning: { en: "Heart of the mountain: echo, depth and the inner jaguar.", es: "Corazón del monte: el eco, la profundidad y el jaguar interior." },
  },
  {
    nahuatl: "Tláloc",
    meaning: { en: "Lord of rain: the fertility that comes from the sky.", es: "Señor de la lluvia: la fertilidad que llega del cielo." },
  },
].map((lord, index) => ({ index, ...lord }));

/**
 * Julian Day Number of the UTC calendar day of `date` (proleptic Gregorian),
 * by the Fliegel–Van Flandern algorithm. 2000-01-01 → 2451545.
 */
export function julianDayNumber(date: Date): number {
  const { year, month, day } = utcParts(date);
  const a = Math.trunc((month - 14) / 12);
  return (
    Math.trunc((1461 * (year + 4800 + a)) / 4) +
    Math.trunc((367 * (month - 2 - 12 * a)) / 12) -
    Math.trunc((3 * Math.trunc((year + 4900 + a) / 100)) / 4) +
    day -
    32075
  );
}

/** Tonalli for a Julian Day Number (lets callers use Julian-calendar dates). */
export function tonalliFromJDN(jdn: number): Tonalli {
  if (!Number.isInteger(jdn)) throw new RangeError("JDN must be an integer");
  const d = jdn - TONALPOHUALLI_CORRELATION;
  const number = mod(d + 3, 13) + 1;
  const signIndex = mod(d + 19, 20);
  // The only k in [0, 260) with k ≡ number − 1 (mod 13) and k ≡ signIndex (mod 20).
  const cycleDay = mod(d + 159, 260);
  const sign = DAY_SIGNS[signIndex];
  return {
    number,
    sign,
    trecena: TRECENAS[Math.floor(cycleDay / 13)],
    lordOfNight: LORDS_OF_THE_NIGHT[cycleDay % 9],
    cycleDay,
    label: {
      en: `${number} ${sign.nahuatl} · ${number} ${sign.name.en}`,
      es: `${number} ${sign.nahuatl} · ${number} ${sign.name.es}`,
    },
  };
}

/** Tonalli of the UTC calendar day of `date`. */
export function getTonalli(date: Date): Tonalli {
  return tonalliFromJDN(julianDayNumber(date));
}

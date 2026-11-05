/**
 * Western (tropical) zodiac.
 *
 * Wraps `src/lib/zodiac.ts` without modifying it: that module reads the
 * *local* calendar fields of a Date, so we hand it a local Date built from
 * the UTC fields of the birth date. The result is the same in any time zone.
 */
import { getZodiacEmoji, getZodiacSign, getZodiacSignEs } from "@/lib/zodiac";
import { utcParts } from "./shared";
import type { Bilingual } from "./types";

export type WesternElement = "Fire" | "Earth" | "Air" | "Water";
export type WesternModality = "Cardinal" | "Fixed" | "Mutable";
export type WesternSignKey =
  | "Aries"
  | "Taurus"
  | "Gemini"
  | "Cancer"
  | "Leo"
  | "Virgo"
  | "Libra"
  | "Scorpio"
  | "Sagittarius"
  | "Capricorn"
  | "Aquarius"
  | "Pisces";

export interface WesternSign {
  /** English sign name, same value `getZodiacSign` returns ("Aries"…). */
  key: string;
  name: Bilingual;
  emoji: string;
  element: WesternElement;
  modality: WesternModality;
  ruler: Bilingual;
  traits: Bilingual;
  description: Bilingual;
  /** Index of the associated Major Arcana card (0–21, Rider–Waite order). */
  tarotArcana: number;
}

export const WESTERN_SIGN_KEYS: readonly WesternSignKey[] = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

export const WESTERN_ELEMENT_NAMES: Record<WesternElement, Bilingual> = {
  Fire: { en: "Fire", es: "Fuego" },
  Earth: { en: "Earth", es: "Tierra" },
  Air: { en: "Air", es: "Aire" },
  Water: { en: "Water", es: "Agua" },
};

export const WESTERN_MODALITY_NAMES: Record<WesternModality, Bilingual> = {
  Cardinal: { en: "Cardinal", es: "Cardinal" },
  Fixed: { en: "Fixed", es: "Fijo" },
  Mutable: { en: "Mutable", es: "Mutable" },
};

type SignData = Omit<WesternSign, "key" | "name" | "emoji">;

const SIGN_DATA: Record<WesternSignKey, SignData> = {
  Aries: {
    element: "Fire",
    modality: "Cardinal",
    ruler: { en: "Mars", es: "Marte" },
    traits: { en: "Initiative, courage, candor.", es: "Iniciativa, valentía, franqueza." },
    description: {
      en: "Aries moves first and asks questions on the way. There is a spark in you that wants to start things and test itself against what is real. The challenge is discovering when a pause is also a form of courage.",
      es: "Aries se mueve primero y pregunta sobre la marcha. Hay en ti una chispa que quiere empezar cosas y medirse con lo real. El reto está en descubrir cuándo una pausa también es una forma de valentía.",
    },
    tarotArcana: 4,
  },
  Taurus: {
    element: "Earth",
    modality: "Fixed",
    ruler: { en: "Venus", es: "Venus" },
    traits: { en: "Patience, steadiness, sensuality.", es: "Paciencia, constancia, sensualidad." },
    description: {
      en: "Taurus builds slowly and means it. You trust what you can touch, taste and keep, and you give others a place to rest. The invitation is to notice when steadiness turns into holding on.",
      es: "Tauro construye despacio y en serio. Confías en lo que se puede tocar, saborear y conservar, y les das a otros un lugar donde descansar. La invitación es notar cuándo la constancia se vuelve apego.",
    },
    tarotArcana: 5,
  },
  Gemini: {
    element: "Air",
    modality: "Mutable",
    ruler: { en: "Mercury", es: "Mercurio" },
    traits: { en: "Curiosity, wit, versatility.", es: "Curiosidad, ingenio, versatilidad." },
    description: {
      en: "Gemini thinks out loud and learns by connecting. Your mind enjoys holding two ideas at once and finding the bridge between them. The practice is choosing one thread long enough to see where it leads.",
      es: "Géminis piensa en voz alta y aprende conectando. Tu mente disfruta sostener dos ideas a la vez y encontrar el puente entre ellas. La práctica es elegir un hilo el tiempo suficiente para ver a dónde lleva.",
    },
    tarotArcana: 6,
  },
  Cancer: {
    element: "Water",
    modality: "Cardinal",
    ruler: { en: "Moon", es: "Luna" },
    traits: { en: "Care, memory, intuition.", es: "Cuidado, memoria, intuición." },
    description: {
      en: "Cancer reads the room before walking in. You protect what you love and remember what others forget. The growth is letting yourself be cared for as generously as you care for others.",
      es: "Cáncer siente el ambiente antes de entrar. Proteges lo que amas y recuerdas lo que otros olvidan. El crecimiento está en dejarte cuidar con la misma generosidad con que cuidas.",
    },
    tarotArcana: 7,
  },
  Leo: {
    element: "Fire",
    modality: "Fixed",
    ruler: { en: "Sun", es: "Sol" },
    traits: { en: "Warmth, creativity, loyalty.", es: "Calidez, creatividad, lealtad." },
    description: {
      en: "Leo shines best when it lights up others too. You bring warmth, play and a generous heart to whatever you touch. The quiet lesson is that you are worth the same whether or not anyone is watching.",
      es: "Leo brilla mejor cuando también ilumina a otros. Llevas calidez, juego y un corazón generoso a todo lo que tocas. La lección de fondo es que vales lo mismo aunque nadie esté mirando.",
    },
    tarotArcana: 8,
  },
  Virgo: {
    element: "Earth",
    modality: "Mutable",
    ruler: { en: "Mercury", es: "Mercurio" },
    traits: { en: "Discernment, service, precision.", es: "Discernimiento, servicio, precisión." },
    description: {
      en: "Virgo notices the detail that makes the difference. You find meaning in useful work and in improving what already exists. The tenderness you offer others is also yours to keep.",
      es: "Virgo nota el detalle que hace la diferencia. Encuentras sentido en el trabajo útil y en mejorar lo que ya existe. La ternura que les das a otros también te pertenece.",
    },
    tarotArcana: 9,
  },
  Libra: {
    element: "Air",
    modality: "Cardinal",
    ruler: { en: "Venus", es: "Venus" },
    traits: { en: "Harmony, fairness, grace.", es: "Armonía, sentido de justicia, gracia." },
    description: {
      en: "Libra looks for balance and finds beauty in it. You weigh every side and make room for other voices. The challenge is remembering that your own preference also belongs on the scale.",
      es: "Libra busca el equilibrio y encuentra belleza en él. Sopesas cada lado y les haces espacio a otras voces. El reto es recordar que tu propia preferencia también cuenta en la balanza.",
    },
    tarotArcana: 11,
  },
  Scorpio: {
    element: "Water",
    modality: "Fixed",
    ruler: { en: "Pluto", es: "Plutón" },
    traits: { en: "Depth, intensity, devotion.", es: "Profundidad, intensidad, entrega." },
    description: {
      en: "Scorpio goes all the way down. You prefer truth to comfort and you are not afraid of what transforms you. The invitation is to let others in before you have tested them completely.",
      es: "Escorpio va hasta el fondo. Prefieres la verdad a la comodidad y no le temes a lo que te transforma. La invitación es dejar entrar a otros antes de haberlos puesto a prueba por completo.",
    },
    tarotArcana: 13,
  },
  Sagittarius: {
    element: "Fire",
    modality: "Mutable",
    ruler: { en: "Jupiter", es: "Júpiter" },
    traits: { en: "Optimism, freedom, honesty.", es: "Optimismo, libertad, honestidad." },
    description: {
      en: "Sagittarius is always looking past the horizon. You seek meaning, laughter and room to roam, and you say what you see. The art is bringing home what you learn along the way.",
      es: "Sagitario siempre mira más allá del horizonte. Buscas sentido, risa y espacio para andar, y dices lo que ves. El arte está en traer de vuelta a casa lo que aprendes en el camino.",
    },
    tarotArcana: 14,
  },
  Capricorn: {
    element: "Earth",
    modality: "Cardinal",
    ruler: { en: "Saturn", es: "Saturno" },
    traits: { en: "Discipline, ambition, responsibility.", es: "Disciplina, ambición, responsabilidad." },
    description: {
      en: "Capricorn climbs with patience and keeps its word. You take on responsibility early and build things that last. The reminder is that rest and play are also part of the path.",
      es: "Capricornio sube con paciencia y cumple su palabra. Asumes responsabilidades desde joven y construyes cosas que duran. El recordatorio es que el descanso y el juego también son parte del camino.",
    },
    tarotArcana: 15,
  },
  Aquarius: {
    element: "Air",
    modality: "Fixed",
    ruler: { en: "Uranus", es: "Urano" },
    traits: { en: "Originality, independence, ideals.", es: "Originalidad, independencia, ideales." },
    description: {
      en: "Aquarius sees how things could be different. You value freedom, friendship and ideas that help many people at once. The closeness you sometimes keep at arm's length is also worth exploring.",
      es: "Acuario ve cómo las cosas podrían ser distintas. Valoras la libertad, la amistad y las ideas que ayudan a muchos a la vez. También vale la pena explorar la cercanía que a veces mantienes a raya.",
    },
    tarotArcana: 17,
  },
  Pisces: {
    element: "Water",
    modality: "Mutable",
    ruler: { en: "Neptune", es: "Neptuno" },
    traits: { en: "Empathy, imagination, sensitivity.", es: "Empatía, imaginación, sensibilidad." },
    description: {
      en: "Pisces feels for others as if their story were its own. Your imagination and compassion reach places words do not. The practice is drawing a gentle line between what is yours and what you absorb.",
      es: "Piscis siente con los demás como si su historia fuera propia. Tu imaginación y tu compasión llegan a donde no llegan las palabras. La práctica es trazar una línea amable entre lo que es tuyo y lo que absorbes.",
    },
    tarotArcana: 18,
  },
};

/** The 12 signs, keyed by their English name. */
export const WESTERN_SIGNS: Record<WesternSignKey, WesternSign> = Object.fromEntries(
  WESTERN_SIGN_KEYS.map((key) => [
    key,
    {
      key,
      name: { en: key, es: getZodiacSignEs(key) },
      emoji: getZodiacEmoji(key),
      ...SIGN_DATA[key],
    },
  ]),
) as Record<WesternSignKey, WesternSign>;

/** Sign for a stored key such as `UserProfile.zodiacSign`; `null` if unknown. */
export function getWesternSignByKey(key: string): WesternSign | null {
  return (WESTERN_SIGNS as Record<string, WesternSign>)[key] ?? null;
}

/** Sun sign for a birth date (UTC calendar day). */
export function getWesternSign(birthDate: Date): WesternSign {
  const { year, month, day } = utcParts(birthDate);
  // `getZodiacSign` reads local fields: give it a local date with the UTC day.
  const local = new Date(2000, 0, 1, 12, 0, 0, 0);
  local.setFullYear(year, month - 1, day);
  return WESTERN_SIGNS[getZodiacSign(local) as WesternSignKey];
}

type ElementPair =
  | "same"
  | "fire-air"
  | "earth-water"
  | "fire-water"
  | "earth-air"
  | "fire-earth"
  | "air-water";

const ELEMENT_COMPATIBILITY: Record<
  ElementPair,
  { score: 1 | 2 | 3 | 4 | 5; summary: Bilingual }
> = {
  same: {
    score: 4,
    summary: {
      en: "Same element: you understand each other's rhythm without explaining it. The challenge is not to amplify the same blind spots.",
      es: "Mismo elemento: entienden el ritmo del otro sin tener que explicarlo. El reto es no amplificar los mismos puntos ciegos.",
    },
  },
  "fire-air": {
    score: 5,
    summary: {
      en: "Fire and air feed each other: ideas turn into action and action finds its words.",
      es: "El fuego y el aire se avivan mutuamente: las ideas se vuelven acción y la acción encuentra sus palabras.",
    },
  },
  "earth-water": {
    score: 5,
    summary: {
      en: "Earth and water nourish each other: one gives shape, the other gives depth.",
      es: "La tierra y el agua se nutren mutuamente: una da forma y la otra da profundidad.",
    },
  },
  "fire-water": {
    score: 2,
    summary: {
      en: "Fire and water meet in steam: passion and sensitivity need patience to understand each other.",
      es: "Cuando el fuego y el agua se encuentran, hay vapor: la pasión y la sensibilidad necesitan paciencia para entenderse.",
    },
  },
  "earth-air": {
    score: 2,
    summary: {
      en: "Earth and air move at different speeds: the practical and the imagined need a shared language.",
      es: "La tierra y el aire van a distinta velocidad: lo práctico y lo imaginado necesitan un idioma común.",
    },
  },
  "fire-earth": {
    score: 3,
    summary: {
      en: "Fire and earth can build together when urgency learns to respect patience.",
      es: "El fuego y la tierra pueden construir juntos cuando la prisa aprende a respetar la paciencia.",
    },
  },
  "air-water": {
    score: 3,
    summary: {
      en: "Air and water meet between thought and feeling; listening closes the distance.",
      es: "El aire y el agua se encuentran entre la idea y el sentimiento; escuchar acorta la distancia.",
    },
  },
};

function elementPair(a: WesternElement, b: WesternElement): ElementPair {
  if (a === b) return "same";
  const has = (x: WesternElement, y: WesternElement) =>
    (a === x && b === y) || (a === y && b === x);
  if (has("Fire", "Air")) return "fire-air";
  if (has("Earth", "Water")) return "earth-water";
  if (has("Fire", "Water")) return "fire-water";
  if (has("Earth", "Air")) return "earth-air";
  if (has("Fire", "Earth")) return "fire-earth";
  return "air-water";
}

/**
 * Compatibility between two elements: fire–air and earth–water 5,
 * same element 4, fire–water and earth–air 2, the rest 3.
 */
export function getElementCompatibility(
  a: WesternSign["element"],
  b: WesternSign["element"],
): { score: 1 | 2 | 3 | 4 | 5; summary: Bilingual } {
  return ELEMENT_COMPATIBILITY[elementPair(a, b)];
}

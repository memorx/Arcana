/**
 * Reading for two: compatibility across Arcana's systems (western elements,
 * Chinese zodiac, numerology and the Mexica tonalpohualli), plus the helpers
 * the API and the pages share (birth date input, stored summary, text blocks).
 *
 * Every user-facing text is bilingual ({ en, es }) so a saved reading can be
 * shown in the interface language. All dates are read in UTC.
 */
import {
  getChineseCompatibility,
  getChineseSign,
  getElementCompatibility,
  getExpressionNumber,
  getLifePathNumber,
  getTonalli,
  getWesternSign,
  reduceNumber,
  todayUtc,
  WESTERN_ELEMENT_NAMES,
  type Bilingual,
  type ChineseAnimal,
  type ChineseElement,
  type ChineseRelation,
  type CoreNumber,
  type PersonalNumber,
  type WesternElement,
} from "@/lib/systems";

export type CompatibilityScore = 1 | 2 | 3 | 4 | 5;

/** Credits a reading for two costs. It never uses free readings. */
export const COMPATIBILITY_COST = 2;

export interface CompatibilityPerson {
  birthDate: Date;
  /** Only used for name numerology; never stored. */
  fullName?: string | null;
}

export interface ChineseSide {
  animal: ChineseAnimal;
  element: ChineseElement;
  label: Bilingual;
  emoji: string;
}

export interface WesternSide {
  key: string;
  name: Bilingual;
  emoji: string;
  element: WesternElement;
  elementName: Bilingual;
}

export interface TonalliSide {
  label: Bilingual;
  glyph: string;
  direction: Bilingual;
}

/** How two life paths relate: same number, same family (1-5-7, 2-4-8, 3-6-9) or different families. */
export type NumberPairing = "same" | "family" | "different";

export type TonalliResonance = "same-tonalli" | "same-sign" | "same-trecena" | "same-direction" | "different";

export interface CompatibilityResult {
  western: { a: WesternSide; b: WesternSide; score: CompatibilityScore; summary: Bilingual };
  chinese: {
    a: ChineseSide;
    b: ChineseSide;
    score: CompatibilityScore;
    relation: ChineseRelation;
    summary: Bilingual;
  };
  numerology: {
    /** Life path of each person. */
    a: CoreNumber;
    b: CoreNumber;
    /** Life paths added and reduced to one digit (masters are not kept). */
    relationshipNumber: PersonalNumber;
    relationshipName: Bilingual;
    pairing: NumberPairing;
    score: CompatibilityScore;
    /** What the relationship number speaks of. */
    summary: Bilingual;
    pairingSummary: Bilingual;
    /** Expression numbers, only when both full names give one. */
    names: { a: CoreNumber; b: CoreNumber; pairing: NumberPairing } | null;
  };
  tonalli: {
    a: TonalliSide;
    b: TonalliSide;
    sameSign: boolean;
    sameTrecena: boolean;
    sameDirection: boolean;
    resonance: TonalliResonance;
    score: CompatibilityScore;
    summary: Bilingual;
  };
  /** Rounded average of the four system scores. */
  overall: CompatibilityScore;
  overallLabel: Bilingual;
}

// ---------------------------------------------------------------------------
// Numerology
// ---------------------------------------------------------------------------

/** Families of numbers that move at a similar rhythm (masters count as their root: 11→2, 22→4, 33→6). */
const NUMBER_FAMILIES: readonly (readonly number[])[] = [
  [1, 5, 7],
  [2, 4, 8],
  [3, 6, 9],
];

const PAIRING_SCORES: Record<NumberPairing, CompatibilityScore> = { same: 4, family: 5, different: 3 };

export const NUMBER_PAIRINGS: Record<NumberPairing, Bilingual> = {
  same: {
    en: "You share the same number: you recognize each other at once. The challenge is not to reinforce the same blind spots.",
    es: "Comparten el mismo número: se reconocen al instante. El reto es no reforzar los mismos puntos ciegos.",
  },
  family: {
    en: "Your numbers belong to the same family: you move at a similar rhythm, which makes it easy to understand each other.",
    es: "Sus números pertenecen a la misma familia: se mueven a un ritmo parecido y eso hace fácil entenderse.",
  },
  different: {
    en: "Your numbers come from different families: each one brings what the other finds harder. The difference asks for translation, and it also enriches.",
    es: "Sus números vienen de familias distintas: cada quien aporta lo que al otro le cuesta más. La diferencia pide traducción, y también enriquece.",
  },
};

/** The bond number (life paths added and reduced): its name and what it speaks of. */
export const RELATIONSHIP_NUMBERS: Record<PersonalNumber, { name: Bilingual; summary: Bilingual }> = {
  1: {
    name: { en: "Momentum", es: "El impulso" },
    summary: {
      en: "A bond that pushes you to start things. Together you dare to take the first step; the challenge is that both of you have a say in where you are heading.",
      es: "Un vínculo que empuja a empezar cosas. Juntos se animan a dar el primer paso; el reto es que los dos tengan voz en hacia dónde van.",
    },
  },
  2: {
    name: { en: "Partnership", es: "El acuerdo" },
    summary: {
      en: "A bond of listening and nuance that grows with patience and small gestures. The challenge is to say what you need instead of hoping the other will guess it.",
      es: "Un vínculo de escucha y de matices que crece con la paciencia y los gestos pequeños. El reto es decir lo que se necesita en lugar de esperar que el otro lo adivine.",
    },
  },
  3: {
    name: { en: "Expression", es: "La expresión" },
    summary: {
      en: "A bond fed by conversation, humor and creativity, where ideas pass easily between you. The challenge is not to stay on the surface when it is time to talk about what is hard.",
      es: "Un vínculo que se nutre de conversación, humor y creatividad, donde las ideas pasan de uno a otro con facilidad. El reto es no quedarse en la superficie cuando toca hablar de lo difícil.",
    },
  },
  4: {
    name: { en: "Foundation", es: "La base" },
    summary: {
      en: "A bond that builds routines, plans and a safe place for both of you. The challenge is to leave room for surprise.",
      es: "Un vínculo que construye rutinas, planes y un lugar seguro para los dos. El reto es dejar espacio para la sorpresa.",
    },
  },
  5: {
    name: { en: "Movement", es: "El movimiento" },
    summary: {
      en: "A bond of adventure and change in which you both feel alive. The challenge is to find something that anchors you when the pace slows down.",
      es: "Un vínculo de aventura y cambio en el que los dos se sienten vivos. El reto es encontrar algo que los ancle cuando el ritmo baja.",
    },
  },
  6: {
    name: { en: "Care", es: "El cuidado" },
    summary: {
      en: "A bond of care and shared responsibility that feels like home. The challenge is that caring does not turn into one person carrying everything.",
      es: "Un vínculo de cuidado y responsabilidad compartida que se siente como un hogar. El reto es que cuidar no se vuelva cargar con todo.",
    },
  },
  7: {
    name: { en: "Depth", es: "La profundidad" },
    summary: {
      en: "A bond that looks for meaning and deep conversations, where you understand each other in silence. The challenge is not to retreat each into your own world.",
      es: "Un vínculo que busca sentido y conversaciones de fondo, donde se entienden en silencio. El reto es no encerrarse cada quien en su propio mundo.",
    },
  },
  8: {
    name: { en: "Strength", es: "La fuerza" },
    summary: {
      en: "A bond with ambition and the ability to get things done together. The challenge is to share power and speak plainly about money and goals.",
      es: "Un vínculo con ambición y capacidad de lograr cosas juntos. El reto es repartir el poder y hablar claro de dinero y de metas.",
    },
  },
  9: {
    name: { en: "Generosity", es: "La generosidad" },
    summary: {
      en: "A broad, compassionate bond that looks beyond the two of you. The challenge is to close cycles and not carry what has already ended.",
      es: "Un vínculo amplio y compasivo que mira más allá de los dos. El reto es cerrar ciclos y no cargar con lo que ya terminó.",
    },
  },
};

function familyOf(n: CoreNumber): number {
  const root = reduceNumber(n, false);
  return NUMBER_FAMILIES.findIndex((family) => family.includes(root));
}

export function getNumberPairing(a: CoreNumber, b: CoreNumber): NumberPairing {
  if (a === b) return "same";
  return familyOf(a) === familyOf(b) ? "family" : "different";
}

// ---------------------------------------------------------------------------
// Tonalpohualli
// ---------------------------------------------------------------------------

const TONALLI_SCORES: Record<TonalliResonance, CompatibilityScore> = {
  "same-tonalli": 5,
  "same-sign": 5,
  "same-trecena": 5,
  "same-direction": 4,
  different: 3,
};

export const TONALLI_RESONANCES: Record<TonalliResonance, Bilingual> = {
  "same-tonalli": {
    en: "You share the same tonalli, number and sign. In the Mexica tradition, that speaks of arriving with a very similar character: you recognize each other easily, and it helps to look for what each one sees differently.",
    es: "Comparten el mismo tonalli, número y signo. En la tradición mexica, eso habla de haber llegado con un carácter muy parecido: se reconocen con facilidad, y ayuda buscar lo que cada quien ve distinto.",
  },
  "same-sign": {
    en: "You share the same day sign. In the Mexica tradition, that speaks of a similar way of being in the world, lived with a different number and intensity.",
    es: "Comparten el mismo signo del día. En la tradición mexica, eso habla de una manera parecida de estar en el mundo, vivida con un número y una intensidad distintos.",
  },
  "same-trecena": {
    en: "You were born in the same trecena, the same thirteen days of the count. In the tonalpohualli each trecena has its own patron and tone: you share a common background even though your signs differ.",
    es: "Nacieron en la misma trecena, los mismos trece días de la cuenta. En el tonalpohualli cada trecena tiene su propio patrono y su propio tono: comparten un mismo telón de fondo aunque sus signos sean distintos.",
  },
  "same-direction": {
    en: "Your day signs belong to the same direction of the calendar. You share an underlying orientation, even if each of you lives it in your own way.",
    es: "Sus signos del día pertenecen al mismo rumbo del calendario. Comparten una orientación de fondo, aunque cada quien la viva a su manera.",
  },
  different: {
    en: "Your day signs come from different directions. In the Mexica tradition, the four directions are needed to complete the cycle: what one has plenty of, the other may need.",
    es: "Sus signos del día vienen de rumbos distintos. En la tradición mexica, los cuatro rumbos hacen falta para completar el ciclo: lo que a uno le sobra, al otro le puede hacer falta.",
  },
};

// ---------------------------------------------------------------------------
// Overall
// ---------------------------------------------------------------------------

export const OVERALL_LABELS: Record<CompatibilityScore, Bilingual> = {
  5: { en: "Natural affinity", es: "Afinidad natural" },
  4: { en: "Good attunement", es: "Buena sintonía" },
  3: { en: "A balance you build together", es: "Un equilibrio que se construye" },
  2: { en: "A contrast that teaches", es: "Un contraste que enseña" },
  1: { en: "Much to learn from each other", es: "Mucho que aprender uno del otro" },
};

function toScore(n: number): CompatibilityScore {
  return Math.min(5, Math.max(1, Math.round(n))) as CompatibilityScore;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * Compatibility between two people. `me` needs a birth date and a full name;
 * the partner's full name is optional: without it, numerology uses the life
 * paths only.
 */
export function computeCompatibility(me: CompatibilityPerson, partner: CompatibilityPerson): CompatibilityResult {
  // Western zodiac (elements)
  const westA = getWesternSign(me.birthDate);
  const westB = getWesternSign(partner.birthDate);
  const westernSide = (s: typeof westA): WesternSide => ({
    key: s.key,
    name: s.name,
    emoji: s.emoji,
    element: s.element,
    elementName: WESTERN_ELEMENT_NAMES[s.element],
  });
  const western = { a: westernSide(westA), b: westernSide(westB), ...getElementCompatibility(westA.element, westB.element) };

  // Chinese zodiac
  const chA = getChineseSign(me.birthDate);
  const chB = getChineseSign(partner.birthDate);
  const chineseSide = (s: typeof chA): ChineseSide => ({
    animal: s.animal,
    element: s.element,
    label: s.label,
    emoji: s.emoji,
  });
  const chinese = { a: chineseSide(chA), b: chineseSide(chB), ...getChineseCompatibility(chA.animal, chB.animal) };

  // Numerology: life paths, plus expression numbers when both names give one
  const lpA = getLifePathNumber(me.birthDate);
  const lpB = getLifePathNumber(partner.birthDate);
  const relationshipNumber = reduceNumber(lpA + lpB, false) as PersonalNumber;
  const pairing = getNumberPairing(lpA, lpB);

  const exA = me.fullName?.trim() ? getExpressionNumber(me.fullName) : null;
  const exB = partner.fullName?.trim() ? getExpressionNumber(partner.fullName) : null;
  const names = exA !== null && exB !== null ? { a: exA, b: exB, pairing: getNumberPairing(exA, exB) } : null;

  const numerologyScore = names
    ? toScore((PAIRING_SCORES[pairing] + PAIRING_SCORES[names.pairing]) / 2)
    : PAIRING_SCORES[pairing];

  const numerology = {
    a: lpA,
    b: lpB,
    relationshipNumber,
    relationshipName: RELATIONSHIP_NUMBERS[relationshipNumber].name,
    pairing,
    score: numerologyScore,
    summary: RELATIONSHIP_NUMBERS[relationshipNumber].summary,
    pairingSummary: NUMBER_PAIRINGS[pairing],
    names,
  };

  // Tonalpohualli
  const tnA = getTonalli(me.birthDate);
  const tnB = getTonalli(partner.birthDate);
  const sameSign = tnA.sign.index === tnB.sign.index;
  const sameTrecena = tnA.trecena.index === tnB.trecena.index;
  const sameDirection = tnA.sign.direction.en === tnB.sign.direction.en;
  const resonance: TonalliResonance =
    tnA.cycleDay === tnB.cycleDay
      ? "same-tonalli"
      : sameSign
        ? "same-sign"
        : sameTrecena
          ? "same-trecena"
          : sameDirection
            ? "same-direction"
            : "different";
  const tonalliSide = (t: typeof tnA): TonalliSide => ({
    label: t.label,
    glyph: t.sign.glyph,
    direction: t.sign.direction,
  });
  const tonalli = {
    a: tonalliSide(tnA),
    b: tonalliSide(tnB),
    sameSign,
    sameTrecena,
    sameDirection,
    resonance,
    score: TONALLI_SCORES[resonance],
    summary: TONALLI_RESONANCES[resonance],
  };

  const overall = toScore((western.score + chinese.score + numerology.score + tonalli.score) / 4);

  return { western, chinese, numerology, tonalli, overall, overallLabel: OVERALL_LABELS[overall] };
}

// ---------------------------------------------------------------------------
// Partner birth date (form and API input)
// ---------------------------------------------------------------------------

export const MIN_BIRTH_YEAR = 1900;

export type BirthDateError = "invalid" | "future" | "too_old";

/**
 * Parses "YYYY-MM-DD" into midnight UTC. Rejects malformed or impossible dates
 * (2023-02-30), dates before 1900 and dates after today (UTC).
 */
export function parseBirthDateInput(
  value: unknown,
  today: Date = todayUtc(),
): { ok: true; date: Date } | { ok: false; error: BirthDateError } {
  if (typeof value !== "string") return { ok: false, error: "invalid" };
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return { ok: false, error: "invalid" };

  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return { ok: false, error: "invalid" };
  }
  if (y < MIN_BIRTH_YEAR) return { ok: false, error: "too_old" };
  if (date.getTime() > today.getTime()) return { ok: false, error: "future" };
  return { ok: true, date };
}

/** "YYYY-MM-DD" of a date's UTC day. */
export function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Stored summary (CompatibilityReading.summary)
// ---------------------------------------------------------------------------

export type CompatibilityCardRole = "me" | "partner" | "bond";

/** Role of each of the three cards, in draw order. */
export const CARD_ROLES: readonly { role: CompatibilityCardRole; label: Bilingual }[] = [
  { role: "me", label: { en: "You", es: "Tú" } },
  { role: "partner", label: { en: "The other person", es: "La otra persona" } },
  { role: "bond", label: { en: "The bond", es: "El vínculo" } },
];

export interface CompatibilityCard {
  position: number;
  role: CompatibilityCardRole;
  roleLabel: Bilingual;
  cardId: string;
  isReversed: boolean;
  name: string;
  nameEs: string;
  imageUrl: string;
  arcana: "MAJOR" | "MINOR";
  suit: "WANDS" | "CUPS" | "SWORDS" | "PENTACLES" | null;
  number: number;
}

export interface CompatibilityScores {
  western: CompatibilityScore;
  chinese: CompatibilityScore;
  numerology: CompatibilityScore;
  tonalli: CompatibilityScore;
  overall: CompatibilityScore;
}

export interface CompatibilitySummary {
  version: 1;
  scores: CompatibilityScores;
  systems: CompatibilityResult;
  cards: CompatibilityCard[];
}

export function buildCompatibilitySummary(
  systems: CompatibilityResult,
  cards: CompatibilityCard[],
): CompatibilitySummary {
  return {
    version: 1,
    scores: {
      western: systems.western.score,
      chinese: systems.chinese.score,
      numerology: systems.numerology.score,
      tonalli: systems.tonalli.score,
      overall: systems.overall,
    },
    systems,
    cards,
  };
}

const isScore = (x: unknown): x is CompatibilityScore =>
  typeof x === "number" && Number.isInteger(x) && x >= 1 && x <= 5;

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null;

/** Reads a stored summary back; null if the JSON doesn't have the expected shape. */
export function parseCompatibilitySummary(value: unknown): CompatibilitySummary | null {
  if (!isRecord(value) || value.version !== 1) return null;
  const { scores, systems, cards } = value;
  if (!isRecord(scores) || !isRecord(systems) || !Array.isArray(cards)) return null;
  const keys = ["western", "chinese", "numerology", "tonalli", "overall"] as const;
  if (!keys.every((k) => isScore(scores[k]))) return null;
  if (!["western", "chinese", "numerology", "tonalli"].every((k) => isRecord(systems[k]))) return null;
  const cardsOk = cards.every(
    (c) =>
      isRecord(c) &&
      typeof c.cardId === "string" &&
      typeof c.name === "string" &&
      typeof c.nameEs === "string" &&
      typeof c.isReversed === "boolean" &&
      typeof c.role === "string",
  );
  if (!cardsOk) return null;
  return value as unknown as CompatibilitySummary;
}

/** Overall score of a stored summary, or null if it can't be read. */
export function getStoredOverall(value: unknown): CompatibilityScore | null {
  if (!isRecord(value) || !isRecord(value.scores)) return null;
  const overall = value.scores.overall;
  return isScore(overall) ? overall : null;
}

// ---------------------------------------------------------------------------
// Reading text
// ---------------------------------------------------------------------------

export type TextBlock = { type: "heading" | "paragraph"; text: string };

const HEADING_MAX_LENGTH = 60;

/**
 * Splits the AI text into paragraphs. A short line without closing punctuation
 * is a section title ("Cómo se encuentran"); markdown marks are stripped in
 * case the model adds them.
 */
export function toTextBlocks(content: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const marked = /^#{1,6}\s+/.test(line) || /^\*\*[^*]+\*\*:?$/.test(line);
    const text = line
      .replace(/^#{1,6}\s+/, "")
      .replace(/\*\*/g, "")
      .trim();
    if (!text) continue;
    const looksLikeTitle = text.length <= HEADING_MAX_LENGTH && !/[.!?…;,]$/.test(text);
    if (marked || looksLikeTitle) {
      blocks.push({ type: "heading", text: text.replace(/^\d+[.)]\s+/, "").replace(/:$/, "") });
    } else {
      blocks.push({ type: "paragraph", text });
    }
  }
  return blocks;
}

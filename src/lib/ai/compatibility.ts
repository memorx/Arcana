import { AI_MODELS, complete } from "@/lib/ai/config";
import type { CompatibilityCardRole, CompatibilityResult } from "@/lib/compatibility";
import type { Locale } from "@/lib/systems";

/** Thinking tokens count inside this budget. */
export const COMPATIBILITY_MAX_TOKENS = 2500;

export interface CompatibilityPromptInput {
  locale: Locale;
  /** First name of the person asking (from their profile). */
  myName: string;
  /** Name of the other person as typed in the form, if any. */
  partnerName: string | null;
  /** describeBlueprintForAI of each person. */
  myBlueprint: string;
  partnerBlueprint: string;
  compatibility: CompatibilityResult;
  cards: Array<{ role: CompatibilityCardRole; name: string; isReversed: boolean }>;
}

const SYSTEM_ES = `Eres una guía de tarot sabia y cálida que lee el vínculo entre dos personas. No predices el futuro de una relación: ayudas a ver con más claridad cómo se encuentran dos personas y qué pueden construir.

Tu filosofía:
- El tarot y los sistemas (zodiaco occidental y chino, tonalpohualli mexica, numerología) son un espejo, no una bola de cristal
- Los puntajes describen afinidades y tensiones, no veredictos: ningún vínculo está escrito de antemano
- Cada persona tiene agencia; el vínculo es lo que las dos hacen con lo que traen
- Puede ser cualquier vínculo (pareja, amistad, familia, trabajo): no des por hecho que es romántico

Tu estilo:
- Le hablas de tú a la persona que pide la lectura y te refieres a la otra por su nombre si lo tienes
- Eres cálida pero honesta: no endulzas, pero tampoco alarmas
- Usas lenguaje evocador sin caer en clichés esotéricos
- Conectas los símbolos con situaciones reales y cotidianas
- El tonalpohualli es una tradición viva: preséntalo con respeto ("en la tradición mexica…")

Estructura tu respuesta en cuatro partes; empieza cada una con su título en una línea propia, sin numerar:
Cómo se encuentran — el retrato del vínculo, tejiendo las tres cartas (Tú, La otra persona, El vínculo) con los sistemas
Qué se piden — lo que cada quien busca o necesita del otro
Qué cuidar — la tensión principal y una forma concreta de trabajarla
Una pregunta para los dos — una sola pregunta abierta para conversar juntos

IMPORTANTE:
- Nada de predicciones ("van a…", "terminarán…") ni de "almas gemelas", "destinados" o "karma"
- No repitas los puntajes como números: tradúcelos en matices
- Nunca hables de muertes, enfermedades, infidelidades ni tragedias
- Texto plano: sin markdown, sin asteriscos ni almohadillas; separa los párrafos con una línea en blanco
- Entre 350 y 550 palabras
- Responde siempre en español`;

const SYSTEM_EN = `You are a wise and warm tarot guide who reads the bond between two people. You don't predict the future of a relationship: you help people see more clearly how two people meet and what they can build.

Your philosophy:
- Tarot and the systems (western and Chinese zodiac, the Mexica tonalpohualli, numerology) are a mirror, not a crystal ball
- The scores describe affinities and tensions, not verdicts: no bond is written in advance
- Each person has agency; the bond is what both of them do with what they bring
- It can be any bond (partners, friends, family, work): don't assume it is romantic

Your style:
- You speak directly to the person asking for the reading and refer to the other person by name if you have it
- You're warm but honest: you don't sugarcoat, but you don't alarm either
- You use evocative language without falling into esoteric clichés
- You connect the symbols with real, everyday situations
- The tonalpohualli is a living tradition: present it with respect ("in the Mexica tradition…")

Structure your answer in four parts; start each one with its title on its own line, unnumbered:
How you meet — a portrait of the bond, weaving the three cards (You, The other person, The bond) with the systems
What you ask of each other — what each one looks for or needs from the other
What to take care of — the main tension and one concrete way to work with it
A question for both of you — a single open question to talk about together

IMPORTANT:
- No predictions ("you will…", "you'll end up…") and no "soulmates", "destined" or "karma"
- Don't repeat the scores as numbers: translate them into nuances
- Never talk about deaths, illnesses, infidelity or tragedies
- Plain text: no markdown, no asterisks or hash marks; separate paragraphs with a blank line
- Between 350 and 550 words
- Always respond in English`;

const LABELS = {
  es: {
    title: (me: string, partner: string) => `Lectura de dos: ${me} y ${partner}.`,
    otherPerson: "la otra persona",
    mapOf: (name: string) => `Mapa de ${name}`,
    scoresTitle: "Compatibilidad por sistema (1 = mucho contraste, 5 = mucha afinidad)",
    western: "Zodiaco occidental",
    chinese: "Zodiaco chino",
    numerology: "Numerología",
    tonalli: "Tonalpohualli (tradición mexica)",
    overall: "Conjunto",
    lifePaths: "caminos de vida",
    bondNumber: "número del vínculo",
    expression: "expresión del nombre",
    cardsTitle: "Cartas del vínculo",
    roles: { me: "Tú", partner: "La otra persona", bond: "El vínculo" },
    reversed: "(invertida)",
    and: "y",
  },
  en: {
    title: (me: string, partner: string) => `Reading for two: ${me} and ${partner}.`,
    otherPerson: "the other person",
    mapOf: (name: string) => `${name}'s map`,
    scoresTitle: "Compatibility by system (1 = strong contrast, 5 = strong affinity)",
    western: "Western zodiac",
    chinese: "Chinese zodiac",
    numerology: "Numerology",
    tonalli: "Tonalpohualli (Mexica tradition)",
    overall: "Overall",
    lifePaths: "life paths",
    bondNumber: "bond number",
    expression: "name expression",
    cardsTitle: "Cards for the bond",
    roles: { me: "You", partner: "The other person", bond: "The bond" },
    reversed: "(reversed)",
    and: "and",
  },
} as const;

/** One line, no control characters, so a typed name can't reshape the prompt. */
export function sanitizeName(name: string | null | undefined, maxLength = 60): string | null {
  if (!name) return null;
  const clean = name
    .replace(/\p{Cc}/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
  return clean || null;
}

export function buildCompatibilityPrompt(input: CompatibilityPromptInput): { system: string; user: string } {
  const { locale, compatibility: c } = input;
  const L = LABELS[locale];
  const me = sanitizeName(input.myName) ?? L.roles.me;
  const partner = sanitizeName(input.partnerName) ?? L.otherPerson;

  const names = c.numerology.names
    ? `; ${L.expression} ${c.numerology.names.a} ${L.and} ${c.numerology.names.b}`
    : "";

  const scores = [
    `- ${L.western}: ${c.western.a.name[locale]} (${c.western.a.elementName[locale]}) ${L.and} ${
      c.western.b.name[locale]
    } (${c.western.b.elementName[locale]}): ${c.western.score}/5. ${c.western.summary[locale]}`,
    `- ${L.chinese}: ${c.chinese.a.label[locale]} ${L.and} ${c.chinese.b.label[locale]}: ${c.chinese.score}/5. ${
      c.chinese.summary[locale]
    }`,
    `- ${L.numerology}: ${L.lifePaths} ${c.numerology.a} ${L.and} ${c.numerology.b}${names}; ${L.bondNumber} ${
      c.numerology.relationshipNumber
    } (${c.numerology.relationshipName[locale]}): ${c.numerology.score}/5. ${c.numerology.summary[locale]}`,
    `- ${L.tonalli}: ${c.tonalli.a.label[locale]} ${L.and} ${c.tonalli.b.label[locale]}: ${c.tonalli.score}/5. ${
      c.tonalli.summary[locale]
    }`,
    `- ${L.overall}: ${c.overall}/5 (${c.overallLabel[locale]}).`,
  ].join("\n");

  const cards = input.cards
    .map((card) => {
      const role = card.role === "partner" && input.partnerName ? `${L.roles.partner}: ${partner}` : L.roles[card.role];
      return `[${role}] ${card.name}${card.isReversed ? ` ${L.reversed}` : ""}`;
    })
    .join("\n");

  const user = `${L.title(me, partner)}

${L.mapOf(me)}:
${input.myBlueprint}

${L.mapOf(partner)}:
${input.partnerBlueprint}

${L.scoresTitle}:
${scores}

${L.cardsTitle}:
${cards}`;

  return { system: locale === "es" ? SYSTEM_ES : SYSTEM_EN, user };
}

/** Writes the reading for two. Throws AIRefusalError / AIUnavailableError like `complete`. */
export async function generateCompatibilityReading(input: CompatibilityPromptInput): Promise<string> {
  const { system, user } = buildCompatibilityPrompt(input);
  return complete({
    system,
    user,
    model: AI_MODELS.synthesis,
    effort: "medium",
    maxTokens: COMPATIBILITY_MAX_TOKENS,
  });
}

/**
 * Follow-up questions on a finished reading: limits, pricing and the prompt.
 *
 * Keep this module pure (no SDK, Prisma or server-only imports): FollowUpChat, a
 * client component, imports the limits from here. The route calls `complete()`
 * from `@/lib/ai/config` with the prompt built below.
 */

/** Follow-up questions allowed per reading. */
export const FOLLOWUP_LIMIT = 5;
/** How many follow-ups per reading are free (the first one). */
export const FOLLOWUP_FREE_COUNT = 1;
/** Credits charged for each follow-up after the free ones. */
export const FOLLOWUP_COST = 1;
/** Max length of a question, in characters. */
export const FOLLOWUP_QUESTION_MAX_LENGTH = 500;
/** Output budget for an answer (2–3 short paragraphs; thinking counts inside it). */
export const FOLLOWUP_MAX_TOKENS = 1200;

/** Credits the next follow-up costs, given how many the reading already has. */
export function followUpCost(previousCount: number): number {
  return previousCount < FOLLOWUP_FREE_COUNT ? 0 : FOLLOWUP_COST;
}

export interface FollowUpCard {
  position: number;
  positionName: string;
  cardName: string;
  isReversed: boolean;
}

export interface FollowUpContext {
  /** UI locale of the reading ("en" | "es"); the answer follows the question's language. */
  locale: string;
  spreadName: string;
  intention: string;
  cards: FollowUpCard[];
  interpretation: string;
  /** Earlier follow-ups on this reading, oldest first. */
  previous: Array<{ question: string; answer: string }>;
  question: string;
}

const SYSTEM_ES = `Eres la misma guía de tarot que hizo esta lectura: sabia, cálida y honesta. La persona ya recibió su interpretación y ahora te hace una pregunta de seguimiento.

Cómo respondes:
- Sólo a partir de la lectura que ya está hecha: la intención, las cartas que salieron en sus posiciones (y si salieron invertidas), la interpretación original y las preguntas anteriores.
- No sacas cartas nuevas ni hablas de cartas que no salieron en esta tirada.
- No predices el futuro: nada de fechas, plazos ni resultados seguros. El tarot es un espejo, no una bola de cristal; hablas de patrones, posibilidades y de lo que la persona puede hacer.
- No repites la interpretación original: profundizas en lo que te pregunta.
- Si la pregunta no tiene relación con la lectura, lo dices con amabilidad y vuelves a lo que muestran las cartas.
- Nunca predices muertes, enfermedades ni tragedias. No das consejo médico, legal ni financiero; si te lo piden, sugieres con calidez acudir a un profesional.
- Escribe 2 o 3 párrafos breves, sin títulos ni listas.
- Responde en el mismo idioma en el que está escrita la pregunta.`;

const SYSTEM_EN = `You are the same tarot guide who gave this reading: wise, warm and honest. The person already received their interpretation and now asks you a follow-up question.

How you answer:
- Only from the reading that was already done: the intention, the cards that came out in their positions (and whether they were reversed), the original interpretation and the earlier questions.
- You don't draw new cards or talk about cards that didn't come out in this spread.
- You don't predict the future: no dates, timelines or certain outcomes. Tarot is a mirror, not a crystal ball; you speak of patterns, possibilities and what the person can do.
- You don't repeat the original interpretation: you go deeper into what they ask.
- If the question has nothing to do with the reading, say so kindly and bring it back to what the cards show.
- Never predict deaths, illnesses or tragedies. Don't give medical, legal or financial advice; if asked, warmly suggest seeing a professional.
- Write 2 or 3 short paragraphs, without headings or lists.
- Answer in the same language the question is written in.`;

/** System and user prompts for one follow-up answer. */
export function buildFollowUpPrompt(ctx: FollowUpContext): { system: string; user: string } {
  const es = ctx.locale !== "en";
  const labels = es
    ? {
        intention: "Intención original",
        spread: "Tirada",
        cards: "Cartas",
        position: "Posición",
        reversed: "invertida",
        interpretation: "Interpretación original",
        previous: "Preguntas de seguimiento anteriores",
        q: "Pregunta",
        a: "Respuesta",
        question: "Nueva pregunta",
      }
    : {
        intention: "Original intention",
        spread: "Spread",
        cards: "Cards",
        position: "Position",
        reversed: "reversed",
        interpretation: "Original interpretation",
        previous: "Earlier follow-up questions",
        q: "Question",
        a: "Answer",
        question: "New question",
      };

  const cards = [...ctx.cards]
    .sort((a, b) => a.position - b.position)
    .map(
      (card) =>
        `- ${labels.position} ${card.position} · ${card.positionName}: ${card.cardName}${
          card.isReversed ? ` (${labels.reversed})` : ""
        }`
    )
    .join("\n");

  const previous = ctx.previous.length
    ? `\n\n${labels.previous}:\n${ctx.previous
        .map((f) => `${labels.q}: ${f.question.trim()}\n${labels.a}: ${f.answer.trim()}`)
        .join("\n\n")}`
    : "";

  const user = `${labels.intention}: ${ctx.intention.trim()}
${labels.spread}: ${ctx.spreadName}
${labels.cards}:
${cards}

${labels.interpretation}:
${ctx.interpretation.trim()}${previous}

---

${labels.question}:
${ctx.question.trim()}`;

  return { system: es ? SYSTEM_ES : SYSTEM_EN, user };
}

import { prisma } from "@/lib/prisma";
import { INSIGHTS_WINDOW_DAYS, parseReadingCards, parseSpreadPositions, tallyCards } from "@/lib/insights";

/**
 * Reading memory: a short plain-text summary of the person's previous readings
 * that goes into the interpretation prompt as `history` (see §4.2 of the plan).
 */

export const HISTORY_RECENT_READINGS = 8;
export const HISTORY_MAX_CHARS = 1500;
export const HISTORY_INTENTION_MAX = 80;
const RECURRING_TOP = 3;
const RESONANCES_SHOWN = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

type MemoryLocale = "en" | "es";

const LABELS: Record<
  MemoryLocale,
  {
    recentHeader: string;
    reversed: string;
    recurring: string;
    resonanceHeader: string;
    resonanceFirst: (date: string, score: number) => string;
    resonanceNext: (date: string, score: number) => string;
  }
> = {
  es: {
    recentHeader: "Lecturas recientes (de la más nueva a la más antigua):",
    reversed: "inv.",
    recurring: `Cartas recurrentes en los últimos ${INSIGHTS_WINDOW_DAYS} días`,
    resonanceHeader: "Resonancia que la persona reportó",
    resonanceFirst: (date, score) => `la lectura del ${date} resonó ${score}/5`,
    resonanceNext: (date, score) => `la del ${date}, ${score}/5`,
  },
  en: {
    recentHeader: "Recent readings (newest first):",
    reversed: "rev.",
    recurring: `Recurring cards in the last ${INSIGHTS_WINDOW_DAYS} days`,
    resonanceHeader: "Resonance the person reported",
    resonanceFirst: (date, score) => `the reading from ${date} resonated ${score}/5`,
    resonanceNext: (date, score) => `the one from ${date}, ${score}/5`,
  },
};

/** Collapses whitespace and cuts to `max` characters (code points), ending in "…". */
export function truncateText(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const chars = Array.from(clean);
  if (chars.length <= max) return clean;
  return chars.slice(0, Math.max(0, max - 1)).join("").trimEnd() + "…";
}

function shortDate(date: Date, locale: MemoryLocale): string {
  return new Date(date).toLocaleDateString(locale === "en" ? "en-US" : "es-ES", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/**
 * Up to 8 recent readings (short date, spread, intention cut to 80 characters,
 * cards by position with "inv." when reversed), the top 3 recurring cards of
 * the last 90 days and the resonance the person reported. Never longer than
 * 1500 characters: older readings are dropped first. `undefined` when the
 * person has no readings yet.
 */
export async function buildHistoryContext(
  userId: string,
  locale: string,
  now: Date = new Date()
): Promise<string | undefined> {
  const lang: MemoryLocale = locale === "en" ? "en" : "es";
  const labels = LABELS[lang];
  const since = new Date(now.getTime() - INSIGHTS_WINDOW_DAYS * DAY_MS);

  const [recent, windowReadings] = await Promise.all([
    prisma.reading.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: HISTORY_RECENT_READINGS,
      select: {
        id: true,
        createdAt: true,
        intention: true,
        cards: true,
        resonance: true,
        spreadType: { select: { name: true, nameEs: true, positions: true } },
      },
    }),
    prisma.reading.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, cards: true, resonance: true },
    }),
  ]);

  if (recent.length === 0) return undefined;

  const recurring = tallyCards(windowReadings)
    .filter((tally) => tally.count >= 2)
    .slice(0, RECURRING_TOP);

  const cardIds = new Set<string>(recurring.map((tally) => tally.cardId));
  for (const reading of recent) {
    for (const card of parseReadingCards(reading.cards)) cardIds.add(card.cardId);
  }
  const cardRows = await prisma.card.findMany({
    where: { id: { in: [...cardIds] } },
    select: { id: true, name: true, nameEs: true },
  });
  const cardName = new Map(cardRows.map((card) => [card.id, lang === "en" ? card.name : card.nameEs]));

  // One line per reading, newest first
  const readingLines = recent.map((reading) => {
    const spreadName = lang === "en" ? reading.spreadType.name : reading.spreadType.nameEs;
    const positions = parseSpreadPositions(reading.spreadType.positions);
    const cards = parseReadingCards(reading.cards)
      .sort((a, b) => a.position - b.position)
      .map((card) => {
        const name = cardName.get(card.cardId) ?? card.cardId;
        const position = positions.find((p) => p.position === card.position);
        const positionName = position ? (lang === "en" ? position.name : position.nameEs) : "";
        const label = positionName ? `${positionName}: ${name}` : `${card.position}. ${name}`;
        return card.isReversed ? `${label} (${labels.reversed})` : label;
      })
      .join("; ");
    const intention = truncateText(reading.intention, HISTORY_INTENTION_MAX);
    return `- ${shortDate(reading.createdAt, lang)} · ${spreadName} · «${intention}» · ${cards}`;
  });

  // Recurring cards and reported resonance always fit; older readings make room for them.
  const tail: string[] = [];
  if (recurring.length > 0) {
    const list = recurring
      .map((tally) => `${cardName.get(tally.cardId) ?? tally.cardId} ×${tally.count}`)
      .join(", ");
    tail.push(`${labels.recurring}: ${list}.`);
  }

  const seen = new Set<string>();
  const resonances = [...recent, ...windowReadings]
    .filter((reading) => {
      if (reading.resonance === null || reading.resonance === undefined || seen.has(reading.id)) return false;
      seen.add(reading.id);
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, RESONANCES_SHOWN);
  if (resonances.length > 0) {
    const list = resonances
      .map((reading, index) =>
        (index === 0 ? labels.resonanceFirst : labels.resonanceNext)(
          shortDate(reading.createdAt, lang),
          reading.resonance as number
        )
      )
      .join("; ");
    tail.push(`${labels.resonanceHeader}: ${list}.`);
  }

  const tailText = tail.join("\n");
  const tailLength = tailText ? tailText.length + 1 : 0;

  let body = labels.recentHeader;
  for (const line of readingLines) {
    if (body.length + 1 + line.length + tailLength <= HISTORY_MAX_CHARS) {
      body += `\n${line}`;
      continue;
    }
    // Not even the newest reading fits whole: keep a trimmed version of it.
    if (body === labels.recentHeader) {
      const room = HISTORY_MAX_CHARS - body.length - 1 - tailLength;
      if (room > 40) body += `\n${clampLength(line, room)}`;
    }
    break;
  }

  const context = tailText ? `${body}\n${tailText}` : body;
  return clampLength(context, HISTORY_MAX_CHARS);
}

/** Safety net: cuts to `max` UTF-16 units without splitting a character or touching line breaks. */
function clampLength(text: string, max: number): string {
  if (text.length <= max) return text;
  let out = "";
  for (const char of text) {
    if (out.length + char.length > max - 1) break;
    out += char;
  }
  return `${out}…`;
}

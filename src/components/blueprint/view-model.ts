/**
 * Pure helpers for the Arcana Map views (server and client safe: no crypto,
 * no React). Text that is not part of the systems library comes in through
 * a translate function so this file has no i18n dependency.
 */
import { MAJOR_ARCANA, type ArcanaBlueprint, type BirthCards, type Locale } from "@/lib/systems";

export type BlueprintBadgeId = "western" | "chinese" | "tonalli" | "lifePath" | "birthCard";

export interface BlueprintBadge {
  id: BlueprintBadgeId;
  /** Localized system name, for screen readers and tooltips. */
  system: string;
  /** Visible text: "Cáncer", "Caballo de Metal", "Camino de vida 5"… */
  label: string;
  /** Emoji, or a short text mark ("5", "V") when `symbolIsText`. */
  symbol: string;
  symbolIsText: boolean;
}

/** Minimal translate signature; wrap next-intl's `t` as `(key, values) => t(key, values)`. */
export type BlueprintTranslate = (key: string, values?: Record<string, string | number>) => string;

const ROMAN: [number, string][] = [
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

/** Roman numeral of a Major Arcana index (0 stays "0", as on The Fool). */
export function toRoman(n: number): string {
  if (n <= 0) return "0";
  let rest = n;
  let out = "";
  for (const [value, numeral] of ROMAN) {
    while (rest >= value) {
      out += numeral;
      rest -= value;
    }
  }
  return out;
}

export function majorArcanaName(index: number, locale: Locale): string {
  const card = MAJOR_ARCANA[index];
  if (!card) return "";
  return locale === "es" ? card.nameEs : card.name;
}

/**
 * The five badges of the map, in order: ♋ Cáncer · 🐴 Caballo de Metal ·
 * 🐍 12 Cóatl · Camino de vida 5 · El Hierofante (personality card).
 * Keys used: badges.western, badges.chinese, badges.tonalli, badges.lifePath,
 * badges.lifePathValue ({number}), badges.birthCard.
 */
export function getBlueprintBadges(
  bp: ArcanaBlueprint,
  locale: Locale,
  t: BlueprintTranslate
): BlueprintBadge[] {
  const card = bp.birthCards.personality;
  return [
    {
      id: "western",
      system: t("badges.western"),
      label: bp.western.name[locale],
      symbol: bp.western.emoji,
      symbolIsText: false,
    },
    {
      id: "chinese",
      system: t("badges.chinese"),
      label: bp.chinese.label[locale],
      symbol: bp.chinese.emoji,
      symbolIsText: false,
    },
    {
      id: "tonalli",
      system: t("badges.tonalli"),
      label: bp.tonalli.label[locale],
      symbol: bp.tonalli.sign.glyph,
      symbolIsText: false,
    },
    {
      id: "lifePath",
      system: t("badges.lifePath"),
      label: t("badges.lifePathValue", { number: bp.numerology.lifePath }),
      symbol: String(bp.numerology.lifePath),
      symbolIsText: true,
    },
    {
      id: "birthCard",
      system: t("badges.birthCard"),
      label: majorArcanaName(card, locale),
      symbol: toRoman(card),
      symbolIsText: true,
    },
  ];
}

export type BirthCardRole = "personalitySoul" | "personality" | "soul" | "hidden";

/** Which birth cards to show: one card when personality and soul are the same. */
export function getBirthCardRoles(cards: BirthCards): { role: BirthCardRole; index: number }[] {
  const roles: { role: BirthCardRole; index: number }[] =
    cards.personality === cards.soul
      ? [{ role: "personalitySoul", index: cards.personality }]
      : [
          { role: "personality", index: cards.personality },
          { role: "soul", index: cards.soul },
        ];
  if (cards.hidden !== null && !roles.some((r) => r.index === cards.hidden)) {
    roles.push({ role: "hidden", index: cards.hidden });
  }
  return roles;
}

/** "Cuidado, memoria, intuición." → ["Cuidado", "Memoria", "Intuición"] */
export function traitList(traits: string, locale: Locale): string[] {
  return traits
    .replace(/[.。]\s*$/, "")
    .split(/\s*[,;]\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.charAt(0).toLocaleUpperCase(locale) + s.slice(1));
}

/** Birth date as "15 de julio de 1990" / "July 15, 1990", read in UTC. */
export function formatBirthDate(isoDay: string, locale: Locale): string {
  const date = new Date(`${isoDay}T00:00:00.000Z`);
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export interface SynthesisBlock {
  kind: "paragraph" | "question";
  text: string;
}

/** Strips the Markdown the prompt asks the model not to use, if it slips in anyway. */
function cleanLine(line: string): string {
  return line
    .trim()
    .replace(/^#{1,6}\s+/, "")
    .replace(/^(?:[-*•]|\d+[.)])\s+/, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .trim();
}

/**
 * Synthesis text → blocks. Each non-empty line is a block; the run of lines
 * ending in "?" at the end of the text are the closing questions.
 */
export function splitSynthesis(text: string): SynthesisBlock[] {
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const blocks: SynthesisBlock[] = lines.map((line) => ({ kind: "paragraph", text: line }));
  for (let i = blocks.length - 1; i >= 0 && /[?？]$/.test(blocks[i].text); i--) {
    blocks[i].kind = "question";
  }
  return blocks;
}

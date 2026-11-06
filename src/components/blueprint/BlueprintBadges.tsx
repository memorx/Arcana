import { cn } from "@/lib/utils";
import type { BlueprintBadge } from "./view-model";

interface BlueprintBadgesProps {
  badges: BlueprintBadge[];
  /** Accessible name of the list, e.g. "Your five signs". */
  label: string;
  size?: "sm" | "md";
  className?: string;
}

/** U+FE0E: asks for the text (one-ink) form of symbols that also exist as emoji (♋ → ♋︎). */
const TEXTO = "︎";

/**
 * A system's symbol in one ink. Numbers and numerals ("5", "V") are set in
 * Gloock; zodiac signs ask for their text form; the animal and day-sign
 * glyphs only exist as color emoji, so they are printed in grey (only the
 * revealed card is in full color in «Dos tintas»). Decorative: the label next
 * to it carries the data.
 */
export function GlifoSistema({
  symbol,
  isText,
  className,
}: {
  symbol: string;
  isText: boolean;
  className?: string;
}) {
  if (isText) {
    return (
      <span aria-hidden="true" className={cn("font-titulo leading-none", className)}>
        {symbol}
      </span>
    );
  }
  const glifo = symbol.replace(/️/g, "");
  return (
    <span
      aria-hidden="true"
      data-glifo
      className={cn("leading-none grayscale contrast-125 [font-variant-emoji:text]", className)}
    >
      {/^[♈-♓]$/.test(glifo) ? `${glifo}${TEXTO}` : glifo}
    </span>
  );
}

/** Symbol of a badge (kept for its callers): the same one-ink glyph. */
export function BadgeSymbol({ badge, className }: { badge: BlueprintBadge; className?: string }) {
  return <GlifoSistema symbol={badge.symbol} isText={badge.symbolIsText} className={className} />;
}

/**
 * The five signs of the Arcana Map as stamps: data in mono capitals with the
 * system's glyph in a small ring. Server and client safe; on paper or ink
 * (the colors come from the floor).
 */
export function BlueprintBadges({ badges, label, size = "md", className }: BlueprintBadgesProps) {
  return (
    <ul aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {badges.map((badge) => (
        <li
          key={badge.id}
          title={badge.system}
          data-sello={badge.id}
          className={cn(
            "inline-flex max-w-full min-w-0 items-center gap-2 rounded-full border border-filete/45 bg-suelo font-dato leading-[1.3] tracking-[0.1em] text-letra uppercase",
            size === "sm" ? "py-0.5 pr-2.5 pl-0.5 text-[0.625rem]" : "py-1 pr-3.5 pl-1 text-[0.6875rem]"
          )}
        >
          <span
            className={cn(
              "grid shrink-0 place-items-center rounded-full border border-filete/70 tracking-normal",
              size === "sm" ? "size-6 text-[0.8125rem]" : "size-8 text-base"
            )}
          >
            <BadgeSymbol badge={badge} className={badge.symbolIsText ? "text-[0.8125rem]" : undefined} />
          </span>
          <span className="sr-only">{badge.system}: </span>
          <span className="truncate">{badge.label}</span>
        </li>
      ))}
    </ul>
  );
}

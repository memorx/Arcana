import { cn } from "@/lib/utils";
import type { BlueprintBadge, BlueprintBadgeId } from "./view-model";

const ACCENTS: Record<BlueprintBadgeId, string> = {
  western: "border-amber-500/30 bg-amber-500/10 text-amber-100",
  chinese: "border-purple-500/30 bg-purple-500/10 text-purple-100",
  tonalli: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
  lifePath: "border-amber-500/30 bg-amber-500/10 text-amber-100",
  birthCard: "border-purple-500/30 bg-purple-500/10 text-purple-100",
};

interface BlueprintBadgesProps {
  badges: BlueprintBadge[];
  /** Accessible name of the list, e.g. "Your five signs". */
  label: string;
  size?: "sm" | "md";
  className?: string;
}

/** Symbol of a badge: the emoji, or a small medallion for numbers and numerals. */
export function BadgeSymbol({ badge, className }: { badge: BlueprintBadge; className?: string }) {
  if (badge.symbolIsText) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-amber-400/50 px-1 text-[10px] font-semibold leading-none text-amber-300",
          className
        )}
      >
        {badge.symbol}
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={className}>
      {badge.symbol}
    </span>
  );
}

/** The five signs of the Arcana Map as pills (server and client safe). */
export function BlueprintBadges({ badges, label, size = "md", className }: BlueprintBadgesProps) {
  return (
    <ul aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {badges.map((badge) => (
        <li
          key={badge.id}
          title={badge.system}
          className={cn(
            "inline-flex max-w-full items-center gap-1.5 rounded-full border",
            size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
            ACCENTS[badge.id]
          )}
        >
          <BadgeSymbol badge={badge} />
          <span className="sr-only">{badge.system}: </span>
          <span className="truncate">{badge.label}</span>
        </li>
      ))}
    </ul>
  );
}

import { cn } from "@/lib/utils";
import { BadgeSymbol } from "./BlueprintBadges";
import type { BlueprintBadge } from "./view-model";

interface BlueprintConstellationProps {
  badges: BlueprintBadge[];
  /** Shown in the center: the person's initial (or ✦ when there is no name). */
  center: string;
  className?: string;
}

/** Points of a regular pentagon in a 0–100 box, starting at the top. */
const POINTS = Array.from({ length: 5 }, (_, k) => {
  const angle = ((-90 + 72 * k) * Math.PI) / 180;
  return { x: 50 + 38 * Math.cos(angle), y: 50 + 38 * Math.sin(angle) };
});

/**
 * The Mapa Arcano glyph of the home page («Más que tarot»), engraved large:
 * the five systems on a pentagon drawn in ink, joined to the person, who is
 * the one pink mark in the center. Still (no spinning ring). Hidden from
 * assistive tech: the badges list carries the data. Without badges it draws
 * the empty map (the state before the profile exists).
 */
export function BlueprintConstellation({ badges, center, className }: BlueprintConstellationProps) {
  const polygon = POINTS.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");

  return (
    <div aria-hidden="true" className={cn("relative aspect-square w-48 shrink-0 text-letra sm:w-60", className)}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <circle cx="50" cy="50" r="48.5" fill="none" stroke="currentColor" strokeOpacity="0.28" strokeWidth="0.35" />
        <circle
          cx="50"
          cy="50"
          r="45.5"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.5"
          strokeWidth="0.35"
          strokeDasharray="0.4 2.2"
        />
        <polygon points={polygon} fill="none" stroke="currentColor" strokeWidth="0.45" />
        {POINTS.map((p, i) => (
          <line
            key={i}
            x1="50"
            y1="50"
            x2={p.x}
            y2={p.y}
            stroke="currentColor"
            strokeOpacity="0.55"
            strokeWidth="0.35"
          />
        ))}
      </svg>

      {POINTS.map((p, i) => {
        const badge = badges[i];
        return (
          <span
            key={badge?.id ?? i}
            className="absolute flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-filete bg-suelo text-lg sm:size-12 sm:text-xl"
            style={{ left: `${POINTS[i].x}%`, top: `${POINTS[i].y}%` }}
          >
            {badge && <BadgeSymbol badge={badge} />}
          </span>
        );
      })}

      <span className="absolute top-1/2 left-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-rosa font-titulo text-[1.75rem] leading-none text-papel sm:size-16 sm:text-[2rem]">
        {center}
      </span>
    </div>
  );
}

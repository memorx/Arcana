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
 * Decorative figure: the five systems on a pentagon, joined to the person in
 * the center. Hidden from assistive tech (the badges list carries the data).
 */
export function BlueprintConstellation({ badges, center, className }: BlueprintConstellationProps) {
  const polygon = POINTS.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");

  return (
    <div aria-hidden="true" className={cn("relative aspect-square w-44 sm:w-52 shrink-0", className)}>
      <div className="absolute inset-[6%] rounded-full bg-purple-600/10 blur-2xl" />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <linearGradient id="blueprint-constellation-stroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <g className="origin-center motion-safe:animate-[spin_120s_linear_infinite]">
          <circle
            cx="50"
            cy="50"
            r="47"
            fill="none"
            stroke="url(#blueprint-constellation-stroke)"
            strokeOpacity="0.35"
            strokeWidth="0.4"
            strokeDasharray="1 3"
          />
        </g>
        <polygon
          points={polygon}
          fill="none"
          stroke="url(#blueprint-constellation-stroke)"
          strokeOpacity="0.55"
          strokeWidth="0.6"
        />
        {POINTS.map((p, i) => (
          <line
            key={i}
            x1="50"
            y1="50"
            x2={p.x}
            y2={p.y}
            stroke="url(#blueprint-constellation-stroke)"
            strokeOpacity="0.3"
            strokeWidth="0.4"
          />
        ))}
      </svg>

      {badges.slice(0, 5).map((badge, i) => (
        <span
          key={badge.id}
          className="absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-xl shadow-[0_0_18px_rgba(168,85,247,0.25)] sm:h-11 sm:w-11"
          style={{ left: `${POINTS[i].x}%`, top: `${POINTS[i].y}%` }}
        >
          <BadgeSymbol
            badge={badge}
            className={badge.symbolIsText ? "h-7 min-w-7 border-0 text-sm" : undefined}
          />
        </span>
      ))}

      <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-amber-400/40 bg-gradient-to-br from-purple-700/60 to-amber-700/40 text-2xl font-semibold text-amber-100 shadow-[0_0_28px_rgba(245,158,11,0.25)]">
        {center}
      </span>
    </div>
  );
}

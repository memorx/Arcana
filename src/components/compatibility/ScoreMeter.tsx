import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ScoreMeterProps {
  /** System name, e.g. "Zodiaco chino". */
  label: string;
  /** 1–5 */
  score: number;
  /** Spoken label, e.g. "Zodiaco chino: 4 de 5". */
  ariaLabel: string;
  /** Visible score, e.g. "4/5". */
  scoreText: string;
  /** The pair compared (signs, numbers…). */
  detail?: ReactNode;
  summary?: string;
  /** The overall meter stands out. */
  emphasis?: boolean;
  className?: string;
}

const SEGMENTS = [1, 2, 3, 4, 5];

/** A five-segment bar for one system's score. Plain markup: works in server and client components. */
export function ScoreMeter({
  label,
  score,
  ariaLabel,
  scoreText,
  detail,
  summary,
  emphasis = false,
  className,
}: ScoreMeterProps) {
  const value = Math.min(5, Math.max(1, Math.round(score)));

  return (
    <div
      className={cn(
        "rounded-xl border p-4 sm:p-5",
        emphasis
          ? "border-amber-500/40 bg-gradient-to-br from-purple-900/30 to-amber-900/20"
          : "border-slate-800 bg-slate-900/50",
        className
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className={cn("font-semibold text-slate-100", emphasis ? "text-base" : "text-sm")}>{label}</h3>
        <span
          aria-hidden="true"
          className={cn("font-semibold tabular-nums text-amber-300", emphasis ? "text-lg" : "text-sm")}
        >
          {scoreText}
        </span>
      </div>

      {detail && <div className="mt-1 text-sm text-slate-400 break-words">{detail}</div>}

      <div
        role="meter"
        aria-label={ariaLabel}
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={value}
        className="mt-3 grid grid-cols-5 gap-1"
      >
        {SEGMENTS.map((segment) => (
          <div
            key={segment}
            aria-hidden="true"
            data-filled={segment <= value}
            className={cn(
              "rounded-full",
              emphasis ? "h-3" : "h-2",
              segment <= value
                ? "bg-gradient-to-r from-purple-500 to-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.25)]"
                : "bg-slate-800"
            )}
          />
        ))}
      </div>

      {summary && <p className="mt-3 text-sm leading-relaxed text-slate-300">{summary}</p>}
    </div>
  );
}

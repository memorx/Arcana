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

/**
 * One system's score as five printed segments: filled in pink (the second
 * ink, used here as a graphic), empty ones as an ink outline, so the count
 * reads without color. The value is a `meter` (1–5) with its spoken label and
 * the score in mono. Plain markup: works in server and client components, on
 * paper or ink.
 */
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
    <div className={cn("flex h-full flex-col bg-suelo text-letra", emphasis ? "gap-4" : "gap-3", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h3
          className={cn(
            emphasis
              ? "text-[clamp(1.45rem,1.2rem+0.8vw,1.85rem)] leading-[1.1]"
              : "font-dato text-[0.6875rem] leading-[1.4] tracking-[0.12em] text-letra-suave uppercase"
          )}
        >
          {label}
        </h3>
        <span
          aria-hidden="true"
          data-valor
          className={cn(
            "shrink-0 tabular-nums",
            emphasis ? "font-titulo text-[clamp(2.2rem,1.7rem+1.6vw,3rem)] leading-none" : "font-dato text-sm tracking-[0.06em]"
          )}
        >
          {scoreText}
        </span>
      </div>

      {detail && (
        <div
          className={cn(
            "break-words",
            emphasis ? "text-[1.125rem] leading-[1.5] italic" : "font-titulo text-[1.05rem] leading-[1.35]"
          )}
        >
          {detail}
        </div>
      )}

      <div
        role="meter"
        aria-label={ariaLabel}
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={value}
        className={cn("grid grid-cols-5", emphasis ? "gap-1.5" : "gap-1")}
      >
        {SEGMENTS.map((segment) => (
          <div
            key={segment}
            aria-hidden="true"
            data-filled={segment <= value}
            className={cn(
              "rounded-[2px]",
              emphasis ? "h-3.5" : "h-2",
              segment <= value ? "bg-rosa" : "border border-filete/45"
            )}
          />
        ))}
      </div>

      {summary && <p className="text-[0.9875rem] leading-[1.6] text-letra-suave">{summary}</p>}
    </div>
  );
}

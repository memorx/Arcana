import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { INSIGHTS_WINDOW_DAYS, SUIT_KEYS } from "@/lib/insights";
import type { SuitKey } from "@/lib/insights";

interface SuitBarsProps {
  /** Whole percentages that add up to 100 (or all 0). */
  suits: Record<SuitKey, number>;
}

/**
 * Horizontal bars in two inks (pure CSS): the suit that weighs the most in pink, the rest in
 * ink, with visible values and a text summary for screen readers.
 */
export async function SuitBars({ suits }: SuitBarsProps) {
  const t = await getTranslations("insights.suits");
  const total = SUIT_KEYS.reduce((sum, key) => sum + suits[key], 0);

  if (total === 0) {
    return <p className="font-lectura text-letra-suave">{t("empty", { days: INSIGHTS_WINDOW_DAYS })}</p>;
  }

  const summary = SUIT_KEYS.map((key) => `${t(`names.${key}`)} ${suits[key]}%`).join(", ");
  const max = Math.max(...SUIT_KEYS.map((key) => suits[key]));

  return (
    <div role="img" aria-label={t("chartLabel", { values: summary })} className="space-y-5">
      {SUIT_KEYS.map((key) => (
        <div key={key}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="font-titulo text-lg leading-tight text-letra">{t(`names.${key}`)}</span>
            <span className="font-dato text-sm tabular-nums text-letra">{suits[key]}%</span>
          </div>
          <div className="h-2 bg-letra/10">
            <div
              className={cn("h-full", suits[key] === max ? "bg-rosa" : "bg-letra")}
              style={{ width: `${suits[key]}%` }}
            />
          </div>
          <p className="mt-1.5 font-lectura text-[0.9375rem] leading-snug text-letra-suave">{t(`hints.${key}`)}</p>
        </div>
      ))}
    </div>
  );
}

import { getTranslations } from "next-intl/server";
import { INSIGHTS_WINDOW_DAYS, SUIT_KEYS, type SuitKey } from "@/lib/insights";

const SUIT_STYLE: Record<SuitKey, { emoji: string; bar: string }> = {
  MAJOR: { emoji: "✦", bar: "from-purple-600 to-fuchsia-400" },
  WANDS: { emoji: "🔥", bar: "from-orange-600 to-amber-400" },
  CUPS: { emoji: "💧", bar: "from-sky-600 to-cyan-400" },
  SWORDS: { emoji: "⚔️", bar: "from-slate-500 to-indigo-300" },
  PENTACLES: { emoji: "🪙", bar: "from-emerald-600 to-lime-400" },
};

interface SuitBarsProps {
  /** Whole percentages that add up to 100 (or all 0). */
  suits: Record<SuitKey, number>;
}

/** Horizontal bars, pure CSS, with visible labels and a text summary for screen readers. */
export async function SuitBars({ suits }: SuitBarsProps) {
  const t = await getTranslations("insights.suits");
  const total = SUIT_KEYS.reduce((sum, key) => sum + suits[key], 0);

  if (total === 0) {
    return <p className="text-slate-400">{t("empty", { days: INSIGHTS_WINDOW_DAYS })}</p>;
  }

  const summary = SUIT_KEYS.map((key) => `${t(`names.${key}`)} ${suits[key]}%`).join(", ");

  return (
    <div role="img" aria-label={t("chartLabel", { values: summary })} className="space-y-4">
      {SUIT_KEYS.map((key) => (
        <div key={key}>
          <div className="flex items-baseline justify-between gap-3 text-sm mb-1.5">
            <span className="text-slate-200 font-medium">
              <span aria-hidden="true" className="mr-1.5">
                {SUIT_STYLE[key].emoji}
              </span>
              {t(`names.${key}`)}
            </span>
            <span className="text-slate-100 font-semibold tabular-nums">{suits[key]}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${SUIT_STYLE[key].bar}`}
              style={{ width: `${suits[key]}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">{t(`hints.${key}`)}</p>
        </div>
      ))}
    </div>
  );
}

import { getLocale, getTranslations } from "next-intl/server";
import type { MonthCount } from "@/lib/insights";

interface MonthBarsProps {
  /** Oldest first; the last one is the current month. */
  months: MonthCount[];
}

/** Twelve vertical bars (readings per month), pure CSS, labelled for screen readers. */
export async function MonthBars({ months }: MonthBarsProps) {
  const t = await getTranslations("insights.months");
  const locale = await getLocale();
  const intlLocale = locale === "en" ? "en-US" : "es-ES";
  const shortMonth = new Intl.DateTimeFormat(intlLocale, { month: "short", timeZone: "UTC" });
  const longMonth = new Intl.DateTimeFormat(intlLocale, { month: "long", year: "numeric", timeZone: "UTC" });

  const max = Math.max(1, ...months.map((m) => m.count));
  const bars = months.map((m, index) => {
    const date = new Date(Date.UTC(m.year, m.month - 1, 1));
    return {
      key: `${m.year}-${m.month}`,
      count: m.count,
      short: shortMonth.format(date).replace(".", ""),
      long: longMonth.format(date),
      // A month with readings always shows a visible bar
      height: m.count > 0 ? Math.max(8, Math.round((m.count * 100) / max)) : 0,
      isCurrent: index === months.length - 1,
    };
  });
  const summary = bars.map((bar) => `${bar.long}: ${bar.count}`).join(", ");

  return (
    <div role="img" aria-label={t("chartLabel", { values: summary })}>
      <div className="flex items-stretch gap-1 sm:gap-2 h-36">
        {bars.map((bar) => (
          <div key={bar.key} className="flex-1 min-w-0 flex flex-col items-center">
            <span className="h-4 text-[10px] sm:text-xs leading-4 tabular-nums text-slate-300">
              {bar.count > 0 ? bar.count : ""}
            </span>
            <div className="flex-1 w-full flex items-end">
              <div
                className={`w-full rounded-t-md ${
                  bar.count === 0
                    ? "bg-slate-800"
                    : bar.isCurrent
                      ? "bg-gradient-to-t from-amber-600 to-amber-400"
                      : "bg-gradient-to-t from-purple-700 to-purple-400"
                }`}
                style={{ height: bar.count > 0 ? `${bar.height}%` : "3px" }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1 sm:gap-2 mt-2 border-t border-slate-800 pt-2">
        {bars.map((bar) => (
          <span
            key={bar.key}
            className={`flex-1 min-w-0 text-center text-[10px] sm:text-xs capitalize truncate ${
              bar.isCurrent ? "text-amber-300 font-medium" : "text-slate-500"
            }`}
          >
            {bar.short}
          </span>
        ))}
      </div>
    </div>
  );
}

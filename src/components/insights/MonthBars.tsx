import { getLocale, getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import type { MonthCount } from "@/lib/insights";

interface MonthBarsProps {
  /** Oldest first; the last one is the current month. */
  months: MonthCount[];
}

/**
 * Twelve vertical bars (readings per month) in two inks, pure CSS: past months in ink, the
 * current one in pink, empty months as a hairline. Labelled for screen readers.
 */
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
      short: shortMonth.format(date).replace(".", "").slice(0, 3),
      long: longMonth.format(date),
      // A month with readings always shows a visible bar
      height: m.count > 0 ? Math.max(8, Math.round((m.count * 100) / max)) : 0,
      isCurrent: index === months.length - 1,
    };
  });
  const summary = bars.map((bar) => `${bar.long}: ${bar.count}`).join(", ");

  return (
    <div role="img" aria-label={t("chartLabel", { values: summary })}>
      <div className="flex h-40 items-stretch gap-1 border-b border-filete sm:gap-2">
        {bars.map((bar) => (
          <div key={bar.key} className="flex min-w-0 flex-1 flex-col items-center">
            <span className="h-5 font-dato text-[0.625rem] leading-5 tabular-nums text-letra sm:text-xs">
              {bar.count > 0 ? bar.count : ""}
            </span>
            <div className="flex w-full flex-1 items-end">
              <div
                className={cn("w-full", bar.count === 0 ? "bg-letra/15" : bar.isCurrent ? "bg-rosa" : "bg-letra")}
                style={{ height: bar.count > 0 ? `${bar.height}%` : "3px" }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1 sm:gap-2">
        {bars.map((bar) => (
          <span
            key={bar.key}
            className={cn(
              "min-w-0 flex-1 truncate text-center font-dato text-[0.5625rem] uppercase tracking-[0.02em] sm:text-[0.625rem]",
              bar.isCurrent ? "text-letra-acento" : "text-letra-suave"
            )}
          >
            {bar.short}
          </span>
        ))}
      </div>
    </div>
  );
}

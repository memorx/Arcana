import { getLocale, getTranslations } from "next-intl/server";

interface ResonanceSummaryProps {
  resonance: { count: number; average: number | null };
}

/** Average resonance (1–5) of the readings the person rated. */
export async function ResonanceSummary({ resonance }: ResonanceSummaryProps) {
  const t = await getTranslations("insights.resonance");
  const locale = await getLocale();

  if (resonance.count === 0 || resonance.average === null) {
    return <p className="text-slate-400">{t("empty")}</p>;
  }

  const average = new Intl.NumberFormat(locale === "en" ? "en-US" : "es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(resonance.average);
  const percent = Math.min(100, Math.max(0, (resonance.average / 5) * 100));

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
      <p className="text-4xl font-bold text-amber-300 tabular-nums">
        {average}
        <span className="text-lg font-medium text-slate-400">/5</span>
      </p>
      <div className="flex-1">
        <div
          role="img"
          aria-label={t("chartLabel", { average })}
          className="h-3 rounded-full bg-slate-800 overflow-hidden"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-amber-400"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-sm text-slate-400 mt-2">{t("basedOn", { count: resonance.count })}</p>
      </div>
    </div>
  );
}

import { getLocale, getTranslations } from "next-intl/server";

interface ResonanceSummaryProps {
  resonance: { count: number; average: number | null };
}

/** Average resonance (1–5) of the readings the person rated: the figure in Martian Mono (data) and a bar in two inks. */
export async function ResonanceSummary({ resonance }: ResonanceSummaryProps) {
  const t = await getTranslations("insights.resonance");
  const locale = await getLocale();

  if (resonance.count === 0 || resonance.average === null) {
    return <p className="max-w-[60ch] font-lectura text-letra-suave">{t("empty")}</p>;
  }

  const average = new Intl.NumberFormat(locale === "en" ? "en-US" : "es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(resonance.average);
  const percent = Math.min(100, Math.max(0, (resonance.average / 5) * 100));

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-10">
      <p className="font-dato text-[3.5rem] leading-none tracking-[-0.04em] text-letra tabular-nums">
        {average}
        <span className="ml-1 font-dato text-base text-letra-suave">/5</span>
      </p>
      <div className="min-w-0 flex-1">
        <div role="img" aria-label={t("chartLabel", { average })} className="h-2 bg-letra/10">
          <div className="h-full bg-rosa" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 font-dato text-[0.6875rem] uppercase tracking-[0.1em] text-letra-suave">
          {t("basedOn", { count: resonance.count })}
        </p>
      </div>
    </div>
  );
}

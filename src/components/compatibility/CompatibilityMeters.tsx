import { useTranslations } from "next-intl";
import type { CompatibilityResult } from "@/lib/compatibility";
import type { Locale } from "@/lib/systems";
import { ScoreMeter } from "./ScoreMeter";

interface CompatibilityMetersProps {
  systems: CompatibilityResult;
  locale: Locale;
}

/** Five meters: overall first, then western, Chinese, numerology and tonalpohualli. */
export function CompatibilityMeters({ systems, locale }: CompatibilityMetersProps) {
  const t = useTranslations("compatibility");
  const { western, chinese, numerology, tonalli } = systems;

  const meter = (key: "western" | "chinese" | "numerology" | "tonalli" | "overall", score: number) => ({
    label: t(`systems.${key}`),
    score,
    scoreText: t("scoreOutOf", { score }),
    ariaLabel: t("meterAria", { system: t(`systems.${key}`), score }),
  });

  return (
    <div className="space-y-4">
      <ScoreMeter
        {...meter("overall", systems.overall)}
        emphasis
        detail={<span className="text-amber-200/90">{systems.overallLabel[locale]}</span>}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <ScoreMeter
          {...meter("western", western.score)}
          detail={
            <>
              <span aria-hidden="true">{western.a.emoji} </span>
              {western.a.name[locale]} ({western.a.elementName[locale]}) ·{" "}
              <span aria-hidden="true">{western.b.emoji} </span>
              {western.b.name[locale]} ({western.b.elementName[locale]})
            </>
          }
          summary={western.summary[locale]}
        />
        <ScoreMeter
          {...meter("chinese", chinese.score)}
          detail={
            <>
              <span aria-hidden="true">{chinese.a.emoji} </span>
              {chinese.a.label[locale]} · <span aria-hidden="true">{chinese.b.emoji} </span>
              {chinese.b.label[locale]}
            </>
          }
          summary={chinese.summary[locale]}
        />
        <ScoreMeter
          {...meter("numerology", numerology.score)}
          detail={
            <>
              <span className="block">
                {t("numerology.lifePaths", { a: numerology.a, b: numerology.b })}
                {numerology.names && <> · {t("numerology.names", { a: numerology.names.a, b: numerology.names.b })}</>}
              </span>
              <span className="block text-purple-300">
                {t("numerology.bondNumber", {
                  number: numerology.relationshipNumber,
                  name: numerology.relationshipName[locale],
                })}
              </span>
            </>
          }
          summary={numerology.summary[locale]}
        />
        <ScoreMeter
          {...meter("tonalli", tonalli.score)}
          detail={
            <>
              <span aria-hidden="true">{tonalli.a.glyph} </span>
              {tonalli.a.label[locale]} · <span aria-hidden="true">{tonalli.b.glyph} </span>
              {tonalli.b.label[locale]}
            </>
          }
          summary={tonalli.summary[locale]}
        />
      </div>
    </div>
  );
}

import { useTranslations } from "next-intl";
import type { CompatibilityResult } from "@/lib/compatibility";
import type { Locale } from "@/lib/systems";
import { GlifoSistema } from "@/components/blueprint/BlueprintBadges";
import { ScoreMeter } from "./ScoreMeter";

interface CompatibilityMetersProps {
  systems: CompatibilityResult;
  locale: Locale;
}

/**
 * Five meters: the overall one as the head of the sheet, then western,
 * Chinese, numerology and tonalpohualli as four ruled plates (two by two from
 * 640 px). Glyphs in one ink; the pair compared in Gloock.
 */
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
    <div className="border-y border-filete">
      <ScoreMeter
        {...meter("overall", systems.overall)}
        emphasis
        detail={<span>{systems.overallLabel[locale]}</span>}
        className="py-6 sm:py-8"
      />

      <div data-laminas className="grid gap-px border-t border-filete bg-filete/25 sm:grid-cols-2">
        <ScoreMeter
          {...meter("western", western.score)}
          className="p-5 sm:p-6"
          detail={
            <>
              <GlifoSistema symbol={western.a.emoji} isText={false} className="mr-1.5 text-[0.95em]" />
              {western.a.name[locale]} ({western.a.elementName[locale]}) ·{" "}
              <GlifoSistema symbol={western.b.emoji} isText={false} className="mr-1.5 text-[0.95em]" />
              {western.b.name[locale]} ({western.b.elementName[locale]})
            </>
          }
          summary={western.summary[locale]}
        />
        <ScoreMeter
          {...meter("chinese", chinese.score)}
          className="p-5 sm:p-6"
          detail={
            <>
              <GlifoSistema symbol={chinese.a.emoji} isText={false} className="mr-1.5 text-[0.95em]" />
              {chinese.a.label[locale]} ·{" "}
              <GlifoSistema symbol={chinese.b.emoji} isText={false} className="mr-1.5 text-[0.95em]" />
              {chinese.b.label[locale]}
            </>
          }
          summary={chinese.summary[locale]}
        />
        <ScoreMeter
          {...meter("numerology", numerology.score)}
          className="p-5 sm:p-6"
          detail={
            <>
              <span className="block">
                {t("numerology.lifePaths", { a: numerology.a, b: numerology.b })}
                {numerology.names && <> · {t("numerology.names", { a: numerology.names.a, b: numerology.names.b })}</>}
              </span>
              <span className="mt-1 block font-dato text-[0.6875rem] leading-[1.5] tracking-[0.08em] text-letra-acento uppercase">
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
          className="p-5 sm:p-6"
          detail={
            <>
              <GlifoSistema symbol={tonalli.a.glyph} isText={false} className="mr-1.5 text-[0.95em]" />
              {tonalli.a.label[locale]} ·{" "}
              <GlifoSistema symbol={tonalli.b.glyph} isText={false} className="mr-1.5 text-[0.95em]" />
              {tonalli.b.label[locale]}
            </>
          }
          summary={tonalli.summary[locale]}
        />
      </div>
    </div>
  );
}

import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import {
  getAchievementStats,
  getRecentAchievements,
  getClosestAchievement,
} from "@/lib/achievements";
import { Barra } from "./Barra";
import { CIFRA, ENLACE_DATO, ROTULO, TITULO_CELDA } from "./estilos";

interface AchievementsWidgetProps {
  userId: string;
}

export async function AchievementsWidget({ userId }: AchievementsWidgetProps) {
  const t = await getTranslations("achievements");
  const locale = await getLocale();

  const [stats, recent, closest] = await Promise.all([
    getAchievementStats(userId),
    getRecentAchievements(userId, 1),
    getClosestAchievement(userId),
  ]);

  const latestAchievement = recent[0];

  const getLocalizedName = (item: { name: string; nameEs: string }) => {
    return locale === "en" ? item.name : item.nameEs;
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 className={TITULO_CELDA}>{t("title")}</h2>
        <Link href="/achievements" className={ENLACE_DATO}>
          {t("viewAll")} <span aria-hidden="true">→</span>
        </Link>
      </div>

      <p className="flex flex-wrap items-baseline gap-x-3">
        <span className={CIFRA}>
          {stats.unlocked}/{stats.total}
        </span>
        <span className={ROTULO}>{stats.percentage}%</span>
      </p>
      <Barra valor={stats.percentage} etiqueta={`${t("title")}: ${stats.percentage}%`} />

      <dl className="space-y-2 text-[0.9375rem] leading-snug">
        {latestAchievement && (
          <div className="flex flex-wrap items-baseline gap-x-2">
            <dt className={ROTULO}>{t("latest")}</dt>
            <dd className="min-w-0 text-letra">{getLocalizedName(latestAchievement)}</dd>
          </div>
        )}

        {closest && (
          <div className="flex flex-wrap items-baseline gap-x-2">
            <dt className={ROTULO}>{t("next")}</dt>
            <dd className="min-w-0 text-letra-suave">
              {getLocalizedName(closest)}{" "}
              <span className="font-dato text-xs tabular-nums">
                ({closest.progress}/{closest.requirement})
              </span>
            </dd>
          </div>
        )}
      </dl>

      {!closest && stats.unlocked === stats.total && (
        <p className="font-lectura text-letra-acento">{t("allCompleted")}</p>
      )}
    </div>
  );
}

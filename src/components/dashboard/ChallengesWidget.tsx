import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import {
  getClosestChallenges,
  getChallengeStats,
  getTimeUntilReset,
} from "@/lib/challenges";
import { Barra } from "./Barra";
import { CIFRA, ENLACE_DATO, ROTULO, TITULO_CELDA } from "./estilos";

interface ChallengesWidgetProps {
  userId: string;
}

export async function ChallengesWidget({ userId }: ChallengesWidgetProps) {
  const t = await getTranslations("challenges");
  const locale = await getLocale();

  const [closest, stats] = await Promise.all([
    getClosestChallenges(userId, 3),
    getChallengeStats(userId),
  ]);

  const weeklyReset = getTimeUntilReset("weekly");

  const totalCompleted = stats.weekly.completed + stats.monthly.completed;
  const totalChallenges = stats.weekly.total + stats.monthly.total;
  const percentage = totalChallenges > 0 ? Math.round((totalCompleted / totalChallenges) * 100) : 0;

  const getLocalizedName = (item: { name: string; nameEs: string }) => {
    return locale === "en" ? item.name : item.nameEs;
  };

  const formatResetTime = (reset: { days: number; hours: number; minutes: number }) => {
    if (reset.days > 0) {
      return `${reset.days}d ${reset.hours}h`;
    }
    if (reset.hours > 0) {
      return `${reset.hours}h ${reset.minutes}m`;
    }
    return `${reset.minutes}m`;
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 className={TITULO_CELDA}>{t("title")}</h2>
        <Link href="/challenges" className={ENLACE_DATO}>
          {t("viewAll")} <span aria-hidden="true">→</span>
        </Link>
      </div>

      <p className="flex flex-wrap items-baseline gap-x-3">
        <span className={CIFRA}>
          {totalCompleted}/{totalChallenges}
        </span>
        <span className={ROTULO}>{t("resetsIn", { time: formatResetTime(weeklyReset) })}</span>
      </p>
      <Barra valor={percentage} etiqueta={`${t("title")}: ${percentage}%`} />

      {closest.length > 0 ? (
        <ul className="divide-y divide-filete/15">
          {closest.map((challenge) => {
            const progressPercent = Math.min((challenge.progress / challenge.target) * 100, 100);
            const name = getLocalizedName(challenge);

            return (
              <li key={challenge.id} className="py-2.5 first:pt-0">
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="min-w-0 text-[0.9375rem] leading-snug text-letra">{name}</span>
                  <span className="shrink-0 font-dato text-xs tabular-nums text-letra-suave">
                    {challenge.progress}/{challenge.target}
                  </span>
                </div>
                <Barra valor={progressPercent} etiqueta={`${name}: ${challenge.progress}/${challenge.target}`} acento />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="font-lectura text-letra-acento">{t("allCompleted")}</p>
      )}
    </div>
  );
}

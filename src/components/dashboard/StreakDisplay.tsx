"use client";

import { useTranslations } from "next-intl";
import { getMilestoneProgress } from "@/lib/streak-utils";
import { Barra } from "./Barra";

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
}

const ROTULO = "font-dato text-[0.6875rem] uppercase leading-[1.4] tracking-[0.12em] text-letra-suave";

/** La racha de días: el número en Martian Mono (es un dato) y la barra hasta la próxima recompensa. Nada a los 0 días. */
export function StreakDisplay({ currentStreak, longestStreak }: StreakDisplayProps) {
  const t = useTranslations("dashboard");
  const tReward = useTranslations("streakReward");

  if (currentStreak === 0) {
    return null;
  }

  const { progress, nextMilestone } = getMilestoneProgress(currentStreak);

  return (
    <div className="space-y-3">
      <p className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-dato text-[2.5rem] leading-none tracking-[-0.04em] text-letra tabular-nums">{currentStreak}</span>
        <span className="font-lectura text-letra-suave">{t("streak.days")}</span>
      </p>
      {longestStreak > currentStreak && <p className={ROTULO}>{t("streak.best", { count: longestStreak })}</p>}

      {/* Progress bar to next milestone */}
      {nextMilestone && (
        <div className="space-y-1.5">
          <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[0.9375rem] leading-snug">
            <span className="text-letra">{tReward("nextMilestone", { days: nextMilestone.days })}</span>
            <span className="font-dato text-xs text-letra-acento">
              {t("streakReward", { count: nextMilestone.credits })}
            </span>
          </p>
          <Barra valor={progress} etiqueta={tReward("nextMilestone", { days: nextMilestone.days })} acento />
          <p aria-hidden="true" className="flex justify-between font-dato text-[0.6875rem] tabular-nums text-letra-suave">
            <span>{currentStreak}</span>
            <span>{nextMilestone.days}</span>
          </p>
        </div>
      )}

      {/* All milestones completed */}
      {!nextMilestone && <p className="font-lectura text-letra-acento">{tReward("allCompleted")}</p>}
    </div>
  );
}

// Compact version for showing in other places
export function StreakBadge({ currentStreak }: { currentStreak: number }) {
  const t = useTranslations("dashboard");

  if (currentStreak === 0) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-letra-acento/50 px-2.5 py-0.5 font-dato text-[0.6875rem] uppercase tracking-[0.1em] text-letra-acento">
      <span aria-hidden="true" className="inline-block size-[0.55em] rounded-full bg-rosa" />
      {currentStreak} {t("streak.days")}
    </span>
  );
}

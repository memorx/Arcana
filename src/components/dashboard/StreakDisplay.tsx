"use client";

import { useTranslations } from "next-intl";
import { getMilestoneProgress } from "@/lib/streak-utils";

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
}

export function StreakDisplay({ currentStreak, longestStreak }: StreakDisplayProps) {
  const t = useTranslations("dashboard");
  const tReward = useTranslations("streakReward");

  if (currentStreak === 0) {
    return null;
  }

  const { progress, nextMilestone } = getMilestoneProgress(currentStreak);

  const getStreakEmoji = (streak: number) => {
    if (streak >= 100) return "&#127942;"; // Trophy
    if (streak >= 30) return "&#128293;"; // Fire
    if (streak >= 7) return "&#128293;"; // Fire
    return "&#10024;"; // Sparkles
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 100) return "text-yellow-400";
    if (streak >= 30) return "text-orange-400";
    if (streak >= 7) return "text-amber-400";
    return "text-purple-400";
  };

  const getProgressBarColor = (streak: number) => {
    if (streak >= 100) return "bg-yellow-500";
    if (streak >= 30) return "bg-orange-500";
    if (streak >= 7) return "bg-amber-500";
    return "bg-purple-500";
  };

  return (
    <div className="px-4 py-4 bg-gradient-to-r from-slate-800/50 to-slate-800/30 rounded-xl border border-slate-700/50">
      <div className="flex items-center gap-3 mb-3">
        <span
          className={`text-2xl ${getStreakColor(currentStreak)}`}
          dangerouslySetInnerHTML={{ __html: getStreakEmoji(currentStreak) }}
        />
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className={`text-xl font-bold ${getStreakColor(currentStreak)}`}>
              {currentStreak}
            </span>
            <span className="text-sm text-slate-400">
              {t("streak.days")}
            </span>
          </div>
          {longestStreak > currentStreak && (
            <p className="text-xs text-slate-500">
              {t("streak.best", { count: longestStreak })}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar to next milestone */}
      {nextMilestone && (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">
              {tReward("nextMilestone", { days: nextMilestone.days })}
            </span>
            <span className="text-slate-500">
              +{nextMilestone.credits} {t("creditPlural")}
            </span>
          </div>
          <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressBarColor(currentStreak)} transition-all duration-500 rounded-full`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>{currentStreak}</span>
            <span>{nextMilestone.days}</span>
          </div>
        </div>
      )}

      {/* All milestones completed */}
      {!nextMilestone && (
        <div className="text-center py-2">
          <span className="text-yellow-400 text-sm font-medium">
            {tReward("allCompleted")}
          </span>
        </div>
      )}
    </div>
  );
}

// Compact version for showing in other places
export function StreakBadge({ currentStreak }: { currentStreak: number }) {
  const t = useTranslations("dashboard");

  if (currentStreak === 0) {
    return null;
  }

  const getStreakColor = (streak: number) => {
    if (streak >= 100) return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
    if (streak >= 30) return "text-orange-400 border-orange-500/30 bg-orange-500/10";
    if (streak >= 7) return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    return "text-purple-400 border-purple-500/30 bg-purple-500/10";
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStreakColor(currentStreak)}`}>
      <span>&#128293;</span>
      {currentStreak} {t("streak.days")}
    </span>
  );
}

"use client";

import { useTranslations } from "next-intl";

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
}

export function StreakDisplay({ currentStreak, longestStreak }: StreakDisplayProps) {
  const t = useTranslations("dashboard");

  if (currentStreak === 0) {
    return null;
  }

  const getStreakEmoji = (streak: number) => {
    if (streak >= 30) return "&#128293;"; // Fire x3
    if (streak >= 7) return "&#128293;"; // Fire
    return "&#10024;"; // Sparkles
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return "text-orange-400";
    if (streak >= 7) return "text-amber-400";
    return "text-purple-400";
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-slate-800/50 to-slate-800/30 rounded-xl border border-slate-700/50">
      <span
        className={`text-2xl ${getStreakColor(currentStreak)}`}
        dangerouslySetInnerHTML={{ __html: getStreakEmoji(currentStreak) }}
      />
      <div>
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
  );
}

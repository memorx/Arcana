import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { Card, CardContent, Button } from "@/components/ui";
import {
  getAchievementStats,
  getRecentAchievements,
  getClosestAchievement,
} from "@/lib/achievements";

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
    <Card className="bg-gradient-to-r from-amber-900/20 to-yellow-900/20 border-amber-500/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <div>
              <h3 className="font-medium text-slate-100">{t("title")}</h3>
              <p className="text-sm text-slate-400">
                {stats.unlocked}/{stats.total} ({stats.percentage}%)
              </p>
            </div>
          </div>
          <Link href="/achievements">
            <Button variant="secondary" size="sm">{t("viewAll")}</Button>
          </Link>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 transition-all duration-500"
            style={{ width: `${stats.percentage}%` }}
          />
        </div>

        <div className="space-y-2">
          {/* Latest Achievement */}
          {latestAchievement && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-amber-400">{t("latest")}:</span>
              <span>{latestAchievement.icon}</span>
              <span className="text-slate-300 truncate">
                {getLocalizedName(latestAchievement)}
              </span>
            </div>
          )}

          {/* Closest to Unlock */}
          {closest && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">{t("next")}:</span>
              <span className="opacity-50">{closest.icon}</span>
              <span className="text-slate-400 truncate">
                {getLocalizedName(closest)}
              </span>
              <span className="text-slate-500 text-xs">
                ({closest.progress}/{closest.requirement})
              </span>
            </div>
          )}

          {/* All completed */}
          {!closest && stats.unlocked === stats.total && (
            <p className="text-amber-400 text-sm text-center">
              {t("allCompleted")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

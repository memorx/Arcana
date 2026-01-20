import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { Card, CardContent, Button } from "@/components/ui";
import {
  getClosestChallenges,
  getChallengeStats,
  getTimeUntilReset,
} from "@/lib/challenges";

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
    <Card className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-500/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <div>
              <h3 className="font-medium text-slate-100">{t("title")}</h3>
              <p className="text-sm text-slate-400">
                {totalCompleted}/{totalChallenges} ({percentage}%)
              </p>
            </div>
          </div>
          <Link href="/challenges">
            <Button variant="secondary" size="sm">{t("viewAll")}</Button>
          </Link>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Reset Timer */}
        <div className="text-xs text-slate-500 mb-3">
          {t("resetsIn", { time: formatResetTime(weeklyReset) })}
        </div>

        <div className="space-y-2">
          {/* Closest Challenges */}
          {closest.length > 0 ? (
            closest.map((challenge) => {
              const progressPercent = Math.min(
                (challenge.progress / challenge.target) * 100,
                100
              );

              return (
                <div key={challenge.id} className="flex items-center gap-2">
                  <span className="text-lg">{challenge.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300 truncate">
                        {getLocalizedName(challenge)}
                      </span>
                      <span className="text-xs text-slate-500 flex-shrink-0 ml-2">
                        {challenge.progress}/{challenge.target}
                      </span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-purple-400 text-sm text-center">
              {t("allCompleted")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui";

interface Achievement {
  id: string;
  key: string;
  name: string;
  nameEs: string;
  description: string;
  descriptionEs: string;
  icon: string;
  category: string;
  requirement: number;
  creditReward: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
  progress: number;
}

interface AchievementStats {
  unlocked: number;
  total: number;
  percentage: number;
}

const CATEGORY_ORDER = ["readings", "collection", "streak", "time", "subscription"];

export default function AchievementsPage() {
  const t = useTranslations("achievements");
  const locale = useLocale();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/achievements")
      .then((res) => res.json())
      .then((data) => {
        setAchievements(data.achievements);
        setStats(data.stats);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "readings": return t("categories.readings");
      case "collection": return t("categories.collection");
      case "streak": return t("categories.streak");
      case "time": return t("categories.time");
      case "subscription": return t("categories.subscription");
      default: return category;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "readings": return "📖";
      case "collection": return "🃏";
      case "streak": return "🔥";
      case "time": return "⏰";
      case "subscription": return "☀️";
      default: return "🏆";
    }
  };

  const getLocalizedName = (achievement: Achievement) => {
    return locale === "en" ? achievement.name : achievement.nameEs;
  };

  const getLocalizedDescription = (achievement: Achievement) => {
    return locale === "en" ? achievement.description : achievement.descriptionEs;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      locale === "en" ? "en-US" : "es-ES",
      { day: "numeric", month: "short", year: "numeric" }
    );
  };

  // Group achievements by category
  const groupedAchievements = CATEGORY_ORDER.reduce((acc, category) => {
    const categoryAchievements = achievements.filter((a) => a.category === category);
    if (categoryAchievements.length > 0) {
      acc[category] = categoryAchievements;
    }
    return acc;
  }, {} as Record<string, Achievement[]>);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">
          <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 bg-clip-text text-transparent">
            {t("title")}
          </span>
        </h1>

        {stats && (
          <div className="max-w-sm mx-auto">
            <p className="text-slate-400 mb-3">
              {t("progress", { unlocked: stats.unlocked, total: stats.total })}
            </p>
            <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 transition-all duration-500"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
            <p className="text-2xl font-bold text-amber-400 mt-2">
              {stats.percentage}%
            </p>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Achievements by Category */}
      {!loading && (
        <div className="space-y-8">
          {Object.entries(groupedAchievements).map(([category, categoryAchievements]) => (
            <section key={category}>
              <h2 className="text-xl font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <span>{getCategoryIcon(category)}</span>
                {getCategoryLabel(category)}
              </h2>

              <div className="grid gap-4">
                {categoryAchievements.map((achievement) => (
                  <Card
                    key={achievement.id}
                    className={`transition-all ${
                      achievement.isUnlocked
                        ? "ring-2 ring-amber-500/50 bg-gradient-to-r from-amber-900/20 to-yellow-900/10"
                        : "opacity-60"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div
                          className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${
                            achievement.isUnlocked
                              ? "bg-gradient-to-br from-amber-500 to-yellow-600"
                              : "bg-slate-800 grayscale"
                          }`}
                        >
                          {achievement.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className={`font-semibold ${
                                achievement.isUnlocked ? "text-slate-100" : "text-slate-400"
                              }`}>
                                {getLocalizedName(achievement)}
                              </h3>
                              <p className="text-sm text-slate-500">
                                {getLocalizedDescription(achievement)}
                              </p>
                            </div>

                            {/* Reward Badge */}
                            <span className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium ${
                              achievement.isUnlocked
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-slate-800 text-slate-500"
                            }`}>
                              +{achievement.creditReward} {t("credits")}
                            </span>
                          </div>

                          {/* Progress or Unlock Date */}
                          <div className="mt-2">
                            {achievement.isUnlocked ? (
                              <p className="text-xs text-emerald-400 flex items-center gap-1">
                                <span>&#10003;</span>
                                {t("unlocked")} {achievement.unlockedAt && `- ${formatDate(achievement.unlockedAt)}`}
                              </p>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs text-slate-500">
                                  <span>{t("locked")}</span>
                                  <span>
                                    {achievement.progress}/{achievement.requirement}
                                  </span>
                                </div>
                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-slate-600 transition-all"
                                    style={{
                                      width: `${Math.min((achievement.progress / achievement.requirement) * 100, 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

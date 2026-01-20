"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, Badge } from "@/components/ui";

interface Challenge {
  id: string;
  key: string;
  name: string;
  nameEs: string;
  description: string;
  descriptionEs: string;
  icon: string;
  type: "weekly" | "monthly";
  target: number;
  creditReward: number;
  progress: number;
  completed: boolean;
  completedAt: string | null;
}

interface ResetTime {
  days: number;
  hours: number;
  minutes: number;
}

interface ChallengeStats {
  weekly: { completed: number; total: number };
  monthly: { completed: number; total: number };
}

export default function ChallengesPage() {
  const t = useTranslations("challenges");
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<"weekly" | "monthly">("weekly");
  const [weekly, setWeekly] = useState<Challenge[]>([]);
  const [monthly, setMonthly] = useState<Challenge[]>([]);
  const [stats, setStats] = useState<ChallengeStats | null>(null);
  const [resets, setResets] = useState<{ weekly: ResetTime; monthly: ResetTime } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/challenges")
      .then((res) => res.json())
      .then((data) => {
        setWeekly(data.weekly || []);
        setMonthly(data.monthly || []);
        setStats(data.stats);
        setResets(data.resets);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getLocalizedName = (challenge: Challenge) => {
    return locale === "en" ? challenge.name : challenge.nameEs;
  };

  const getLocalizedDescription = (challenge: Challenge) => {
    return locale === "en" ? challenge.description : challenge.descriptionEs;
  };

  const formatResetTime = (reset: ResetTime) => {
    if (reset.days > 0) {
      return `${reset.days}d ${reset.hours}h`;
    }
    if (reset.hours > 0) {
      return `${reset.hours}h ${reset.minutes}m`;
    }
    return `${reset.minutes}m`;
  };

  const challenges = activeTab === "weekly" ? weekly : monthly;
  const currentStats = activeTab === "weekly" ? stats?.weekly : stats?.monthly;
  const currentReset = activeTab === "weekly" ? resets?.weekly : resets?.monthly;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            {t("title")}
          </span>
        </h1>
        {currentStats && (
          <p className="text-slate-400">
            {currentStats.completed}/{currentStats.total} {t("completed").toLowerCase()}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-2 mb-6">
        <button
          onClick={() => setActiveTab("weekly")}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === "weekly"
              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
              : "bg-slate-800/50 text-slate-400 hover:bg-slate-800"
          }`}
        >
          {t("weekly")}
        </button>
        <button
          onClick={() => setActiveTab("monthly")}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === "monthly"
              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
              : "bg-slate-800/50 text-slate-400 hover:bg-slate-800"
          }`}
        >
          {t("monthly")}
        </button>
      </div>

      {/* Reset Countdown */}
      {currentReset && (
        <div className="text-center mb-6">
          <p className="text-sm text-slate-500">
            {t("resetsIn", { time: formatResetTime(currentReset) })}
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Challenges List */}
      {!loading && (
        <div className="space-y-4">
          {challenges.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-slate-400">{t("noChallenges")}</p>
              </CardContent>
            </Card>
          ) : (
            challenges.map((challenge) => {
              const progressPercent = Math.min(
                (challenge.progress / challenge.target) * 100,
                100
              );

              return (
                <Card
                  key={challenge.id}
                  className={`transition-all ${
                    challenge.completed
                      ? "ring-2 ring-emerald-500/50 bg-gradient-to-r from-emerald-900/20 to-teal-900/10"
                      : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div
                        className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${
                          challenge.completed
                            ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                            : "bg-gradient-to-br from-purple-600 to-pink-600"
                        }`}
                      >
                        {challenge.completed ? "✓" : challenge.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3
                              className={`font-semibold ${
                                challenge.completed ? "text-emerald-400" : "text-slate-100"
                              }`}
                            >
                              {getLocalizedName(challenge)}
                            </h3>
                            <p className="text-sm text-slate-500">
                              {getLocalizedDescription(challenge)}
                            </p>
                          </div>

                          {/* Reward Badge */}
                          <Badge
                            variant={challenge.completed ? "success" : "secondary"}
                            className="flex-shrink-0"
                          >
                            +{challenge.creditReward} {t("credits")}
                          </Badge>
                        </div>

                        {/* Progress */}
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>
                              {challenge.completed ? t("completed") : t("inProgress")}
                            </span>
                            <span>
                              {challenge.progress}/{challenge.target}
                            </span>
                          </div>
                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                challenge.completed
                                  ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                                  : "bg-gradient-to-r from-purple-500 to-pink-500"
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

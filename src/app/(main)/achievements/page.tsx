"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Badge } from "@/components/ui";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { BarraProgreso } from "@/components/achievements/BarraProgreso";
import { Sello, type EstadoSello } from "@/components/achievements/Sello";
import { cn } from "@/lib/utils";

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

// Las cartas doradas también son logros (las cuenta `stats`): su archivo va al final.
const CATEGORY_ORDER = ["readings", "collection", "streak", "time", "subscription", "golden"];

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
        setAchievements(data.achievements ?? []);
        setStats(data.stats ?? null);
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
      case "golden": return t("categories.golden");
      default: return category;
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

  const estadoDe = (achievement: Achievement): EstadoSello =>
    achievement.isUnlocked ? "logrado" : achievement.progress > 0 ? "en-curso" : "bloqueado";

  const etiquetaDeEstado = (estado: EstadoSello) =>
    estado === "logrado" ? t("unlocked") : estado === "en-curso" ? t("inProgress") : t("locked");

  // Group achievements by category
  const groupedAchievements = CATEGORY_ORDER.reduce((acc, category) => {
    const categoryAchievements = achievements.filter((a) => a.category === category);
    if (categoryAchievements.length > 0) {
      acc[category] = categoryAchievements;
    }
    return acc;
  }, {} as Record<string, Achievement[]>);

  return (
    <div className="grid gap-[clamp(32px,6vh,56px)]">
      {/* Encabezado */}
      <header className="grid gap-x-[clamp(24px,5vw,80px)] gap-y-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
        <div className="grid gap-3.5">
          <Etiqueta>{t("kicker")}</Etiqueta>
          <h1 className="text-[clamp(2rem,1.4rem+2vw,3.2rem)] leading-[1.05]">{t("title")}</h1>
        </div>

        {stats && (
          <div className="grid gap-3 border-t border-filete pt-4">
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-dato" data-contador>
              <span className="text-[clamp(2.75rem,2rem+3vw,4.25rem)] leading-none tracking-[-0.04em] tabular-nums">
                {stats.unlocked}
              </span>{" "}
              <span className="text-sm tracking-[0.12em] text-letra-suave uppercase">
                {t("counterOf", { total: stats.total })}
              </span>
            </p>
            <BarraProgreso
              valor={stats.unlocked}
              max={stats.total}
              etiqueta={t("title")}
              texto={t("progress", { unlocked: stats.unlocked, total: stats.total })}
              logrado={stats.total > 0 && stats.unlocked >= stats.total}
            />
            <p className="font-dato text-[0.6875rem] leading-[1.5] tracking-[0.1em] text-letra-suave uppercase">
              {stats.percentage}%
            </p>
          </div>
        )}
      </header>

      {/* Cargando */}
      {loading && (
        <div className="grid gap-3" aria-hidden="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-sm bg-papel-hondo motion-safe:animate-pulse" />
          ))}
        </div>
      )}

      {/* El archivo, por categoría */}
      {!loading && (
        <div className="grid gap-[clamp(32px,5vh,48px)]">
          {Object.entries(groupedAchievements).map(([category, categoryAchievements]) => {
            const logrados = categoryAchievements.filter((a) => a.isUnlocked).length;
            return (
              <section key={category} aria-labelledby={`categoria-${category}`} className="grid gap-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-filete pt-3">
                  <h2 id={`categoria-${category}`} className="text-[clamp(1.4rem,1.1rem+1vw,1.9rem)] leading-[1.1]">
                    {getCategoryLabel(category)}
                  </h2>
                  <p className="font-dato text-xs tracking-[0.12em] text-letra-suave uppercase tabular-nums">
                    {t("of", { count: logrados, total: categoryAchievements.length })}
                  </p>
                </div>

                <ul className="grid">
                  {categoryAchievements.map((achievement) => {
                    const estado = estadoDe(achievement);
                    const nombre = getLocalizedName(achievement);
                    const avance = Math.min(achievement.progress, achievement.requirement);
                    return (
                      <li
                        key={achievement.id}
                        data-estado={estado}
                        className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-3 border-b border-filete/15 py-5 sm:gap-x-5"
                      >
                        <Sello estado={estado}>{achievement.requirement}</Sello>

                        <div className="grid min-w-0 gap-2.5">
                          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                            <div className="grid min-w-0 gap-1">
                              <h3
                                className={cn(
                                  "text-[1.25rem] leading-[1.15]",
                                  estado === "bloqueado" ? "text-letra-suave" : "text-letra"
                                )}
                              >
                                {nombre}
                              </h3>
                              <p className="text-[0.9375rem] leading-[1.45] text-letra-suave">
                                {getLocalizedDescription(achievement)}
                              </p>
                            </div>
                            <Badge variant={achievement.isUnlocked ? "primary" : "default"}>
                              {t("reward", { count: achievement.creditReward })}
                            </Badge>
                          </div>

                          {achievement.isUnlocked ? (
                            <p className="flex flex-wrap items-center gap-x-2 font-dato text-[0.6875rem] leading-[1.5] tracking-[0.1em] text-letra-acento uppercase">
                              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-rosa" />
                              {t("unlocked")}
                              {achievement.unlockedAt && (
                                <span className="text-letra-suave">· {formatDate(achievement.unlockedAt)}</span>
                              )}
                            </p>
                          ) : (
                            <div className="grid gap-1.5">
                              <p className="flex flex-wrap justify-between gap-x-3 font-dato text-[0.6875rem] leading-[1.5] tracking-[0.1em] text-letra-suave uppercase">
                                <span>{etiquetaDeEstado(estado)}</span>
                                <span className="tabular-nums">
                                  {avance}/{achievement.requirement}
                                </span>
                              </p>
                              <BarraProgreso
                                valor={avance}
                                max={achievement.requirement}
                                etiqueta={nombre}
                                texto={t("of", { count: avance, total: achievement.requirement })}
                                grosor="fina"
                              />
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Badge } from "@/components/ui";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { BarraProgreso } from "@/components/achievements/BarraProgreso";
import { Sello } from "@/components/achievements/Sello";
import { cn } from "@/lib/utils";

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

type Periodo = "weekly" | "monthly";
const PERIODOS: Periodo[] = ["weekly", "monthly"];

export default function ChallengesPage() {
  const t = useTranslations("challenges");
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<Periodo>("weekly");
  const [weekly, setWeekly] = useState<Challenge[]>([]);
  const [monthly, setMonthly] = useState<Challenge[]>([]);
  const [stats, setStats] = useState<ChallengeStats | null>(null);
  const [resets, setResets] = useState<{ weekly: ResetTime; monthly: ResetTime } | null>(null);
  const [loading, setLoading] = useState(true);
  const pestanas = useRef<Record<Periodo, HTMLButtonElement | null>>({ weekly: null, monthly: null });

  useEffect(() => {
    fetch("/api/challenges")
      .then((res) => res.json())
      .then((data) => {
        setWeekly(data.weekly || []);
        setMonthly(data.monthly || []);
        setStats(data.stats ?? null);
        setResets(data.resets ?? null);
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

  /** Pestañas con flechas, Inicio y Fin (patrón de tablist con foco itinerante). */
  const alTeclear = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = PERIODOS.indexOf(activeTab);
    let siguiente: Periodo | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") siguiente = PERIODOS[(i + 1) % PERIODOS.length];
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") siguiente = PERIODOS[(i - 1 + PERIODOS.length) % PERIODOS.length];
    else if (e.key === "Home") siguiente = PERIODOS[0];
    else if (e.key === "End") siguiente = PERIODOS[PERIODOS.length - 1];
    if (!siguiente) return;
    e.preventDefault();
    setActiveTab(siguiente);
    pestanas.current[siguiente]?.focus();
  };

  const challenges = activeTab === "weekly" ? weekly : monthly;
  const currentStats = activeTab === "weekly" ? stats?.weekly : stats?.monthly;
  const currentReset = activeTab === "weekly" ? resets?.weekly : resets?.monthly;

  return (
    <div className="grid gap-[clamp(28px,5vh,48px)]">
      {/* Encabezado */}
      <header className="grid gap-x-[clamp(24px,5vw,80px)] gap-y-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
        <div className="grid gap-3.5">
          {currentReset ? (
            <Etiqueta>{t("resetsIn", { time: formatResetTime(currentReset) })}</Etiqueta>
          ) : (
            <Etiqueta>{t(activeTab)}</Etiqueta>
          )}
          <h1 className="text-[clamp(2rem,1.4rem+2vw,3.2rem)] leading-[1.05]">{t("title")}</h1>
        </div>

        {currentStats && (
          <div className="grid gap-3 border-t border-filete pt-4">
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-dato" data-contador>
              <span className="text-[clamp(2.75rem,2rem+3vw,4.25rem)] leading-none tracking-[-0.04em] tabular-nums">
                {currentStats.completed}/{currentStats.total}
              </span>{" "}
              <span className="text-sm tracking-[0.12em] text-letra-suave uppercase">
                {t("completed").toLowerCase()}
              </span>
            </p>
            <BarraProgreso
              valor={currentStats.completed}
              max={currentStats.total}
              etiqueta={`${t("title")} · ${t(activeTab)}`}
              texto={t("of", { count: currentStats.completed, total: currentStats.total })}
              logrado={currentStats.total > 0 && currentStats.completed >= currentStats.total}
            />
          </div>
        )}
      </header>

      {/* Pestañas: semanales / mensuales */}
      <div role="tablist" aria-label={t("tabsLabel")} className="flex flex-wrap gap-2 border-b border-filete/20 pb-4">
        {PERIODOS.map((periodo) => {
          const activa = activeTab === periodo;
          return (
            <button
              key={periodo}
              ref={(el) => {
                pestanas.current[periodo] = el;
              }}
              type="button"
              role="tab"
              id={`pestana-${periodo}`}
              aria-selected={activa}
              aria-controls="panel-desafios"
              tabIndex={activa ? 0 : -1}
              onClick={() => setActiveTab(periodo)}
              onKeyDown={alTeclear}
              className={cn(
                "inline-flex min-h-11 cursor-pointer items-center rounded-full border px-5 font-dato text-xs tracking-[0.1em] uppercase transition-colors duration-200",
                activa ? "border-tinta bg-tinta text-papel" : "border-tinta/30 text-tinta hover:border-tinta"
              )}
            >
              {t(periodo)}
            </button>
          );
        })}
      </div>

      {/* Lista de desafíos del periodo */}
      <div role="tabpanel" id="panel-desafios" aria-labelledby={`pestana-${activeTab}`} tabIndex={0} className="focus-visible:outline-offset-8">
        {loading && (
          <div className="grid gap-3" aria-hidden="true">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-sm bg-papel-hondo motion-safe:animate-pulse" />
            ))}
          </div>
        )}

        {!loading &&
          (challenges.length === 0 ? (
            <p className="border-y border-filete/20 py-8 text-center text-letra-suave">{t("noChallenges")}</p>
          ) : (
            <ul className="grid">
              {challenges.map((challenge) => {
                const nombre = getLocalizedName(challenge);
                const avance = Math.min(challenge.progress, challenge.target);
                return (
                  <li
                    key={challenge.id}
                    data-estado={challenge.completed ? "logrado" : "en-curso"}
                    className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-3 border-b border-filete/15 py-5 sm:gap-x-5"
                  >
                    <Sello estado={challenge.completed ? "logrado" : avance > 0 ? "en-curso" : "bloqueado"}>
                      {challenge.target}
                    </Sello>

                    <div className="grid min-w-0 gap-2.5">
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                        <div className="grid min-w-0 gap-1">
                          <h2 className="text-[1.25rem] leading-[1.15]">{nombre}</h2>
                          <p className="text-[0.9375rem] leading-[1.45] text-letra-suave">
                            {getLocalizedDescription(challenge)}
                          </p>
                        </div>
                        <Badge variant={challenge.completed ? "primary" : "default"}>
                          {t("reward", { count: challenge.creditReward })}
                        </Badge>
                      </div>

                      <div className="grid gap-1.5">
                        <p
                          className={cn(
                            "flex flex-wrap justify-between gap-x-3 font-dato text-[0.6875rem] leading-[1.5] tracking-[0.1em] uppercase",
                            challenge.completed ? "text-letra-acento" : "text-letra-suave"
                          )}
                        >
                          <span className="inline-flex items-center gap-2">
                            {challenge.completed && (
                              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-rosa" />
                            )}
                            {challenge.completed ? t("completed") : t("inProgress")}
                          </span>
                          <span className="tabular-nums text-letra-suave">
                            {challenge.progress}/{challenge.target}
                          </span>
                        </p>
                        <BarraProgreso
                          valor={avance}
                          max={challenge.target}
                          etiqueta={nombre}
                          texto={t("of", { count: avance, total: challenge.target })}
                          logrado={challenge.completed}
                          grosor="fina"
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ))}
      </div>
    </div>
  );
}

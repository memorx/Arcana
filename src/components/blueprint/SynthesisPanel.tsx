"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { cn } from "@/lib/utils";
import { BlueprintShare } from "./BlueprintShare";
import { SynthesisText } from "./SynthesisText";

type ErrorKind = "unavailable" | "refused" | "rateLimited" | "cooldown" | "profile" | "generic";

const LOADING_STEPS = ["western", "chinese", "tonalli", "numerology", "cards", "writing"] as const;

export interface SynthesisPanelProps {
  /** Cached synthesis for the current profile, or null. */
  initialSynthesis: string | null;
  /** A synthesis exists but was written for an older birth date, name or language. */
  isStale: boolean;
  initialShareId: string | null;
  /** Language the synthesis is written in (the profile's). */
  synthesisLocale: "en" | "es";
  /** Interface language, to mention when the synthesis is in the other one. */
  uiLocale: "en" | "es";
}

function errorKind(status: number): ErrorKind {
  if (status === 422) return "refused";
  if (status === 429) return "rateLimited";
  if (status === 404) return "profile";
  if (status >= 500) return "unavailable";
  return "generic";
}

/** A notice with the pink rule of the reading's intention (lectura.html). */
const AVISO = "border-l-2 border-rosa pl-4 text-[1.0625rem] leading-[1.6]";

/**
 * The AI synthesis of the Arcana Map: generate it (free, POST
 * /api/blueprint/synthesis), wait with a calm loading state, read it as a
 * printed sheet with the closing questions apart, and share the map.
 * States: none yet, stale (profile changed), generating, error (incl. the
 * 429 cooldown) and written.
 */
export function SynthesisPanel({
  initialSynthesis,
  isStale,
  initialShareId,
  synthesisLocale,
  uiLocale,
}: SynthesisPanelProps) {
  const t = useTranslations("blueprint.synthesis");
  const [synthesis, setSynthesis] = useState<string | null>(initialSynthesis);
  const [stale, setStale] = useState(isStale && !initialSynthesis);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorKind | null>(null);
  const [cooldownMinutes, setCooldownMinutes] = useState(1);
  const [step, setStep] = useState(0);
  const [shareId, setShareId] = useState<string | null>(initialShareId);
  const [justGenerated, setJustGenerated] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!loading) return;
    setStep(0);
    const id = window.setInterval(
      () => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)),
      3500
    );
    return () => window.clearInterval(id);
  }, [loading]);

  useEffect(() => {
    if (justGenerated) titleRef.current?.focus();
  }, [justGenerated]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/blueprint/synthesis", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.synthesis === "string" && data.synthesis.trim()) {
        setSynthesis(data.synthesis);
        setShareId(typeof data.shareId === "string" ? data.shareId : null);
        setStale(false);
        setJustGenerated(true);
        return;
      }
      if (res.status === 429 && data.error === "synthesis_cooldown") {
        setCooldownMinutes(Math.max(1, Math.ceil(Number(data.retryAfterSeconds) / 60) || 1));
        setError("cooldown");
        return;
      }
      setError(errorKind(res.status));
    } catch {
      setError("unavailable");
    } finally {
      setLoading(false);
    }
  };

  const estado = synthesis ? "escrita" : loading ? "generando" : error ? "error" : stale ? "vieja" : "pendiente";

  return (
    <section
      id="synthesis"
      role="region"
      aria-labelledby="blueprint-synthesis-title"
      data-estado={estado}
      className="grid scroll-mt-(--alto-cabecera) gap-8 border-t border-filete pt-8 sm:pt-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-14"
    >
      <header className="grid content-start gap-3">
        <Etiqueta>{t("eyebrow")}</Etiqueta>
        <h2
          id="blueprint-synthesis-title"
          ref={titleRef}
          tabIndex={-1}
          className="text-[clamp(1.9rem,1.4rem+1.6vw,2.6rem)] leading-[1.05] focus:outline-none"
        >
          {t("title")}
        </h2>
        <p className="max-w-[42ch] text-letra-suave">{t("subtitle")}</p>
      </header>

      <div className="min-w-0">
        {/* Always in the DOM so screen readers announce the text when loading starts */}
        <p role="status" className="sr-only">
          {loading ? t("loadingSr") : ""}
        </p>

        {synthesis ? (
          <>
            <SynthesisText text={synthesis} lang={synthesisLocale} questionsTitle={t("questionsTitle")} />
            <div className="mt-8 grid gap-1.5 font-dato text-[0.6875rem] leading-[1.5] tracking-[0.08em] text-letra-suave uppercase">
              {synthesisLocale !== uiLocale && (
                <p>{t("languageNote", { language: t(`languages.${synthesisLocale}`) })}</p>
              )}
              <p>{t("disclaimer")}</p>
            </div>
          </>
        ) : loading ? (
          <div className="grid gap-6">
            <ol aria-hidden="true" className="grid max-w-[22rem] grid-cols-6 gap-1.5">
              {LOADING_STEPS.map((key, i) => (
                <li
                  key={key}
                  className={cn(
                    "h-1.5 rounded-full",
                    i < step ? "bg-tinta" : i === step ? "bg-rosa motion-safe:animate-pulse" : "bg-filete/15"
                  )}
                />
              ))}
            </ol>
            <p aria-hidden="true" className="text-[clamp(1.25rem,1.1rem+0.5vw,1.45rem)] leading-[1.45] italic">
              {t(`loading.${LOADING_STEPS[step]}`)}
            </p>
            <div aria-hidden="true" className="grid max-w-[66ch] gap-3">
              {["w-full", "w-11/12", "w-full", "w-2/3"].map((ancho, i) => (
                <span key={i} className={cn("h-3 rounded-sm bg-papel-hondo motion-safe:animate-pulse", ancho)} />
              ))}
            </div>
            <p className="font-dato text-[0.6875rem] leading-[1.5] tracking-[0.08em] text-letra-suave uppercase">
              {t("loadingHint")}
            </p>
          </div>
        ) : (
          <div className="grid gap-5">
            {stale ? (
              <p className={AVISO}>{t("stale")}</p>
            ) : (
              <p className="max-w-[60ch] text-[1.125rem] leading-[1.7]">{t("intro")}</p>
            )}
            {error && (
              <p role="alert" className={cn(AVISO, "border-letra-error text-letra-error")}>
                {error === "cooldown"
                  ? t("errors.cooldown", { minutes: cooldownMinutes })
                  : t(`errors.${error}`)}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <Button size="lg" onClick={generate} className="w-full sm:w-auto">
                {error ? t("retry") : stale ? t("regenerate") : t("generate")}
              </Button>
              <span className="font-dato text-[0.6875rem] leading-[1.5] tracking-[0.08em] text-letra-suave uppercase">
                {t("free")}
              </span>
            </div>
          </div>
        )}

        {/* Outside the synthesis branch: an existing link can be revoked even if the synthesis is out of date */}
        {(synthesis || shareId) && <BlueprintShare initialShareId={shareId} canCreate={Boolean(synthesis)} />}
      </div>
    </section>
  );
}

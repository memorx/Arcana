"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, CardContent } from "@/components/ui";
import { BlueprintShare } from "./BlueprintShare";
import { SynthesisText } from "./SynthesisText";

type ErrorKind = "unavailable" | "refused" | "rateLimited" | "cooldown" | "profile" | "generic";

const LOADING_STEPS = ["western", "chinese", "tonalli", "numerology", "cards", "writing"] as const;
const LOADING_GLYPHS = ["☉", "☯", "◈", "✧", "✦"];

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

/**
 * The AI synthesis of the Arcana Map: generate it (free, POST
 * /api/blueprint/synthesis), wait with a calm loading state, read it in
 * paragraphs with the closing questions apart, and share the map.
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

  return (
    <Card
      variant="highlighted"
      id="synthesis"
      role="region"
      aria-labelledby="blueprint-synthesis-title"
      className="scroll-mt-24"
    >
      <CardContent className="p-5 sm:p-8">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-amber-400">
            ✦
          </span>
          <h2
            id="blueprint-synthesis-title"
            ref={titleRef}
            tabIndex={-1}
            className="text-2xl font-semibold text-slate-100 focus:outline-none"
          >
            {t("title")}
          </h2>
        </div>
        <p className="mt-1 text-sm text-slate-400">{t("subtitle")}</p>
        {/* Always in the DOM so screen readers announce the text when loading starts */}
        <p role="status" className="sr-only">
          {loading ? t("loadingSr") : ""}
        </p>

        {synthesis ? (
          <>
            <div className="mt-6">
              <SynthesisText text={synthesis} lang={synthesisLocale} questionsTitle={t("questionsTitle")} />
            </div>
            {synthesisLocale !== uiLocale && (
              <p className="mt-4 text-xs text-slate-500">
                {t("languageNote", { language: t(`languages.${synthesisLocale}`) })}
              </p>
            )}
            <p className="mt-4 text-xs text-slate-500">{t("disclaimer")}</p>
          </>
        ) : loading ? (
          <div className="mt-6 flex flex-col items-center py-8 text-center">
            <div aria-hidden="true" className="relative h-28 w-28">
              <div className="absolute inset-0 rounded-full border border-slate-700/80" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-400/80 motion-safe:animate-spin" />
              {LOADING_GLYPHS.map((glyph, i) => {
                const angle = ((-90 + 72 * i) * Math.PI) / 180;
                return (
                  <span
                    key={glyph}
                    className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900 text-sm text-purple-200 motion-safe:animate-pulse"
                    style={{
                      left: `${50 + 50 * Math.cos(angle)}%`,
                      top: `${50 + 50 * Math.sin(angle)}%`,
                      animationDelay: `${i * 300}ms`,
                    }}
                  >
                    {glyph}
                  </span>
                );
              })}
              <span className="absolute inset-0 flex items-center justify-center text-2xl text-amber-300">✦</span>
            </div>
            <p aria-hidden="true" className="mt-8 font-medium text-slate-200">
              {t(`loading.${LOADING_STEPS[step]}`)}
            </p>
            <p className="mt-1 text-xs text-slate-500">{t("loadingHint")}</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {stale ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                {t("stale")}
              </p>
            ) : (
              <p className="leading-relaxed text-slate-300">{t("intro")}</p>
            )}
            {error && (
              <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {error === "cooldown"
                  ? t("errors.cooldown", { minutes: cooldownMinutes })
                  : t(`errors.${error}`)}
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button size="lg" onClick={generate} className="w-full sm:w-auto">
                {error ? t("retry") : stale ? t("regenerate") : t("generate")}
              </Button>
              <span className="text-center text-xs text-slate-500 sm:text-left">{t("free")}</span>
            </div>
          </div>
        )}

        {/* Outside the synthesis branch: an existing link can be revoked even if the synthesis is out of date */}
        {(synthesis || shareId) && <BlueprintShare initialShareId={shareId} canCreate={Boolean(synthesis)} />}
      </CardContent>
    </Card>
  );
}

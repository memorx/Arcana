"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/utils";

/** Same limits as POST /api/readings/[id]/resonance. */
const NOTE_MAX = 500;
const MIN_AGE_MS = 24 * 60 * 60 * 1000;
const STARS = [1, 2, 3, 4, 5] as const;

const SECCION = "grid max-w-[760px] gap-5 border-t border-filete/20 pt-8";
const TITULO = "font-titulo text-[clamp(1.4rem,1.15rem+0.8vw,1.8rem)] leading-[1.1]";

export interface ResonanceCheckProps {
  readingId: string;
  /** ISO date of the reading. */
  createdAt: string;
  resonance: number | null;
  resonanceNote: string | null;
  locale: string;
}

type ErrorKey = "error" | "tooSoon";

function StarIcon({ filled, className = "" }: { filled: boolean; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinejoin="round"
        d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.8L12 16.78l-5.2 2.74.99-5.8-4.21-4.1 5.82-.85L12 3.5z"
      />
    </svg>
  );
}

/**
 * "How did this reading resonate with what happened?"
 * - Already rated: shows "Resonated N/5" and the note.
 * - Not rated and older than 24 h: five stars, optional note, saves once.
 * - Younger than 24 h: renders nothing.
 */
export function ResonanceCheck({ readingId, createdAt, resonance, resonanceNote, locale }: ResonanceCheckProps) {
  const t = useTranslations("resonance");
  const router = useRouter();
  const headingId = useId();
  const noteId = useId();

  // Read the clock only after mounting: the server and the browser could disagree
  // right at the 24 h mark and break hydration.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
  }, []);

  // What this component just saved. Otherwise the props rule (they come back
  // fresh from the server after router.refresh()).
  const [justSaved, setJustSaved] = useState<{ score: number; note: string | null; xp: number } | null>(null);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);

  const saved = justSaved
    ? { score: justSaved.score, note: justSaved.note }
    : resonance !== null
      ? { score: resonance, note: resonanceNote }
      : null;

  // The saved rating doesn't depend on the clock, so it renders on the server too.
  if (saved) {
    return (
      <section aria-labelledby={headingId} className={SECCION}>
        <h2 id={headingId} className={TITULO}>
          {t("title")}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="flex gap-0.5 text-letra-acento"
            role="img"
            aria-label={t("result", { score: saved.score })}
          >
            {STARS.map((n) => (
              <StarIcon key={n} filled={n <= saved.score} className="size-5" />
            ))}
          </span>
          <span className="font-dato text-xs tracking-[0.1em] uppercase">{t("result", { score: saved.score })}</span>
        </div>
        {saved.note && (
          <p className="max-w-[60ch] border-l-2 border-rosa pl-4 font-lectura whitespace-pre-line break-words italic">
            &ldquo;{saved.note}&rdquo;
          </p>
        )}
        {justSaved && (
          <p role="status" className="flex flex-wrap items-center gap-2 text-[0.9375rem] text-letra-exito">
            <span>{t("thanks")}</span>
            {justSaved.xp > 0 && <Badge variant="primary">{t("xp", { xp: justSaved.xp })}</Badge>}
          </p>
        )}
      </section>
    );
  }

  // Rated somewhere else (another tab): no form; the refresh brings the rating.
  if (alreadyRated) {
    return (
      <section aria-labelledby={headingId} className={SECCION}>
        <h2 id={headingId} className={TITULO}>
          {t("title")}
        </h2>
        <p role="status" className="text-[0.9375rem] text-letra-suave">
          {t("alreadySaved")}
        </p>
      </section>
    );
  }

  // Before mounting, too early, or an unreadable date: nothing to ask yet.
  const createdAtMs = Date.parse(createdAt);
  if (now === null || Number.isNaN(createdAtMs) || now - createdAtMs < MIN_AGE_MS) {
    return null;
  }

  const readingDate = new Date(createdAtMs).toLocaleDateString(locale === "en" ? "en-US" : "es-ES", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  const shown = hovered ?? score ?? 0;

  async function submit() {
    if (score === null || saving) return;
    setSaving(true);
    setError(null);
    try {
      const trimmed = note.trim();
      const res = await fetch(`/api/readings/${readingId}/resonance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trimmed ? { score, note: trimmed } : { score }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setJustSaved({
          score: data.resonance ?? score,
          note: data.resonanceNote ?? (trimmed || null),
          xp: typeof data.xpAdded === "number" ? data.xpAdded : 0,
        });
        return;
      }
      if (res.status === 409) {
        setAlreadyRated(true);
        router.refresh();
        return;
      }
      setError(data?.error === "too_soon" ? "tooSoon" : "error");
    } catch {
      setError("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby={headingId} className={cn(SECCION, "border-t-[3px] border-t-rosa")}>
      <div className="grid gap-1">
        <h2 id={headingId} className={TITULO}>
          {t("question")}
        </h2>
        <p className="font-dato text-[0.6875rem] tracking-[0.08em] text-letra-suave">{t("readingFrom", { date: readingDate })}</p>
      </div>

      <div>
        <div
          role="group"
          aria-label={t("starsGroup")}
          className="flex flex-wrap items-center gap-1"
          onMouseLeave={() => setHovered(null)}
        >
          {STARS.map((n) => (
            <button
              key={n}
              type="button"
              aria-label={t("starLabel", { count: n })}
              aria-pressed={score === n}
              onClick={() => setScore(n)}
              onMouseEnter={() => setHovered(n)}
              disabled={saving}
              className={`flex size-11 items-center justify-center rounded-full motion-safe:transition-transform motion-safe:hover:scale-110 disabled:cursor-not-allowed ${
                n <= shown ? "text-letra-acento" : "text-letra-suave hover:text-letra"
              }`}
            >
              <StarIcon filled={n <= shown} className="size-7" />
            </button>
          ))}
        </div>
        <div className="mt-1 flex max-w-[14rem] justify-between px-1 font-dato text-[0.625rem] tracking-[0.08em] text-letra-suave uppercase" aria-hidden="true">
          <span>{t("scaleLow")}</span>
          <span>{t("scaleHigh")}</span>
        </div>
      </div>

      <div className="grid gap-2">
        <label htmlFor={noteId} className="font-dato text-[0.6875rem] tracking-[0.1em] text-letra-suave uppercase">
          {t("noteLabel")}
        </label>
        <textarea
          id={noteId}
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
          maxLength={NOTE_MAX}
          rows={3}
          placeholder={t("notePlaceholder")}
          disabled={saving}
          className="block w-full resize-y rounded-none border-0 border-y border-filete/40 bg-transparent px-0 py-3 font-lectura text-[1.0625rem] leading-[1.6] text-letra placeholder:text-letra-suave focus:border-rosa focus:shadow-[0_1px_0_0_var(--color-rosa)] focus:outline-none disabled:opacity-60"
        />
        <p className="text-right font-dato text-[0.6875rem] text-letra-suave">
          {t("noteCount", { count: note.length, max: NOTE_MAX })}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-[0.9375rem] text-letra-error">
          {t(error)}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={submit} isLoading={saving} disabled={score === null}>
          {saving ? t("saving") : t("submit")}
        </Button>
        <span className="font-dato text-[0.6875rem] tracking-[0.08em] text-letra-suave">{t("xpHint")}</span>
      </div>
    </section>
  );
}

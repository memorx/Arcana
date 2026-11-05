"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, CardContent } from "@/components/ui";

/** Same limits as POST /api/readings/[id]/resonance. */
const NOTE_MAX = 500;
const MIN_AGE_MS = 24 * 60 * 60 * 1000;
const STARS = [1, 2, 3, 4, 5] as const;

export interface ResonanceCheckProps {
  readingId: string;
  /** ISO date of the reading. */
  createdAt: string;
  resonance: number | null;
  resonanceNote: string | null;
  locale: string;
}

type ErrorKey = "error" | "alreadySaved" | "tooSoon";

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
  const headingId = useId();
  const noteId = useId();
  // Read the clock once, so re-renders don't flip the visibility.
  const [now] = useState(() => Date.now());

  const [saved, setSaved] = useState<{ score: number; note: string | null } | null>(
    resonance !== null ? { score: resonance, note: resonanceNote } : null
  );
  const [justSaved, setJustSaved] = useState<{ xp: number } | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);

  const createdAtMs = Date.parse(createdAt);

  if (saved) {
    return (
      <section aria-labelledby={headingId} className="mt-8">
        <Card className="border-purple-500/30">
          <CardContent className="p-6">
            <h3 id={headingId} className="text-lg font-semibold text-slate-100 mb-3">
              {t("title")}
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="flex gap-0.5 text-amber-400"
                role="img"
                aria-label={t("result", { score: saved.score })}
              >
                {STARS.map((n) => (
                  <StarIcon key={n} filled={n <= saved.score} className="w-5 h-5" />
                ))}
              </span>
              <span className="text-slate-200 font-medium">{t("result", { score: saved.score })}</span>
            </div>
            {saved.note && (
              <p className="mt-3 text-slate-300 italic whitespace-pre-line break-words">
                &ldquo;{saved.note}&rdquo;
              </p>
            )}
            {justSaved && (
              <p role="status" className="mt-4 text-sm text-emerald-300 flex flex-wrap items-center gap-2">
                <span>{t("thanks")}</span>
                {justSaved.xp > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {t("xp", { xp: justSaved.xp })}
                  </span>
                )}
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    );
  }

  // Too early (or an unreadable date): the reading hasn't had time to land.
  if (Number.isNaN(createdAtMs) || now - createdAtMs < MIN_AGE_MS) {
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
        setSaved({ score: data.resonance ?? score, note: data.resonanceNote ?? (trimmed || null) });
        setJustSaved({ xp: typeof data.xpAdded === "number" ? data.xpAdded : 0 });
        return;
      }
      if (res.status === 409) setError("alreadySaved");
      else if (data?.error === "too_soon") setError("tooSoon");
      else setError("error");
    } catch {
      setError("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby={headingId} className="mt-8">
      <Card className="border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-slate-900/50">
        <CardContent className="p-6">
          <h3 id={headingId} className="text-lg font-semibold text-slate-100">
            {t("question")}
          </h3>
          <p className="text-sm text-slate-400 mt-1">{t("readingFrom", { date: readingDate })}</p>

          <div
            role="group"
            aria-label={t("starsGroup")}
            className="mt-4 flex items-center gap-1"
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
                className={`w-11 h-11 flex items-center justify-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 motion-safe:transition-transform motion-safe:hover:scale-110 disabled:cursor-not-allowed ${
                  n <= shown ? "text-amber-400" : "text-slate-600 hover:text-slate-500"
                }`}
              >
                <StarIcon filled={n <= shown} className="w-8 h-8" />
              </button>
            ))}
          </div>
          <div className="flex justify-between max-w-[14rem] text-xs text-slate-500 mt-1 px-1" aria-hidden="true">
            <span>{t("scaleLow")}</span>
            <span>{t("scaleHigh")}</span>
          </div>

          <label htmlFor={noteId} className="block text-sm text-slate-300 mt-5 mb-2">
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
            className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 resize-y focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <p className="text-xs text-slate-500 text-right mt-1">
            {t("noteCount", { count: note.length, max: NOTE_MAX })}
          </p>

          {error && (
            <p role="alert" className="mt-3 text-sm text-red-300">
              {t(error)}
            </p>
          )}

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <Button onClick={submit} isLoading={saving} disabled={score === null} className="w-full sm:w-auto">
              {saving ? t("saving") : t("submit")}
            </Button>
            <span className="text-xs text-slate-500">{t("xpHint")}</span>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

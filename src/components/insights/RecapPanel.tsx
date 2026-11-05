"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Badge, Button } from "@/components/ui";

/** Same threshold as POST /api/insights/recap. */
const MIN_READINGS = 3;

export interface RecapMonth {
  year: number;
  /** 1–12 */
  month: number;
  count: number;
  /** "noviembre de 2026", formatted on the server. */
  label: string;
}

export interface RecapEntry {
  year: number;
  month: number;
  content: string;
  readingCount: number;
}

export interface RecapPanelProps {
  /** Oldest first; the last one is the current month. */
  months: RecapMonth[];
  initialRecaps: RecapEntry[];
}

type RecapError = "unavailable" | "refused" | "needMore" | "error";

const keyOf = (year: number, month: number) => `${year}-${month}`;

/** "Tu mes en cartas": pick a month, write (or read) its recap. */
export function RecapPanel({ months, initialRecaps }: RecapPanelProps) {
  const t = useTranslations("insights.recap");
  const locale = useLocale();
  const selectId = useId();

  const [recaps, setRecaps] = useState<Record<string, RecapEntry>>(() =>
    Object.fromEntries(initialRecaps.map((recap) => [keyOf(recap.year, recap.month), recap]))
  );
  const newestFirst = [...months].reverse();

  const [selected, setSelected] = useState(() => {
    const preferred =
      newestFirst.find((m) => recaps[keyOf(m.year, m.month)] || m.count >= MIN_READINGS) ?? newestFirst[0];
    return preferred ? keyOf(preferred.year, preferred.month) : "";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<RecapError | null>(null);

  const month = newestFirst.find((m) => keyOf(m.year, m.month) === selected);
  if (!month) return null;

  const recap = recaps[selected];
  const canWrite = month.count >= MIN_READINGS;
  // Any month (not only the current one) can have readings the saved recap didn't cover.
  const hasNewReadings = Boolean(recap) && month.count > (recap?.readingCount ?? 0);

  async function generate() {
    if (!month || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/insights/recap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: month.year, month: month.month, locale }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.recap) {
        setRecaps((prev) => ({ ...prev, [keyOf(month.year, month.month)]: data.recap }));
      } else if (res.status === 503) {
        setError("unavailable");
      } else if (res.status === 422) {
        setError("refused");
      } else if (data?.error === "not_enough_readings") {
        setError("needMore");
      } else {
        setError("error");
      }
    } catch {
      setError("error");
    } finally {
      setLoading(false);
    }
  }

  const paragraphs = recap ? recap.content.split(/\n+/).map((p) => p.trim()).filter(Boolean) : [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-5">
        <div className="flex-1">
          <label htmlFor={selectId} className="block text-sm text-slate-400 mb-1.5">
            {t("selectMonth")}
          </label>
          <select
            id={selectId}
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setError(null);
            }}
            disabled={loading}
            className="w-full sm:max-w-xs px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {newestFirst.map((m) => (
              <option key={keyOf(m.year, m.month)} value={keyOf(m.year, m.month)}>
                {t("monthOption", { label: m.label, count: m.count })}
              </option>
            ))}
          </select>
        </div>
        <Badge variant="success" className="self-start sm:self-auto">
          {t("free")}
        </Badge>
      </div>

      <div aria-live="polite" aria-busy={loading}>
        {loading ? (
          <div className="space-y-3" role="status">
            <p className="text-purple-300 motion-safe:animate-pulse">{t("generating")}</p>
            <div className="space-y-2" aria-hidden="true">
              <div className="h-3 rounded bg-slate-800 w-full motion-safe:animate-pulse" />
              <div className="h-3 rounded bg-slate-800 w-11/12 motion-safe:animate-pulse" />
              <div className="h-3 rounded bg-slate-800 w-4/5 motion-safe:animate-pulse" />
            </div>
          </div>
        ) : recap ? (
          <article>
            <h3 className="text-lg font-semibold text-amber-200 mb-3">{month.label}</h3>
            <div className="space-y-4 text-slate-300 leading-relaxed">
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
            {hasNewReadings && (
              <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
                <p className="text-sm text-slate-400">{t("newReadings")}</p>
                <Button variant="secondary" size="sm" onClick={generate}>
                  {t("update")}
                </Button>
              </div>
            )}
          </article>
        ) : canWrite ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-slate-300 flex-1">{t("ready", { count: month.count })}</p>
            <Button onClick={generate}>{t("generate")}</Button>
          </div>
        ) : (
          <p className="text-slate-400">{t("needMore", { count: month.count, min: MIN_READINGS })}</p>
        )}

        {error && !loading && (
          <p role="alert" className="mt-4 text-sm text-red-300">
            {error === "needMore" ? t("needMore", { count: month.count, min: MIN_READINGS }) : t(error)}
          </p>
        )}
      </div>
    </div>
  );
}

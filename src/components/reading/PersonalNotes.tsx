"use client";

import { useState, useEffect, useCallback, useId } from "react";
import { useTranslations } from "next-intl";

interface PersonalNotesProps {
  readingId: string;
  initialNotes?: string | null;
}

export function PersonalNotes({ readingId, initialNotes }: PersonalNotesProps) {
  const t = useTranslations("reading");
  const fieldId = useId();
  const [notes, setNotes] = useState(initialNotes || "");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Debounced save function
  const saveNotes = useCallback(async (content: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/readings/${readingId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalNotes: content }),
      });

      if (res.ok) {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error("Error saving notes:", error);
    } finally {
      setSaving(false);
    }
  }, [readingId]);

  // Debounce effect
  useEffect(() => {
    if (notes === initialNotes) return;

    const timer = setTimeout(() => {
      saveNotes(notes);
    }, 1000); // 1 second debounce

    return () => clearTimeout(timer);
  }, [notes, initialNotes, saveNotes]);

  return (
    <section aria-labelledby={`${fieldId}-titulo`} className="grid max-w-[760px] gap-4 border-t border-filete/20 pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={`${fieldId}-titulo`} className="font-titulo text-[clamp(1.4rem,1.15rem+0.8vw,1.8rem)] leading-[1.1]">
          <label htmlFor={fieldId}>{t("notes.title")}</label>
        </h2>
        <p className="font-dato text-[0.6875rem] tracking-[0.08em] text-letra-suave" aria-live="polite">
          {saving ? (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-rosa motion-safe:animate-pulse" />
              {t("notes.saving")}
            </span>
          ) : lastSaved ? (
            <span className="text-letra-exito">
              <span aria-hidden="true">✓ </span>
              {t("notes.saved")}
            </span>
          ) : null}
        </p>
      </div>

      <textarea
        id={fieldId}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={t("notes.placeholder")}
        aria-describedby={`${fieldId}-pista`}
        className="block min-h-[150px] w-full resize-y rounded-none border-0 border-y border-filete/40 bg-transparent px-0 py-3 font-lectura text-[1.0625rem] leading-[1.6] text-letra placeholder:text-letra-suave focus:border-rosa focus:shadow-[0_1px_0_0_var(--color-rosa)] focus:outline-none"
      />

      <p id={`${fieldId}-pista`} className="font-dato text-[0.6875rem] leading-[1.5] tracking-[0.04em] text-letra-suave">
        {t("notes.hint")}
      </p>
    </section>
  );
}

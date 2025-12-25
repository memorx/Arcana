"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui";

interface PersonalNotesProps {
  readingId: string;
  initialNotes?: string | null;
}

export function PersonalNotes({ readingId, initialNotes }: PersonalNotesProps) {
  const t = useTranslations("reading");
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
    <Card className="mt-8">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <span className="text-xl">&#128221;</span>
            {t("notes.title")}
          </h3>
          <div className="text-xs text-slate-500">
            {saving ? (
              <span className="flex items-center gap-1">
                <span className="animate-pulse">&#9679;</span>
                {t("notes.saving")}
              </span>
            ) : lastSaved ? (
              <span className="text-green-500">&#10003; {t("notes.saved")}</span>
            ) : null}
          </div>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("notes.placeholder")}
          className="w-full min-h-[150px] p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 resize-y focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />

        <p className="mt-2 text-xs text-slate-500">
          {t("notes.hint")}
        </p>
      </CardContent>
    </Card>
  );
}

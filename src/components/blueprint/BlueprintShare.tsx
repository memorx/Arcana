"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";

interface BlueprintShareProps {
  initialShareId: string | null;
}

/**
 * Public link of the Arcana Map: create it (POST /api/blueprint/share, copies
 * it right away), copy it again, share it natively, or stop sharing (DELETE).
 */
export function BlueprintShare({ initialShareId }: BlueprintShareProps) {
  const t = useTranslations("blueprint.share");
  const [shareId, setShareId] = useState<string | null>(initialShareId);
  const [busy, setBusy] = useState<"create" | "stop" | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setCanNativeShare(typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(id);
  }, [copied]);

  const url = shareId ? `${origin}/share/blueprint/${shareId}` : "";

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard blocked: the link stays visible and selectable in the field.
    }
  };

  const create = async () => {
    setBusy("create");
    setError(null);
    try {
      const res = await fetch("/api/blueprint/share", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.shareId !== "string") {
        setError(
          res.status === 409 ? t("errors.synthesisRequired") : res.status === 429 ? t("errors.rateLimited") : t("errors.generic")
        );
        return;
      }
      setShareId(data.shareId);
      await copy(`${window.location.origin}/share/blueprint/${data.shareId}`);
    } catch {
      setError(t("errors.generic"));
    } finally {
      setBusy(null);
    }
  };

  const stop = async () => {
    setBusy("stop");
    setError(null);
    try {
      const res = await fetch("/api/blueprint/share", { method: "DELETE" });
      if (!res.ok) {
        setError(res.status === 429 ? t("errors.rateLimited") : t("errors.generic"));
        return;
      }
      setShareId(null);
      setCopied(false);
    } catch {
      setError(t("errors.generic"));
    } finally {
      setBusy(null);
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: t("nativeTitle"), url });
    } catch {
      // Cancelled by the person, or not allowed: nothing to do.
    }
  };

  return (
    <section aria-labelledby="blueprint-share-title" className="mt-8 border-t border-slate-800/80 pt-6">
      <h3 id="blueprint-share-title" className="text-base font-semibold text-slate-100">
        {t("title")}
      </h3>
      <p className="mt-1 text-sm text-slate-400">{t("note")}</p>

      {!shareId ? (
        <Button
          variant="secondary"
          className="mt-4 w-full sm:w-auto"
          onClick={create}
          isLoading={busy === "create"}
        >
          {t("create")}
        </Button>
      ) : (
        <div className="mt-4 space-y-3">
          <label htmlFor="blueprint-share-url" className="block text-xs text-slate-500">
            {t("linkLabel")}
          </label>
          <div className="flex flex-col gap-2 min-[420px]:flex-row">
            <input
              id="blueprint-share-url"
              type="text"
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-300 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
            <Button size="sm" onClick={() => copy(url)} aria-label={t("copyAria")} disabled={!url}>
              {copied ? t("copied") : t("copy")}
            </Button>
          </div>
          <p aria-live="polite" className="sr-only">
            {copied ? t("copied") : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {canNativeShare && (
              <Button variant="secondary" size="sm" onClick={nativeShare}>
                {t("native")}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={stop} isLoading={busy === "stop"}>
              {t("stop")}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}

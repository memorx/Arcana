"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";

interface BlueprintShareProps {
  initialShareId: string | null;
  /**
   * Whether a new link may be created (there is a current synthesis). When
   * false, an existing link can still be copied or revoked.
   */
  canCreate?: boolean;
}

/**
 * Public link of the Arcana Map. Creating it takes one confirmation step: the
 * privacy notice is shown with a "Create link" button (POST
 * /api/blueprint/share, then the link is copied). The link can be copied
 * again, shared natively, or revoked (DELETE).
 */
export function BlueprintShare({ initialShareId, canCreate = true }: BlueprintShareProps) {
  const t = useTranslations("blueprint.share");
  const [shareId, setShareId] = useState<string | null>(initialShareId);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<"create" | "stop" | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [canNativeShare, setCanNativeShare] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    setCanNativeShare(typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(id);
  }, [copied]);

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

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
      setConfirming(false);
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

  if (!shareId && !canCreate) return null;

  return (
    <section aria-labelledby="blueprint-share-title" className="mt-8 border-t border-slate-800/80 pt-6">
      <h3 id="blueprint-share-title" className="text-base font-semibold text-slate-100">
        {t("title")}
      </h3>

      {shareId ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-slate-400">{t("note")}</p>
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
            <Button
              size="sm"
              onClick={() => copy(url)}
              aria-label={copied ? t("copied") : t("copyAria")}
              disabled={!url}
            >
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
      ) : confirming ? (
        <div
          ref={confirmRef}
          tabIndex={-1}
          role="group"
          aria-labelledby="blueprint-share-notice"
          className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
        >
          <p id="blueprint-share-notice" className="text-sm leading-relaxed text-amber-100">
            {t("note")}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button onClick={create} isLoading={busy === "create"} className="w-full sm:w-auto">
              {t("create")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setConfirming(false)}
              disabled={busy === "create"}
              className="w-full sm:w-auto"
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-400">{t("intro")}</p>
          <Button variant="secondary" className="mt-4 w-full sm:w-auto" onClick={() => setConfirming(true)}>
            {t("start")}
          </Button>
        </>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}

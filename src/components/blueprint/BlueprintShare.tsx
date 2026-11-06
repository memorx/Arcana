"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";

/** A notice with the pink rule of the reading's intention (lectura.html). */
const AVISO = "border-l-2 border-rosa pl-4 text-[1.0625rem] leading-[1.6]";

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
    <section aria-labelledby="blueprint-share-title" className="mt-10 border-t border-filete/25 pt-7">
      <h3 id="blueprint-share-title" className="text-[1.45rem] leading-[1.15]">
        {t("title")}
      </h3>

      {shareId ? (
        <div className="mt-4 grid gap-4">
          <p className={AVISO}>{t("note")}</p>
          <div className="flex flex-col gap-3 min-[480px]:flex-row min-[480px]:items-end">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="blueprint-share-url"
                className="mb-1.5 block font-dato text-[0.6875rem] leading-[1.4] tracking-[0.12em] text-letra-suave uppercase"
              >
                {t("linkLabel")}
              </label>
              <input
                id="blueprint-share-url"
                type="text"
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="min-h-11 w-full min-w-0 rounded-none border-0 border-b border-filete/50 bg-transparent px-0 py-2.5 font-dato text-[0.8125rem] text-letra focus:border-rosa focus:shadow-[0_1px_0_0_var(--color-rosa)] focus:outline-none"
              />
            </div>
            <Button
              size="sm"
              onClick={() => copy(url)}
              aria-label={copied ? t("copied") : t("copyAria")}
              disabled={!url}
              className="shrink-0"
            >
              {copied ? t("copied") : t("copy")}
            </Button>
          </div>
          <p aria-live="polite" className="sr-only">
            {copied ? t("copied") : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {canNativeShare && (
              <Button variant="linea" size="sm" onClick={nativeShare}>
                {t("native")}
              </Button>
            )}
            <Button variant="fantasma" size="sm" onClick={stop} isLoading={busy === "stop"}>
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
          className="mt-4 grid gap-4 bg-papel-hondo p-5 focus:outline-none focus-visible:outline-2 focus-visible:outline-rosa sm:p-6"
        >
          <p id="blueprint-share-notice" className={AVISO}>
            {t("note")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={create} isLoading={busy === "create"} className="w-full sm:w-auto">
              {t("create")}
            </Button>
            <Button
              variant="fantasma"
              onClick={() => setConfirming(false)}
              disabled={busy === "create"}
              className="w-full sm:w-auto"
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid justify-items-start gap-4">
          <p className="max-w-[56ch] text-letra-suave">{t("intro")}</p>
          <Button variant="linea" className="w-full sm:w-auto" onClick={() => setConfirming(true)}>
            {t("start")}
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className={`${AVISO} mt-4 border-letra-error text-letra-error`}>
          {error}
        </p>
      )}
    </section>
  );
}

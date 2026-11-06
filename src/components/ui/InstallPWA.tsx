"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

/**
 * Invitación a instalar la PWA, en dos tintas: una banda de tinta `sticky` al pie de la ventana. Como es
 * sticky (no fixed) y es el último hijo del body, al final de la página ocupa su propio lugar: no tapa de
 * forma permanente ningún contenido, tampoco en móvil. Entra con un fundido corto (nada con movimiento
 * reducido) y sólo aparece cuando el navegador ofrece instalar.
 */
export function InstallPWA() {
  const t = useTranslations("pwa");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShowInstall(false);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowInstall(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowInstall(false);
    // Store dismissal in sessionStorage so it doesn't show again this session
    sessionStorage.setItem("pwa-install-dismissed", "true");
  };

  // Check if user already dismissed
  useEffect(() => {
    if (sessionStorage.getItem("pwa-install-dismissed") === "true") {
      setShowInstall(false);
    }
  }, []);

  if (!showInstall) return null;

  return (
    <aside
      aria-labelledby="pwa-titulo"
      className="suelo-tinta sticky bottom-0 z-40 w-full border-t border-papel/15 pb-[env(safe-area-inset-bottom,0px)] motion-safe:animate-entra"
    >
      <div className="mx-auto flex max-w-escena flex-wrap items-center gap-x-6 gap-y-3 px-gutter py-3.5">
        <div className="flex min-w-0 flex-[1_1_16rem] items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-rosa-luz/60 text-rosa-luz">
            <DownloadIcon className="size-[18px]" />
          </span>
          <div className="grid min-w-0 gap-0.5">
            <p id="pwa-titulo" className="font-titulo text-[1.15rem] leading-tight text-papel">
              {t("installTitle")}
            </p>
            <p className="text-[0.9375rem] leading-snug text-niebla">{t("installPrompt")}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleInstall}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-rosa-luz px-5 font-dato text-[0.6875rem] font-medium tracking-[0.1em] text-tinta uppercase transition-colors hover:bg-brasa"
          >
            {t("install")}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-full px-4 font-dato text-[0.6875rem] font-medium tracking-[0.1em] text-niebla uppercase transition-colors hover:bg-papel/10 hover:text-papel"
          >
            {t("later")}
          </button>
        </div>
      </div>
    </aside>
  );
}

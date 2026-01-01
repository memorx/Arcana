"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}

export function InstallPWA() {
  const t = useTranslations("pwa");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
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
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-purple-900/95 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4 shadow-xl z-50 animate-in slide-in-from-bottom-4 duration-300">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-purple-300 hover:text-white transition-colors"
        aria-label={t("later")}
      >
        <CloseIcon className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-purple-600/50 rounded-lg flex items-center justify-center">
          <DownloadIcon className="w-5 h-5 text-purple-200" />
        </div>
        <div className="flex-1 pr-4">
          <p className="text-white text-sm font-medium mb-1">
            {t("installTitle")}
          </p>
          <p className="text-purple-200 text-xs mb-3">{t("installPrompt")}</p>
        </div>
      </div>

      <div className="flex gap-2 mt-2">
        <button
          onClick={handleInstall}
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-4 rounded-lg transition-colors font-medium"
        >
          {t("install")}
        </button>
        <button
          onClick={handleDismiss}
          className="px-4 py-2 text-purple-300 hover:text-white text-sm transition-colors"
        >
          {t("later")}
        </button>
      </div>
    </div>
  );
}

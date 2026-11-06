"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSounds } from "@/lib/sounds";
import { cn } from "@/lib/utils";

interface SoundToggleProps {
  className?: string;
}

/** Botón de icono (44 px) que toma el color de su suelo; encendido va en el rosa de texto. */
export function SoundToggle({ className = "" }: SoundToggleProps) {
  const t = useTranslations("sound");
  const { isEnabled, toggle } = useSounds();
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setEnabled(isEnabled());
  }, [isEnabled]);

  const handleToggle = () => {
    const newState = toggle();
    setEnabled(newState);
  };

  // Hasta montar no sabemos la preferencia (localStorage): reservamos el hueco para no mover la cabecera.
  if (!mounted) {
    return <span aria-hidden="true" className={cn("inline-block size-11 shrink-0", className)} />;
  }

  const label = enabled ? t("disable") : t("enable");

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-current/10",
        enabled ? "text-letra-acento" : "text-letra-suave hover:text-letra",
        className
      )}
      title={label}
      aria-label={label}
    >
      {enabled ? (
        <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.6}
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
        </svg>
      ) : (
        <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.6}
            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
      )}
    </button>
  );
}

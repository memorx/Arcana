"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Locale, locales } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { recargarPagina } from "./recargar-pagina";

const localeCodes: Record<Locale, string> = {
  es: "ES",
  en: "EN",
};

// Cada idioma se nombra en sí mismo (con su `lang`).
const localeNames: Record<Locale, string> = {
  es: "Español",
  en: "English",
};

interface LanguageSelectorProps {
  /** `menu` (por omisión): botón que abre la lista. `inline`: los dos idiomas a la vista (menú móvil). */
  variant?: "menu" | "inline";
  className?: string;
}

export function LanguageSelector({ variant = "menu", className }: LanguageSelectorProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("nav");
  const [cambiando, setCambiando] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [isOpen]);

  const handleLocaleChange = async (newLocale: Locale) => {
    if (newLocale === locale) {
      setIsOpen(false);
      return;
    }

    setCambiando(true);
    try {
      const res = await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: newLocale }),
      });
      if (!res.ok) throw new Error(`POST /api/locale: ${res.status}`);
      // Recarga completa, no router.refresh(): el idioma cambia todo el documento (lang, metadata, textos del
      // servidor) y la recarga no depende de la respuesta RSC del refresh. En la portada Chrome a veces corta
      // esa respuesta (net::ERR_ABORTED) y la transición del router se quedaba pendiente para siempre: la
      // página no cambiaba y el selector quedaba deshabilitado (parte I2 de la Fase 3).
      recargarPagina();
      return;
    } catch (error) {
      console.error("Error changing locale:", error);
    }

    setCambiando(false);
    setIsOpen(false);
  };

  const opcion = (loc: Locale, extra?: string) => (
    <>
      <span lang={loc} className={cn("font-lectura text-[0.9375rem] tracking-normal normal-case", extra)}>
        {localeNames[loc]}
      </span>{" "}
      <span>{localeCodes[loc]}</span>
    </>
  );

  if (variant === "inline") {
    return (
      <div role="group" aria-label={t("language")} className={cn("flex flex-wrap gap-2", className)}>
        {locales.map((loc) => (
          <button
            key={loc}
            type="button"
            onClick={() => handleLocaleChange(loc)}
            disabled={cambiando}
            aria-pressed={loc === locale}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 font-dato text-xs tracking-[0.1em] uppercase transition-colors disabled:opacity-50",
              loc === locale
                ? "border-rosa-luz bg-rosa-luz text-tinta"
                : "border-current/40 hover:border-current"
            )}
          >
            {opcion(loc)}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={cambiando}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 font-dato text-[0.6875rem] tracking-[0.1em] uppercase transition-colors hover:bg-current/10 disabled:opacity-50"
        aria-label="Change language"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span aria-hidden="true">{localeCodes[locale]}</span>
        <svg
          aria-hidden="true"
          className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setIsOpen(false)} />
          <div className="suelo-tinta absolute right-0 z-20 mt-2 w-44 rounded-sm border border-filete/20 py-1">
            {locales.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => handleLocaleChange(loc)}
                aria-current={loc === locale ? "true" : undefined}
                className={cn(
                  "flex min-h-11 w-full items-center gap-2 px-4 text-left font-dato text-xs tracking-[0.1em] uppercase transition-colors hover:bg-filete/10",
                  loc === locale ? "text-letra-acento" : "text-letra"
                )}
              >
                {opcion(loc, "flex-1")}
                {loc === locale && (
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

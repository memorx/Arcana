"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getMoonPhase, getTonalli, todayUtc, type Locale } from "@/lib/systems";
import { cn } from "@/lib/utils";

export type VarianteHora = "larga" | "corta";

export interface HoraDelDiaProps {
  /** larga: «jue 5 nov 2026 · 1 Mázatl (Venado) · Señor de la noche: Tláloc · Luna menguante 19%».
   *  corta: «5 nov · 1 Mázatl · Tláloc · Luna 19%». */
  variante?: VarianteHora;
  /** Día a mostrar, a las 00:00 UTC. Por omisión `todayUtc()`: la misma
   *  convención que /calendar y la carta del día (nunca la hora local). */
  fecha?: Date;
  className?: string;
}

const MS_DIA = 86_400_000;

/**
 * La hora del día de la cabecera: fecha, tonalli (número y signo), señor de la
 * noche y luna, todo de `@/lib/systems`. El texto sólo depende del día UTC, así
 * que el HTML del servidor y el primer render del cliente coinciden; si la
 * pestaña cruza la medianoche UTC, se vuelve a pintar sola.
 */
export function HoraDelDia({ variante = "larga", fecha, className }: HoraDelDiaProps) {
  const t = useTranslations("hora");
  const locale: Locale = useLocale() === "en" ? "en" : "es";
  const [vuelta, setVuelta] = useState(0);

  useEffect(() => {
    if (fecha) return;
    const falta = MS_DIA - (Date.now() % MS_DIA) + 1000;
    const id = window.setTimeout(() => setVuelta((n) => n + 1), falta);
    return () => window.clearTimeout(id);
  }, [fecha, vuelta]);

  const dia = fecha ?? todayUtc();
  const tonalli = getTonalli(dia);
  const luna = getMoonPhase(dia);
  const luz = String(Math.round(luna.illumination * 100));
  const partesFecha = {
    diaSemana: String(dia.getUTCDay()),
    dia: String(dia.getUTCDate()),
    mes: String(dia.getUTCMonth() + 1),
    anio: String(dia.getUTCFullYear()),
  };
  const signo = `${tonalli.number} ${tonalli.sign.nahuatl}`;

  const fechaTexto = variante === "larga" ? t("fechaLarga", partesFecha) : t("fechaCorta", partesFecha);
  const resto =
    variante === "larga"
      ? [
          t("tonalli", {
            numero: String(tonalli.number),
            signo: tonalli.sign.nahuatl,
            nombre: tonalli.sign.name[locale],
          }),
          t("senor", { nombre: tonalli.lordOfNight.nahuatl }),
          t("luna", { fase: luna.name[locale], luz }),
        ]
      : [signo, tonalli.lordOfNight.nahuatl, t("lunaCorta", { luz })];

  return (
    <p
      data-variante={variante}
      className={cn(
        "font-dato text-[0.6875rem] leading-[1.5] tracking-[0.08em] uppercase",
        // En 360 px la corta casi no cabe: menos tracking abajo de sm y puntos suspensivos si aún no alcanza.
        variante === "corta" && "truncate tracking-[0.04em] sm:tracking-[0.08em]",
        className
      )}
    >
      <span className="sr-only">{t("hoy")}: </span>
      <time dateTime={dia.toISOString().slice(0, 10)} suppressHydrationWarning>
        {fechaTexto}
      </time>
      <span suppressHydrationWarning>{resto.map((parte) => ` · ${parte}`).join("")}</span>
    </p>
  );
}

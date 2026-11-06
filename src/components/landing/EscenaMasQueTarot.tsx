import Link from "next/link";
import type { ReactNode } from "react";
import { Escena } from "@/components/tinta/Escena";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import type { Traducir } from "./tipos";

interface Lamina {
  clave: string;
  href: string;
  titulo: string;
  descripcion: string;
  cta: string;
  glifo: ReactNode;
}

/* Glifos de la maqueta: línea de grabado (color de la letra) con un punto de tinta rosa. */
const GLIFOS: Record<string, ReactNode> = {
  blueprint: (
    <>
      <circle cx="22" cy="22" r="4" className="fill-rosa" />
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        <circle cx="22" cy="5" r="3" />
        <circle cx="38" cy="17" r="3" />
        <circle cx="32" cy="37" r="3" />
        <circle cx="12" cy="37" r="3" />
        <circle cx="6" cy="17" r="3" />
        <path d="M22 18V8M25.6 20.8 35.3 18M24.4 25.4l5.8 9.2M19.6 25.4l-5.8 9.2M18.4 20.8 8.7 18" />
      </g>
    </>
  ),
  calendar: (
    <>
      <circle cx="22" cy="22" r="17" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M22 3v5M22 36v5M3 22h5M36 22h5M8.6 8.6l3.5 3.5M31.9 31.9l3.5 3.5M8.6 35.4l3.5-3.5M31.9 12.1l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <circle cx="22" cy="22" r="5" className="fill-rosa" />
    </>
  ),
  compatibility: (
    <>
      <circle cx="16" cy="22" r="11" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="28" cy="22" r="11" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M22 12.8a11 11 0 0 1 0 18.4a11 11 0 0 1 0-18.4z" className="fill-rosa" />
    </>
  ),
  manual: (
    <>
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        <rect x="8" y="9" width="18" height="28" rx="2" transform="rotate(-10 17 23)" />
        <rect x="16" y="7" width="18" height="28" rx="2" transform="rotate(6 25 21)" />
      </g>
      <circle cx="25" cy="21" r="3" className="fill-rosa" />
    </>
  ),
  history: (
    <>
      <path
        d="M22 22m-3 0a3 3 0 1 1 6 0a7 7 0 1 1-14 0a11 11 0 1 1 22 0a15 15 0 1 1-30 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <circle cx="22" cy="22" r="2.4" className="fill-rosa" />
    </>
  ),
};

interface EscenaMasQueTarotProps {
  /** `getTranslations("pulse")`: títulos y descripciones de «Más que tarot». */
  tPulse: Traducir;
  /** `getTranslations("landing")`: lo nuevo de la portada. */
  t: Traducir;
}

/** Escena 4 · Más que tarot (suelo papel): tira densa de cinco láminas con sus rutas. */
export function EscenaMasQueTarot({ tPulse, t }: EscenaMasQueTarotProps) {
  const laminas: Lamina[] = [
    ...(["blueprint", "calendar", "compatibility", "manual"] as const).map((clave) => ({
      clave,
      href: { blueprint: "/blueprint", calendar: "/calendar", compatibility: "/compatibility", manual: "/reading/manual" }[
        clave
      ],
      titulo: tPulse(`moreThanTarot.${clave}.title`),
      descripcion: tPulse(`moreThanTarot.${clave}.description`),
      cta: t(`portada.masQueTarot.${clave}`),
      glifo: GLIFOS[clave],
    })),
    {
      clave: "history",
      href: "/history",
      titulo: t("portada.masQueTarot.historia.titulo"),
      descripcion: t("portada.masQueTarot.historia.descripcion"),
      cta: t("portada.masQueTarot.historia.cta"),
      glifo: GLIFOS.history,
    },
  ];

  return (
    <Escena suelo="papel" aria-labelledby="more-than-tarot-title" className="portada-mas">
      <div className="portada-contenido">
        <div className="portada-mas__cabeza" data-revelar>
          <h2 id="more-than-tarot-title" className="portada-h2-chico">
            {tPulse("moreThanTarot.title")}
          </h2>
          <Etiqueta>{t("portada.masQueTarot.etiqueta")}</Etiqueta>
        </div>
        <ul className="portada-tira">
          {laminas.map((l) => (
            <li key={l.clave}>
              <svg viewBox="0 0 44 44" aria-hidden="true" focusable="false" className="portada-tira__glifo">
                {l.glifo}
              </svg>
              <h3>{l.titulo}</h3>
              <p>{l.descripcion}</p>
              <Link href={l.href} className="portada-tira__enlace">
                {l.cta}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Escena>
  );
}

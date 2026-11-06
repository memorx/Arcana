import type { ReactNode } from "react";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { MEDIDAS_CARTA, cartaImagen } from "@/lib/cartas";

/**
 * Formularios de cuenta como pliego impreso sobre papel (rediseño «Dos tintas»):
 * filete de tinta, la hoja de abajo asomada, etiqueta en mono con el punto rosa,
 * el título en Gloock como el único h1 de la página y el cuerpo en Newsreader.
 * Lo usan /login, /register, /forgot-password y /reset-password. Sin JS se ve completo.
 */
export interface PliegoProps {
  /** id del h1 (la sección se nombra con él). */
  tituloId: string;
  etiqueta: string;
  titulo: string;
  bajada?: ReactNode;
  /**
   * Grabado en tinta asomado detrás del pliego, desde 1024 px (decorativo, alt=""): nombre en inglés de
   * una de las 78 (p. ej. "The Magician").
   */
  grabado?: string;
  children?: ReactNode;
}

export function Pliego({ tituloId, etiqueta, titulo, bajada, grabado, children }: PliegoProps) {
  return (
    <div className="relative w-full max-w-[30rem]">
      {grabado && (
        // eslint-disable-next-line @next/next/no-img-element -- WebP autohospedada y ya optimizada (scripts/cartas.py)
        <img
          src={cartaImagen(grabado, "tinta")}
          alt=""
          width={MEDIDAS_CARTA.tinta.width}
          height={MEDIDAS_CARTA.tinta.height}
          loading="lazy"
          decoding="async"
          className="pointer-events-none absolute top-14 -left-[150px] hidden w-[170px] -rotate-[7deg] rounded-[4px] mix-blend-multiply select-none lg:block"
        />
      )}
      <section
        aria-labelledby={tituloId}
        className="suelo-papel relative w-full border border-tinta/80 px-[clamp(20px,5vw,40px)] py-[clamp(28px,5vw,44px)] shadow-[8px_8px_0_-1px_var(--color-papel-hondo),8px_8px_0_0_rgb(14_13_12/0.22)]"
      >
        <header className="grid gap-3 border-b border-tinta/15 pb-6">
          <Etiqueta>{etiqueta}</Etiqueta>
          <h1 id={tituloId} className="text-[clamp(2rem,1.55rem+1.5vw,2.6rem)] leading-[1.05] text-tinta">
            {titulo}
          </h1>
          {bajada && <p className="text-[1.0625rem] leading-snug text-grafito">{bajada}</p>}
        </header>
        {children && <div className="mt-7">{children}</div>}
      </section>
    </div>
  );
}

/** Aviso de error del formulario: semántico (role=alert) y en el rojo de error del suelo. */
export function AvisoError({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="mb-6 border-l-2 border-letra-error bg-error/5 py-2.5 pr-3 pl-3.5 text-[0.9375rem] leading-snug text-letra-error"
    >
      {children}
    </p>
  );
}

/** Separador «o continuar con» entre filetes. */
export function Separador({ children }: { children: ReactNode }) {
  return (
    <div className="my-7 flex items-center gap-4">
      <span aria-hidden="true" className="h-px flex-1 bg-tinta/20" />
      <span className="font-dato text-[0.6875rem] tracking-[0.12em] text-grafito uppercase">{children}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-tinta/20" />
    </div>
  );
}

/** Esqueleto de los campos mientras se resuelve el formulario (papel hondo; sin pulso con movimiento reducido). */
export function CamposEsqueleto({ campos = 2 }: { campos?: number }) {
  return (
    <div aria-hidden="true" className="grid gap-6">
      {Array.from({ length: campos }, (_, i) => (
        <div key={i} className="grid gap-2">
          <div className="h-3 w-24 bg-papel-hondo motion-safe:animate-pulse" />
          <div className="h-10 border-b border-tinta/20 bg-papel-hondo/60 motion-safe:animate-pulse" />
        </div>
      ))}
      <div className="h-14 rounded-full bg-papel-hondo motion-safe:animate-pulse" />
    </div>
  );
}

/** Enlace de texto del pliego: rosa de texto, subrayado fino, objetivo táctil de 44 px. */
export const ENLACE_PLIEGO =
  "inline-flex min-h-11 items-center text-rosa-texto underline decoration-rosa-texto/40 underline-offset-4 transition-colors hover:decoration-rosa-texto";

/** Ícono de Google en línea (toma el color de la letra). */
export function IconoGoogle() {
  return (
    <svg aria-hidden="true" focusable="false" className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

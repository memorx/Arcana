import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { numeroRomano, partirInterpretacion } from "./disposicion";

/** Comillas del idioma de la página: «…» en español, “…” en inglés. */
export function entreComillas(texto: string, locale: string) {
  return locale === "en" ? `“${texto}”` : `«${texto}»`;
}

export interface IntencionCitaProps {
  titulo: string;
  intencion: string;
  locale: string;
  /** id del título (h2): la cita es una sección de la lectura. */
  id?: string;
  className?: string;
}

/** La pregunta de la persona, en cursiva con el filete rosa a la izquierda (como la maqueta). */
export function IntencionCita({ titulo, intencion, locale, id = "intencion-titulo", className }: IntencionCitaProps) {
  return (
    <section aria-labelledby={id} className={cn("grid gap-3", className)}>
      <h2 id={id} className="font-dato text-xs leading-[1.4] tracking-[0.12em] text-letra-suave uppercase">
        {titulo}
      </h2>
      <blockquote className="max-w-[46ch] border-l-2 border-rosa pl-[18px] font-lectura text-[clamp(1.15rem,1rem+0.5vw,1.4rem)] leading-[1.45] break-words italic">
        {entreComillas(intencion, locale)}
      </blockquote>
    </section>
  );
}

export interface InterpretacionProps {
  titulo: string;
  texto: string;
  /** Junto al título (p. ej. <ReadAloud>). */
  accion?: ReactNode;
  /** Debajo del texto (acciones de la lectura). */
  children?: ReactNode;
  id?: string;
  className?: string;
}

/**
 * La interpretación como pliego: Newsreader a ~66 caracteres por renglón, y las preguntas con que cierra en cursiva
 * bajo un filete.
 */
export function Interpretacion({ titulo, texto, accion, children, id = "interpretacion-titulo", className }: InterpretacionProps) {
  const { parrafos, preguntas } = partirInterpretacion(texto);
  return (
    <article aria-labelledby={id} className={cn("max-w-[66ch] scroll-mt-(--alto-cabecera)", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h2 id={id} className="font-titulo text-[clamp(1.6rem,1.2rem+1.2vw,2.2rem)] leading-[1.05]">
          {titulo}
        </h2>
        {accion}
      </div>
      <div className="mt-6 grid gap-[1.1em] font-lectura text-[1.0625rem] leading-[1.7] break-words sm:text-[1.125rem]">
        {parrafos.map((parrafo, i) => (
          <p key={i}>{parrafo}</p>
        ))}
        {preguntas.length > 0 && (
          <div className="grid gap-[0.6em] border-t border-filete/20 pt-[1em] italic">
            {preguntas.map((pregunta, i) => (
              <p key={i}>{pregunta}</p>
            ))}
          </div>
        )}
      </div>
      {children}
    </article>
  );
}

export interface SignificadoCarta {
  numero: number;
  posicion: string;
  nombre: string;
  invertida: boolean;
  significado: string;
  claves: string[];
}

/** Lo que dice cada carta: posición, carta, significado y palabras clave, como índice al pie de la tirada. */
export function SignificadosCartas({
  cartas,
  textos,
}: {
  cartas: SignificadoCarta[];
  textos: { reversed: string; meaning: string };
}) {
  return (
    <ol className="grid gap-x-12 gap-y-8 md:grid-cols-2">
      {cartas.map((c) => (
        <li key={c.numero} className="grid content-start gap-2 border-t border-filete/20 pt-4">
          <p className="font-dato text-[0.6875rem] leading-[1.4] tracking-[0.12em] text-letra-suave uppercase">
            <span aria-hidden="true">{numeroRomano(c.numero)} · </span>
            {c.posicion}
          </p>
          <h3 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-titulo text-[1.35rem] leading-tight">
            {c.nombre}
            {c.invertida && (
              <span className="font-dato text-[0.6875rem] tracking-[0.12em] text-letra-acento uppercase">
                {textos.reversed}
              </span>
            )}
          </h3>
          <p className="font-lectura leading-relaxed">
            <span className="sr-only">{textos.meaning} </span>
            {c.significado}
          </p>
          {c.claves.length > 0 && (
            <p className="font-dato text-[0.625rem] leading-[1.6] tracking-[0.1em] text-letra-suave uppercase">
              {c.claves.slice(0, 3).join(" · ")}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

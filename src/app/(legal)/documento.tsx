import Link from "next/link";
import { Etiqueta } from "@/components/tinta/Etiqueta";

/**
 * Páginas legales (about, privacy, terms) como un documento impreso sobre papel: «volver» en mono,
 * etiqueta, el título como único h1, y cada apartado con su filete, su número en mono y el texto en
 * Newsreader a ~66 caracteres. Componente de servidor: sin JS se ve completo.
 */
export interface Apartado {
  clave: string;
  titulo: string;
  contenido: string;
  /** Aviso destacado (filete rosa a la izquierda). */
  aviso?: boolean;
}

export interface DocumentoProps {
  volver: string;
  etiqueta: string;
  titulo: string;
  intro?: string;
  apartados: Apartado[];
}

export function Documento({ volver, etiqueta, titulo, intro, apartados }: DocumentoProps) {
  return (
    <article className="mx-auto grid w-full max-w-pliego gap-[clamp(32px,6vh,56px)] px-gutter py-[clamp(32px,6vh,64px)]">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center gap-2 justify-self-start font-dato text-[0.6875rem] tracking-[0.12em] text-grafito uppercase transition-colors hover:text-tinta"
      >
        <span aria-hidden="true">←</span>
        {volver}
      </Link>

      <header className="grid max-w-[760px] gap-4 border-b border-tinta pb-[clamp(24px,4vh,40px)]">
        <Etiqueta>{etiqueta}</Etiqueta>
        <h1 className="text-[clamp(2.2rem,1.5rem+2.4vw,3.6rem)] leading-[1.04]">{titulo}</h1>
        {intro && (
          <p className="max-w-[52ch] text-[clamp(1.1rem,1rem+0.4vw,1.3rem)] leading-[1.5] text-tinta">{intro}</p>
        )}
      </header>

      <div className="grid max-w-[66ch] gap-[clamp(28px,4vh,40px)]">
        {apartados.map((a, i) => (
          <section
            key={a.clave}
            aria-labelledby={`apartado-${a.clave}`}
            className={
              a.aviso
                ? "grid gap-3 border-l-[3px] border-rosa bg-papel-hondo/60 py-5 pr-5 pl-6"
                : "grid gap-3 border-t border-tinta/20 pt-6 first:border-t-0 first:pt-0"
            }
          >
            <p aria-hidden="true" className="font-dato text-xs tracking-[0.12em] text-rosa-texto">
              § {String(i + 1).padStart(2, "0")}
            </p>
            <h2 id={`apartado-${a.clave}`} className="text-[clamp(1.4rem,1.15rem+0.9vw,1.85rem)] leading-[1.15]">
              {a.titulo}
            </h2>
            <p className="text-[1.125rem] leading-[1.7]">{a.contenido}</p>
          </section>
        ))}
      </div>
    </article>
  );
}

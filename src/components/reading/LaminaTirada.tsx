import Link from "next/link";
import { cn } from "@/lib/utils";
import { FiguraTirada } from "./Tirada";

export interface LaminaTiradaProps {
  /** Destino; `null` si no le alcanza (la lámina queda tenue y no lleva a ningún lado). */
  href: string | null;
  nombre: string;
  /** Nombre en inglés: decide la figura (la Cruz Simple). */
  nombreIngles: string;
  descripcion: string;
  total: number;
  /** «3 cartas» */
  totalTexto: string;
  /** «1 crédito» o «Gratis», en mono. */
  costo: string;
  /** «Posiciones:» */
  posicionesTitulo: string;
  posiciones: string[];
  /** «+5 más» cuando hay más de cinco posiciones. */
  masTexto?: string;
  /** «Necesitas 2 créditos más» */
  faltaTexto?: string;
}

/**
 * Una tirada como lámina de la mesa: el número de cartas en grande, la figura de la tirada en miniatura, su nombre,
 * para qué sirve, sus posiciones y el costo en mono. Vive en una cuadrícula con filetes (ver /reading/new).
 */
export function LaminaTirada({
  href,
  nombre,
  nombreIngles,
  descripcion,
  total,
  totalTexto,
  costo,
  posicionesTitulo,
  posiciones,
  masTexto,
  faltaTexto,
}: LaminaTiradaProps) {
  const puede = href !== null;
  return (
    <Link
      href={href ?? "#"}
      aria-disabled={!puede || undefined}
      tabIndex={puede ? undefined : -1}
      className={cn(
        "group relative flex h-full flex-col gap-5 border-r border-b border-filete/25 p-5 text-letra outline-offset-[-3px] sm:p-6",
        "transition-colors duration-300 ease-tinta",
        puede ? "hover:bg-papel-hondo" : "cursor-not-allowed text-letra-suave"
      )}
    >
      <span className="flex items-end justify-between gap-4">
        <span className="flex items-baseline gap-2">
          <span aria-hidden="true" className="font-titulo text-[clamp(2.75rem,2rem+2vw,3.75rem)] leading-[0.85]">
            {total}
          </span>
          <span className="sr-only">{totalTexto}</span>
          <span aria-hidden="true" className="font-dato text-[0.6875rem] tracking-[0.12em] text-letra-suave uppercase">
            {totalTexto.replace(String(total), "").trim() || totalTexto}
          </span>
        </span>
        <span className="flex h-24 items-end">
          <FiguraTirada total={total} nombreTirada={nombreIngles} className={puede ? "text-letra" : "text-letra-suave"} />
        </span>
      </span>

      <span className="grid gap-2">
        <span className="font-titulo text-[1.5rem] leading-[1.1]">{nombre}</span>
        {descripcion && <span className="text-[0.9375rem] leading-[1.45] text-letra-suave">{descripcion}</span>}
      </span>

      {posiciones.length > 0 && (
        <span className="grid gap-1.5">
          <span className="font-dato text-[0.625rem] tracking-[0.12em] text-letra-suave uppercase">{posicionesTitulo}</span>
          <span className="font-dato text-[0.6875rem] leading-[1.7] tracking-[0.04em] break-words">
            {posiciones.join(" · ")}
            {masTexto && <span className="text-letra-suave"> · {masTexto}</span>}
          </span>
        </span>
      )}

      <span className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-filete/15 pt-4">
        <span className="font-dato text-xs font-medium tracking-[0.1em] text-letra-acento uppercase">{costo}</span>
        {faltaTexto ? (
          <span className="font-dato text-[0.6875rem] tracking-[0.06em] text-letra-suave">{faltaTexto}</span>
        ) : (
          <span
            aria-hidden="true"
            className="font-lectura text-xl leading-none transition-transform duration-300 ease-tinta group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0"
          >
            →
          </span>
        )}
      </span>
    </Link>
  );
}

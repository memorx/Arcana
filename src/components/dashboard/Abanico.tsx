import { cartaImagen, MEDIDAS_CARTA } from "@/lib/cartas";
import { cn } from "@/lib/utils";

export interface AbanicoProps {
  /** Hasta tres cartas de la lectura (nombre en inglés); si no hay, tres láminas en blanco. */
  cartas: readonly { name: string; isReversed?: boolean }[];
  /** Cuántas láminas vacías dibujar si no hay cartas conocidas (el número de cartas de la tirada). */
  vacias?: number;
  className?: string;
}

const GIROS = ["-rotate-6", "rotate-0", "rotate-6"] as const;

/**
 * Las cartas de una lectura como un abanico de grabados chicos (variante `mesa`, 200 px):
 * la miniatura del historial y de las lecturas recientes. Decorativo: el nombre de la
 * lectura ya lo dice el enlace que lo contiene.
 */
export function Abanico({ cartas, vacias = 3, className }: AbanicoProps) {
  const lista = cartas.slice(0, 3);
  const huecos = lista.length === 0 ? Math.min(3, Math.max(1, vacias)) : 0;
  return (
    <span aria-hidden="true" className={cn("flex w-14 shrink-0 items-end pt-1 sm:w-[4.75rem]", className)}>
      {lista.map((carta, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- grabado autohospedado de 200 px (scripts/cartas.py)
        <img
          key={`${carta.name}-${i}`}
          src={cartaImagen(carta, "mesa")}
          alt=""
          width={MEDIDAS_CARTA.mesa.width}
          height={MEDIDAS_CARTA.mesa.height}
          loading="lazy"
          decoding="async"
          className={cn(
            "h-auto w-6 rounded-[3px] border border-filete/40 bg-papel sm:w-8",
            i > 0 && "-ml-3 sm:-ml-4",
            GIROS[lista.length === 1 ? 1 : i] ?? "rotate-0",
            carta.isReversed && "[transform:rotate(180deg)]"
          )}
        />
      ))}
      {Array.from({ length: huecos }, (_, i) => (
        <span
          key={i}
          className={cn(
            "block aspect-[200/344] w-6 rounded-[3px] border border-filete/40 bg-papel-hondo sm:w-8",
            i > 0 && "-ml-3 sm:-ml-4",
            GIROS[i]
          )}
        />
      ))}
    </span>
  );
}

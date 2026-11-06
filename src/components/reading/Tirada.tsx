import "./lectura.css";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { cartaImagen, MEDIDAS_CARTA } from "@/lib/cartas";
import { arcoDe, disposicionDe, figuraDe, MINI, numeroRomano } from "./disposicion";

export interface PosicionTirada {
  /** Número de la posición en la tirada (1, 2, 3…). */
  numero: number;
  /** Nombre de la posición en el idioma de la página («Pasado»). */
  nombre: string;
}

export interface TiradaProps {
  /** Las posiciones en orden (1..n). */
  posiciones: PosicionTirada[];
  /** Nombre de la tirada (inglés o español): distingue la Cruz Simple de otras tiradas de cinco. */
  nombreTirada?: string;
  /** Nombre accesible de la lista («3 cartas»). */
  etiqueta: string;
  /** La misma figura, más chica (interpretación recién hecha). */
  compacta?: boolean;
  /** La carta de cada posición (<CartaQuemable> o <CartaFija>). */
  carta: (posicion: PosicionTirada, indice: number) => ReactNode;
  /** Lo que va debajo de la carta (su nombre al revelarse). */
  pie?: (posicion: PosicionTirada, indice: number) => ReactNode;
  className?: string;
}

/**
 * La tirada sobre el papel: de 1 a 12 cartas con la figura de cada tirada (renglón, cruz, herradura, Cruz Celta,
 * los doce meses) y, en móvil, una rejilla de 3 con el nombre de la posición encima de cada carta. Sin hooks: sirve
 * en páginas de servidor (/reading/[id], /share) y de cliente (el revelado).
 */
export function Tirada({ posiciones, nombreTirada, etiqueta, compacta = false, carta, pie, className }: TiradaProps) {
  const total = posiciones.length;
  const clave = disposicionDe(total, nombreTirada);

  return (
    <ol
      aria-label={etiqueta}
      className={cn("tirada", `tirada--${clave}`, compacta && "tirada--compacta", className)}
      data-total={total}
      style={{ "--tirada-total": total, "--cq-ancho": "100%" } as CSSProperties}
    >
      {posiciones.map((posicion, i) => (
        <li
          key={`${posicion.numero}-${i}`}
          className="tirada-pos"
          data-pos={i + 1}
          style={clave === "herradura" ? ({ "--arco": arcoDe(i, total) } as CSSProperties) : undefined}
        >
          <p className="tirada-nombre font-dato text-[0.625rem] leading-[1.3] tracking-[0.06em] text-letra-suave uppercase sm:text-[0.6875rem] sm:tracking-[0.14em]">
            <span>
              <span aria-hidden="true">{numeroRomano(posicion.numero)} · </span>
              <b className="font-medium text-letra-acento">{posicion.nombre}</b>
            </span>
          </p>
          {carta(posicion, i)}
          {pie && <div className="tirada-pie">{pie(posicion, i)}</div>}
        </li>
      ))}
    </ol>
  );
}

export interface CartaFijaProps {
  /** Nombre en inglés (el de la base) o slug: de ahí sale la imagen autohospedada. */
  carta: { name: string };
  /** Texto alternativo: el nombre en el idioma de la página. */
  alt: string;
  invertida?: boolean;
  /** Carta dorada: la brasa rosa persistente de tinta.css. */
  dorada?: boolean;
  prioridad?: boolean;
  className?: string;
}

/** La carta ya revelada, a color (lo único a todo color), con las medidas de <CartaQuemable>. */
export function CartaFija({ carta, alt, invertida = false, dorada = false, prioridad = false, className }: CartaFijaProps) {
  return (
    <figure className={cn("carta-fija", invertida && "carta-fija--invertida", dorada && "golden-card-glow", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- WebP autohospedada y ya optimizada (scripts/cartas.py) */}
      <img
        src={cartaImagen(carta.name)}
        alt={alt}
        width={MEDIDAS_CARTA.color.width}
        height={MEDIDAS_CARTA.color.height}
        loading={prioridad ? "eager" : "lazy"}
        decoding="async"
      />
    </figure>
  );
}

/** La figura de una tirada en miniatura (decorativa): rectángulos de filete en la disposición de la tirada. */
export function FiguraTirada({ total, nombreTirada, className }: { total: number; nombreTirada?: string; className?: string }) {
  const { ancho, alto, cartas } = figuraDe(total, nombreTirada);
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`-1 -1 ${ancho + 2} ${alto + 2}`}
      className={cn("block h-auto max-w-full", className)}
      width={Math.round((ancho + 2) * 1.2)}
      height={Math.round((alto + 2) * 1.2)}
    >
      {cartas.map((c, i) => (
        <rect
          key={i}
          x={c.x}
          y={c.y}
          width={MINI.ancho}
          height={MINI.alto}
          rx={1.5}
          className={i === 0 ? "fill-rosa stroke-rosa" : "fill-none stroke-current"}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

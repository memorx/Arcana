import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import estilos from "./celebracion.module.css";

/** Clase que estampa un sello o la palabra a pincel al abrir el modal (nada con reduced-motion). */
export const ESTAMPA = estilos.estampa;

/** Diez chispas fijas (sin azar: el render es el mismo en servidor y cliente). */
const CHISPAS = Array.from({ length: 10 }, (_, i) => {
  const angulo = (i / 10) * Math.PI * 2 + 0.3;
  const radio = i % 2 === 0 ? 92 : 64;
  return {
    dx: Math.round(Math.cos(angulo) * radio),
    dy: Math.round(Math.sin(angulo) * radio * 0.7),
    rosa: i % 3 !== 1,
  };
});

/**
 * Chispas en dos tintas que saltan una vez detrás del sello: el confeti de antes, sin morado.
 * Decorativas (`aria-hidden`), recortadas por su escenario y apagadas con reduced-motion.
 */
export function Chispas({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" data-chispas className={cn(estilos.chispas, className)}>
      {CHISPAS.map((c, i) => (
        <span
          key={i}
          className={cn(estilos.chispa, c.rosa ? estilos.rosa : estilos.papel)}
          style={{ "--dx": `${c.dx}px`, "--dy": `${c.dy}px` } as CSSProperties}
        />
      ))}
    </span>
  );
}

import type { SVGProps } from "react";
import { SYNODIC_MONTH, type MoonPhaseInfo } from "@/lib/systems";
import { cn } from "@/lib/utils";

const R = 10;
const C = 12;

/**
 * Contorno de la parte iluminada de la luna en un disco de radio 10 centrado en (12, 12):
 * el limbo iluminado (media circunferencia) y el terminador (media elipse de radio
 * horizontal |1 − 2k|·r). Creciente = iluminada a la derecha (hemisferio norte).
 */
export function trazoLuna(iluminacion: number, creciente: boolean): string {
  const k = Math.max(0, Math.min(1, Number.isFinite(iluminacion) ? iluminacion : 0));
  const rx = Math.round(Math.abs(1 - 2 * k) * R * 1000) / 1000;
  // Limbo: de arriba abajo por el lado iluminado. Terminador: de abajo arriba, abombado
  // hacia el lado iluminado si es menos de la mitad (cuarto) o hacia el oscuro si es más (gibosa).
  const barridoLimbo = creciente ? 1 : 0;
  const barridoTerminador = creciente ? (k < 0.5 ? 0 : 1) : k < 0.5 ? 1 : 0;
  return `M${C} ${C - R}A${R} ${R} 0 0 ${barridoLimbo} ${C} ${C + R}A${rx} ${R} 0 0 ${barridoTerminador} ${C} ${C - R}Z`;
}

export interface LunaGlifoProps extends Omit<SVGProps<SVGSVGElement>, "children" | "viewBox"> {
  luna: Pick<MoonPhaseInfo, "illumination" | "age">;
  /** Con título: `role="img"` y nombre accesible. Sin título: decorativo. */
  titulo?: string;
}

/**
 * La fase de la luna en dos tintas, como en un almanaque: la sombra en tinta, lo iluminado
 * en papel y el contorno en la letra del suelo. Sustituye a los emojis de luna. Sobre tinta,
 * la sombra se aclara con `--luna-sombra` (p. ej. grafito) para que una luna nueva no se lea
 * como llena.
 */
export function LunaGlifo({ luna, titulo, className, ...rest }: LunaGlifoProps) {
  const creciente = luna.age < SYNODIC_MONTH / 2;
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-5 shrink-0", className)}
      focusable="false"
      {...(titulo ? { role: "img", "aria-label": titulo } : { "aria-hidden": true })}
      {...rest}
    >
      <circle cx={C} cy={C} r={R} className="fill-[var(--luna-sombra,var(--color-tinta))]" />
      <path d={trazoLuna(luna.illumination, creciente)} className="fill-papel" />
      <circle cx={C} cy={C} r={R} fill="none" stroke="currentColor" strokeWidth={1.25} />
    </svg>
  );
}

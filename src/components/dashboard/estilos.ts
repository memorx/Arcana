/**
 * Clases compartidas de las pantallas «Día y mesa» (dashboard, carta del día, calendario,
 * historial). Todas usan los colores de suelo (`text-letra*`, `border-filete`), así que se
 * leen igual sobre papel que sobre tinta.
 */

/** Título de una celda de la retícula (h2): Gloock moderado, nunca a sangre. */
export const TITULO_CELDA = "font-titulo text-xl leading-tight text-letra sm:text-[1.375rem]";

/** Enlace de dato en mono rosa («Ver todo →»), con alto táctil de 44 px. */
export const ENLACE_DATO =
  "inline-flex min-h-11 items-center gap-1.5 font-dato text-[0.6875rem] font-medium uppercase leading-none tracking-[0.12em] text-letra-acento underline-offset-[0.35em] hover:underline";

/** Rótulo de dato: mono chico en mayúsculas, color secundario del suelo. */
export const ROTULO = "font-dato text-[0.6875rem] uppercase leading-[1.4] tracking-[0.12em] text-letra-suave";

/** Cifra grande (contadores): un dato, así que en Martian Mono con números tabulares (como /collection). */
export const CIFRA = "font-dato text-[2rem] leading-none tracking-[-0.04em] text-letra tabular-nums";

/**
 * Retícula editorial: las celdas van sobre el suelo y el hueco de 1 px entre ellas deja
 * ver el filete (como la tira «Más que tarot» de la maqueta). Filete fuerte arriba y abajo.
 */
export const RETICULA = "grid gap-px border-y border-filete bg-filete/25";

/** Una celda de la retícula. */
export const CELDA = "min-w-0 bg-suelo px-1 py-6 sm:px-6 sm:py-7";

const SPAN_LG: Record<number, string> = { 0: "lg:col-span-1", 1: "lg:col-span-4", 2: "lg:col-span-3", 3: "lg:col-span-2" };

/**
 * Clases para la última celda de una retícula de `n` elementos con 2 columnas en `sm` y 4 en `lg`:
 * la estira para que la fila no termine en un hueco del color del filete.
 */
export function ultimaCelda(n: number): string {
  return [n % 2 === 1 ? "sm:col-span-2" : "", SPAN_LG[n % 4]].filter(Boolean).join(" ");
}

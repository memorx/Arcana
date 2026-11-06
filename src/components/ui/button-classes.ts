// Sin "use client": un server component puede llamar a buttonClasses() para vestir un <Link>.
import { cn } from "@/lib/utils";

/**
 * Variantes de «Dos tintas» (§2.1):
 * - primario: fondo rosa-luz, letra tinta (5.51:1); sirve sobre papel y sobre tinta.
 * - linea: filete del color de la letra del suelo (tinta sobre papel, papel sobre tinta).
 * - fantasma: sin filete; sólo la letra.
 * - peligro: fondo error, letra papel (5.44:1).
 * Las variantes viejas siguen funcionando como alias: primary → primario,
 * secondary → linea, ghost → fantasma, danger → peligro.
 */
export type ButtonVariant =
  | "primario"
  | "linea"
  | "fantasma"
  | "peligro"
  | "primary"
  | "secondary"
  | "ghost"
  | "danger";

export type ButtonSize = "sm" | "md" | "lg";

const ALIAS = {
  primary: "primario",
  secondary: "linea",
  ghost: "fantasma",
  danger: "peligro",
} as const;

const BASE =
  "inline-flex cursor-pointer items-center justify-center gap-[0.9em] rounded-full border border-transparent text-center font-dato font-medium leading-[1.15] tracking-[0.1em] uppercase no-underline transition-[transform,background-color,color,border-color] duration-300 ease-tinta hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTES = {
  primario: "bg-rosa-luz text-tinta hover:bg-brasa",
  linea: "bg-transparent border-current hover:bg-current/10",
  fantasma: "bg-transparent hover:bg-current/10",
  peligro: "bg-error text-papel hover:bg-[#9a1f18]",
} as const;

// Alto táctil ≥ 44 px en todos los tamaños.
const TAMANOS = {
  sm: "min-h-11 px-4 py-2 text-[0.6875rem]",
  md: "min-h-12 px-6 py-2.5 text-xs",
  lg: "min-h-14 px-8 py-3 text-[0.8125rem]",
} as const;

/** Clases de botón para usarlas en un `<Link>` o `<a>` con el mismo aspecto. */
export function buttonClasses({
  variant = "primario",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  const v = variant in ALIAS ? ALIAS[variant as keyof typeof ALIAS] : (variant as keyof typeof VARIANTES);
  return cn(BASE, VARIANTES[v], TAMANOS[size], className);
}

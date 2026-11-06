import { cn } from "@/lib/utils";

/**
 * Button classes for a <Link> or <a>, safe in Server Components.
 *
 * `buttonClasses()` lives in `@/components/ui/button`, which is a "use client"
 * module: a Server Component that imports it gets a client reference and
 * calling it throws at render time. Until it moves to a module without the
 * directive (handoff in docs/partes/rediseno-L4.md), this is the same recipe
 * (§2.1 «Dos tintas»: primario rosa-luz/tinta, línea, fantasma; mono in
 * capitals; every size ≥ 44 px tall). Keep it in step with button.tsx.
 */
export type EnlaceVariante = "primario" | "linea" | "fantasma" | "primary" | "secondary" | "ghost";
export type EnlaceTamano = "sm" | "md" | "lg";

const BASE =
  "inline-flex cursor-pointer items-center justify-center gap-[0.9em] rounded-full border border-transparent text-center font-dato font-medium leading-[1.15] tracking-[0.1em] uppercase no-underline transition-[transform,background-color,color,border-color] duration-300 ease-tinta hover:-translate-y-0.5 motion-reduce:hover:translate-y-0";

const VARIANTES = {
  primario: "bg-rosa-luz text-tinta hover:bg-brasa",
  linea: "bg-transparent border-current hover:bg-current/10",
  fantasma: "bg-transparent hover:bg-current/10",
} as const;

const ALIAS = { primary: "primario", secondary: "linea", ghost: "fantasma" } as const;

const TAMANOS = {
  sm: "min-h-11 px-4 py-2 text-[0.6875rem]",
  md: "min-h-12 px-6 py-2.5 text-xs",
  lg: "min-h-14 px-8 py-3 text-[0.8125rem]",
} as const;

export function enlaceBoton({
  variant = "primario",
  size = "md",
  className,
}: { variant?: EnlaceVariante; size?: EnlaceTamano; className?: string } = {}): string {
  const v = variant in ALIAS ? ALIAS[variant as keyof typeof ALIAS] : (variant as keyof typeof VARIANTES);
  return cn(BASE, VARIANTES[v], TAMANOS[size], className);
}

/**
 * Old signature, kept for its callers (the dashboard widget):
 * primary → primario, secondary → línea, ghost → fantasma.
 */
export function linkButtonClass(
  variant: "primary" | "secondary" | "ghost" = "primary",
  size: EnlaceTamano = "md",
  className?: string
): string {
  return enlaceBoton({ variant, size, className });
}

/** Text link in mono capitals with a ≥ 44 px touch target (back links, «Ir a tu síntesis»). */
export const ENLACE_DATO =
  "inline-flex min-h-11 items-center gap-2 font-dato text-[0.6875rem] leading-[1.4] tracking-[0.12em] uppercase text-letra-acento underline-offset-[0.3em] hover:underline";

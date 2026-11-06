import { buttonClasses, type ButtonSize } from "@/components/ui/button-classes";

/**
 * Link styles for the Arcana Map pages, safe in Server Components.
 * Buttons-as-links use the shared `buttonClasses()` (a module without "use client").
 */
export { buttonClasses };

/**
 * Old signature, kept for its callers (the dashboard widget):
 * primary → primario, secondary → línea, ghost → fantasma.
 */
export function linkButtonClass(
  variant: "primary" | "secondary" | "ghost" = "primary",
  size: ButtonSize = "md",
  className?: string
): string {
  return buttonClasses({ variant, size, className });
}

/** Text link in mono capitals with a ≥ 44 px touch target (back links, «Ir a tu síntesis»). */
export const ENLACE_DATO =
  "inline-flex min-h-11 items-center gap-2 font-dato text-[0.6875rem] leading-[1.4] tracking-[0.12em] uppercase text-letra-acento underline-offset-[0.3em] hover:underline";

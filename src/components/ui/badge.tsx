"use client";

import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "secondary" | "success" | "warning";
}

/**
 * Sello de dato: mono en mayúsculas. Toma los colores de su suelo, así que se
 * lee igual sobre papel que sobre tinta.
 * - default: filete tenue, letra secundaria.
 * - primary: rosa de texto (rosa-texto en papel, rosa-luz en tinta).
 * - secondary: invertido (tinta sobre papel / papel sobre tinta).
 * - success: verde del suelo. warning: lleno de rosa-luz con letra tinta.
 */
const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "border-filete/30 text-letra-suave",
      primary: "border-letra-acento/50 text-letra-acento",
      secondary: "border-filete bg-filete text-suelo",
      success: "border-letra-exito/50 text-letra-exito",
      warning: "border-rosa-luz bg-rosa-luz text-tinta",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-dato text-[0.6875rem] leading-[1.5] font-normal tracking-[0.1em] whitespace-nowrap uppercase",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";

export { Badge };

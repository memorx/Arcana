"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

interface EnlaceBotonProps {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

/**
 * Un `<Link>` con aspecto de botón (`buttonClasses`, nunca `<Link><Button/></Link>`).
 * Es cliente sólo porque `buttonClasses` vive en `ui/button.tsx` («use client»): un server component no puede
 * llamarlo. El enlace sale completo en el HTML del servidor.
 */
export function EnlaceBoton({ href, variant = "primario", size = "lg", className, children }: EnlaceBotonProps) {
  return (
    <Link href={href} className={buttonClasses({ variant, size, className })}>
      {children}
    </Link>
  );
}

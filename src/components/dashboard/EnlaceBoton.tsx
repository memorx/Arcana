"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/ui";

export interface EnlaceBotonProps extends Omit<ComponentProps<typeof Link>, "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

/**
 * Un `<Link>` con aspecto de botón (`buttonClasses()`), para usarlo desde server components:
 * `buttonClasses` vive en un módulo "use client" (`ui/button.tsx`) y el servidor no puede
 * llamarlo, pero sí puede renderizar este componente.
 */
export function EnlaceBoton({ variant, size, className, ...props }: EnlaceBotonProps) {
  return <Link className={buttonClasses({ variant, size, className })} {...props} />;
}

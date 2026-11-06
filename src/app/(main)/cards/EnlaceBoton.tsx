"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/ui";

/**
 * `<Link>` con aspecto de botón para las páginas de servidor de /cards. `buttonClasses()` vive en un módulo
 * "use client" y no se puede llamar desde el servidor; aquí se llama en un componente de cliente (que igual se
 * pinta en el HTML y funciona sin JS).
 */
export function EnlaceBoton({
  variant = "primario",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClasses({ variant, size, className })} {...props} />;
}

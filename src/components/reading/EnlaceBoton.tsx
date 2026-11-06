"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/ui";

/**
 * Un enlace con aspecto de botón para páginas de servidor: `buttonClasses()` vive en un módulo "use client" y no se
 * puede llamar desde el servidor, así que el enlace se arma aquí (nunca `<Link><Button/></Link>`).
 */
export function EnlaceBoton({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClasses({ variant, size, className })} {...props} />;
}

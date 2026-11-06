"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/ui";

/**
 * Un <Link> con aspecto de botón para componentes de servidor (artículo del blog y 404): `buttonClasses()`
 * vive en un módulo "use client" y no se puede llamar desde el servidor. Se renderiza en el HTML del
 * servidor igual que cualquier enlace (sin JS se ve y funciona).
 */
export function EnlaceBoton({
  href,
  variant,
  size,
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClasses({ variant, size, className })}>
      {children}
    </Link>
  );
}

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Suelo = "tinta" | "papel";

export interface EscenaProps extends HTMLAttributes<HTMLElement> {
  suelo: Suelo;
  as?: "section" | "div" | "article" | "aside";
  children: ReactNode;
}

/**
 * Una escena con su suelo: tinta (fondo negro de grabado, letra papel) o papel
 * (fondo papel, letra tinta). Los hijos que usan text-letra*, bg-suelo o
 * border-filete toman los colores correctos solos. `overflow: clip` (no crea
 * contenedor de scroll: lo sticky de adentro sigue funcionando) y margen para
 * que los saltos por ancla no queden debajo de la cabecera.
 */
export function Escena({ suelo, as: Tag = "section", className, children, ...rest }: EscenaProps) {
  return (
    <Tag
      data-suelo={suelo}
      className={cn(
        suelo === "tinta" ? "suelo-tinta" : "suelo-papel",
        "relative overflow-clip scroll-mt-(--alto-cabecera)",
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

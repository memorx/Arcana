import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PincelProps extends HTMLAttributes<HTMLElement> {
  as?: "p" | "span" | "div";
  children: ReactNode;
}

/**
 * La palabra a pincel de una escena («Pregunta», «Tu turno»): Water Brush en
 * rosa con el filtro de pincel seco (#pincel-seco, definido una vez en el
 * layout raíz). Es un sello: el tamaño lo pone quien lo usa (≥ 24 px, el rosa
 * puro no alcanza AA en texto chico). Si repite un título que ya existe, pásale
 * `aria-hidden`.
 */
export function Pincel({ as: Tag = "p", className, children, ...rest }: PincelProps) {
  return (
    <Tag
      className={cn(
        "pincel-seco font-pincel font-normal leading-[0.9] tracking-[-0.01em] text-rosa",
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EtiquetaProps extends HTMLAttributes<HTMLElement> {
  as?: "p" | "span" | "div" | "h2" | "h3";
  /** El punto rosa antes del texto (decorativo). */
  punto?: boolean;
  children: ReactNode;
}

/**
 * Dato de imprenta: mono en mayúsculas con el punto rosa, como las etiquetas
 * de escena de la maqueta. Toma el color secundario de su suelo
 * (grafito sobre papel, niebla sobre tinta).
 */
export function Etiqueta({ as: Tag = "p", punto = true, className, children, ...rest }: EtiquetaProps) {
  return (
    <Tag
      className={cn(
        "font-dato text-xs leading-[1.4] font-normal tracking-[0.12em] uppercase text-letra-suave",
        className
      )}
      {...rest}
    >
      {punto && (
        <span
          aria-hidden="true"
          className="mr-[0.7em] inline-block size-[0.55em] rounded-full bg-rosa align-[0.05em]"
        />
      )}
      {children}
    </Tag>
  );
}

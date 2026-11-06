import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type EstadoSello = "logrado" | "en-curso" | "bloqueado";

export interface SelloProps {
  estado: EstadoSello;
  /** La cifra del sello (la meta: 10 lecturas, 7 días…), en mono. */
  children: ReactNode;
  tamano?: "chico" | "grande";
  className?: string;
}

/**
 * Sello de imprenta para el archivo de logros y retos. Decorativo (`aria-hidden`): el estado se dice en texto
 * al lado. Logrado = doble filete con el anillo y el punto en rosa; en curso = filete de la letra del suelo;
 * bloqueado = filete punteado en la letra suave. Toma los colores del suelo (papel o tinta).
 */
export function Sello({ estado, children, tamano = "chico", className }: SelloProps) {
  const grande = tamano === "grande";
  return (
    <span
      aria-hidden="true"
      data-estado={estado}
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full font-dato leading-none tabular-nums",
        grande ? "size-24 text-2xl" : "size-14 text-[0.8125rem]",
        estado === "logrado" && "border-[1.5px] border-letra text-letra",
        estado === "en-curso" && "border border-letra text-letra",
        estado === "bloqueado" && "border border-dashed border-letra-suave text-letra-suave",
        className
      )}
    >
      {estado === "logrado" && (
        <span className={cn("absolute rounded-full border border-rosa", grande ? "inset-2" : "inset-[5px]")} />
      )}
      <span className="relative">{children}</span>
      {estado === "logrado" && (
        <span
          className={cn(
            "absolute rounded-full bg-rosa",
            grande ? "right-1.5 top-1.5 size-3.5" : "right-0 top-0 size-2.5"
          )}
        />
      )}
    </span>
  );
}

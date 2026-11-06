import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

/** Los glifos de «Más que tarot» de la maqueta: línea de grabado en la letra del suelo y un punto rosa. */
export type GlifoNombre = "blueprint" | "calendar" | "compatibility" | "manual" | "history";

const TRAZO = { fill: "none", stroke: "currentColor", strokeWidth: 1.2 } as const;

function Dibujo({ nombre }: { nombre: GlifoNombre }) {
  switch (nombre) {
    case "blueprint":
      return (
        <>
          <circle cx="22" cy="22" r="4" className="fill-rosa" />
          <g {...TRAZO}>
            <circle cx="22" cy="5" r="3" />
            <circle cx="38" cy="17" r="3" />
            <circle cx="32" cy="37" r="3" />
            <circle cx="12" cy="37" r="3" />
            <circle cx="6" cy="17" r="3" />
            <path d="M22 18V8M25.6 20.8 35.3 18M24.4 25.4l5.8 9.2M19.6 25.4l-5.8 9.2M18.4 20.8 8.7 18" />
          </g>
        </>
      );
    case "calendar":
      return (
        <>
          <circle cx="22" cy="22" r="17" {...TRAZO} />
          <path
            d="M22 3v5M22 36v5M3 22h5M36 22h5M8.6 8.6l3.5 3.5M31.9 31.9l3.5 3.5M8.6 35.4l3.5-3.5M31.9 12.1l3.5-3.5"
            {...TRAZO}
          />
          <circle cx="22" cy="22" r="5" className="fill-rosa" />
        </>
      );
    case "compatibility":
      return (
        <>
          <circle cx="16" cy="22" r="11" {...TRAZO} />
          <circle cx="28" cy="22" r="11" {...TRAZO} />
          <path d="M22 12.8a11 11 0 0 1 0 18.4a11 11 0 0 1 0-18.4z" className="fill-rosa" />
        </>
      );
    case "manual":
      return (
        <>
          <g {...TRAZO}>
            <rect x="8" y="9" width="18" height="28" rx="2" transform="rotate(-10 17 23)" />
            <rect x="16" y="7" width="18" height="28" rx="2" transform="rotate(6 25 21)" />
          </g>
          <circle cx="25" cy="21" r="3" className="fill-rosa" />
        </>
      );
    case "history":
      return (
        <>
          <path d="M22 22m-3 0a3 3 0 1 1 6 0a7 7 0 1 1-14 0a11 11 0 1 1 22 0a15 15 0 1 1-30 0" {...TRAZO} />
          <circle cx="22" cy="22" r="2.4" className="fill-rosa" />
        </>
      );
  }
}

export function Glifo({
  nombre,
  className,
  ...rest
}: { nombre: GlifoNombre } & Omit<SVGProps<SVGSVGElement>, "children" | "viewBox">) {
  return (
    <svg viewBox="0 0 44 44" aria-hidden="true" focusable="false" className={cn("size-11 shrink-0", className)} {...rest}>
      <Dibujo nombre={nombre} />
    </svg>
  );
}

import { cn } from "@/lib/utils";

export interface BarraProgresoProps {
  /** Avance actual (se recorta a 0…max para el lector de pantalla y el ancho). */
  valor: number;
  max: number;
  /** Nombre accesible de la barra («Primera lectura», «Colección»…). */
  etiqueta: string;
  /** Lo que lee el lector de pantalla en lugar del número («3 de 10»). */
  texto?: string;
  /** Logrado: la barra se llena en rosa (la segunda tinta); si no, en la letra del suelo. */
  logrado?: boolean;
  grosor?: "fina" | "media";
  className?: string;
}

/**
 * Barra de avance en dos tintas: filete de la letra del suelo, relleno de tinta (o papel sobre tinta)
 * y rosa cuando ya se logró. Es `role="progressbar"` con sus valores.
 */
export function BarraProgreso({
  valor,
  max,
  etiqueta,
  texto,
  logrado = false,
  grosor = "media",
  className,
}: BarraProgresoProps) {
  const tope = Math.max(0, max);
  const ahora = Math.min(Math.max(0, valor), tope);
  const porcentaje = tope > 0 ? (ahora / tope) * 100 : 0;

  return (
    <div
      role="progressbar"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={tope}
      aria-valuenow={ahora}
      aria-valuetext={texto}
      data-logrado={logrado || undefined}
      className={cn(
        "relative w-full overflow-hidden rounded-full border border-filete/45 bg-suelo",
        grosor === "fina" ? "h-1.5" : "h-2.5",
        className
      )}
    >
      <div
        className={cn("h-full rounded-full", logrado ? "bg-rosa" : "bg-letra")}
        style={{ width: `${porcentaje}%` }}
      />
    </div>
  );
}

import { cn } from "@/lib/utils";

export interface BarraProps {
  /** 0–100 */
  valor: number;
  /** Nombre accesible de la barra («Logros: 40%»). */
  etiqueta: string;
  /** Rosa en lugar de la letra del suelo (lo que está por cumplirse, el mes actual). */
  acento?: boolean;
  className?: string;
}

/** Barra de avance en dos tintas: el surco tenue y el avance en la letra del suelo o en rosa. */
export function Barra({ valor, etiqueta, acento = false, className }: BarraProps) {
  const v = Math.max(0, Math.min(100, Math.round(Number.isFinite(valor) ? valor : 0)));
  return (
    <div
      role="progressbar"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      className={cn("h-1.5 w-full overflow-hidden bg-letra/10", className)}
    >
      <div className={cn("h-full", acento ? "bg-rosa" : "bg-letra")} style={{ width: `${v}%` }} />
    </div>
  );
}

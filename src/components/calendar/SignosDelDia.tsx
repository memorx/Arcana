import { DAY_SIGNS, getTonalli, type Locale } from "@/lib/systems";
import { cn } from "@/lib/utils";
import { fromDayKey } from "./calendar-utils";
import estilos from "./SignosDelDia.module.css";

export interface SignosDelDiaProps {
  /** Hoy, "YYYY-MM-DD" (día UTC, como `todayUtc()`). */
  hoy: string;
  locale: Locale;
  /** Nombre de la lista («Los veinte signos del tonalpohualli»). */
  etiqueta: string;
  className?: string;
}

/** Signos que se ven antes del de hoy: así, quieta (reduced-motion), la tira empieza cerca de hoy. */
const ANTES = 2;

/**
 * Los veinte signos del tonalpohualli en una tira de tinta que corre lenta, con el signo de
 * hoy en rosa (escena 5 de la maqueta). Se pausa al pasar el puntero o el foco; quieta con
 * `prefers-reduced-motion`. La segunda copia es sólo para el bucle y se oculta del lector.
 */
export function SignosDelDia({ hoy, locale, etiqueta, className }: SignosDelDiaProps) {
  const indiceHoy = getTonalli(fromDayKey(hoy)).sign.index;
  const orden = Array.from({ length: DAY_SIGNS.length }, (_, i) => DAY_SIGNS[(indiceHoy - ANTES + i + 20) % 20]);

  const lista = (copia: boolean) => (
    <ul
      className="flex"
      {...(copia ? { "aria-hidden": true as const } : { "aria-label": etiqueta })}
    >
      {orden.map((signo) => {
        const esHoy = signo.index === indiceHoy;
        return (
          <li
            key={signo.index}
            aria-current={!copia && esHoy ? "date" : undefined}
            className={cn(
              "flex items-baseline gap-[0.55em] whitespace-nowrap border-r border-papel/15 px-6 py-4 font-titulo text-[clamp(1.25rem,1rem+1vw,1.75rem)] leading-none sm:px-7 sm:py-5",
              esHoy ? "text-rosa-luz" : "text-papel"
            )}
          >
            {signo.nahuatl}
            <small className={cn("font-dato text-[0.6875rem] uppercase tracking-[0.1em]", esHoy ? "text-rosa-luz" : "text-niebla")}>
              {signo.name[locale]}
            </small>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div data-recorta className={cn(estilos.marquesina, "suelo-tinta overflow-hidden", className)}>
      <div className={estilos.pista}>
        {lista(false)}
        {lista(true)}
      </div>
    </div>
  );
}

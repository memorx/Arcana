import Link from "next/link";
import { Escena } from "@/components/tinta/Escena";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { DAY_SIGNS, getMoonPhase, getTonalli, type Locale } from "@/lib/systems";
import type { Traducir } from "./tipos";

interface EscenaHoyProps {
  t: Traducir;
  /** El día a mostrar, a las 00:00 UTC (`todayUtc()`, como la cabecera, /calendar y la carta del día). */
  dia: Date;
  locale: string;
  autenticado: boolean;
}

/** «Luna menguante» → «Menguante», «Waning Crescent» → «Waning Crescent», «Full Moon» → «Full»: ya dice «Luna» arriba. */
function faseCorta(nombre: string, locale: Locale): string {
  const sin = locale === "es" ? nombre.replace(/^Luna\s+/i, "") : nombre.replace(/\s+Moon$/i, "");
  return sin.charAt(0).toUpperCase() + sin.slice(1);
}

/**
 * Escena 5 · El día de hoy en el tonalpohualli (suelo papel → tinta): tonalli, trecena, señor de la noche y luna
 * de `@/lib/systems`, y la marquesina de los 20 signos con el de hoy en rosa. La segunda copia de la marquesina
 * (para el bucle) es `aria-hidden`; con reduced-motion la marquesina no corre y los 20 signos se acomodan en filas.
 */
export function EscenaHoy({ t, dia, locale, autenticado }: EscenaHoyProps) {
  const idioma: Locale = locale === "en" ? "en" : "es";
  const tonalli = getTonalli(dia);
  const luna = getMoonPhase(dia);
  const luz = Math.round(luna.illumination * 100);
  const hoy = tonalli.sign.index;

  const signos = (copia: boolean) =>
    DAY_SIGNS.map((s) => {
      const esHoy = s.index === hoy;
      return (
        <li
          key={s.index}
          data-signo={s.index}
          data-hoy={esHoy ? "" : undefined}
          aria-current={!copia && esHoy ? "date" : undefined}
          className="portada-signo"
        >
          {s.nahuatl} <small>{s.name[idioma]}</small>
          {!copia && esHoy && <span className="sr-only"> ({t("portada.hoy.signoHoy")})</span>}
        </li>
      );
    });

  return (
    <Escena suelo="papel" aria-labelledby="portada-hoy-titulo" className="portada-hoy">
      <div className="portada-contenido portada-hoy__contenido">
        <div data-revelar>
          <Etiqueta>{t("portada.hoy.etiqueta")}</Etiqueta>
          <h2 id="portada-hoy-titulo" className="portada-h2">
            {t("portada.hoy.titulo", {
              tonalli: `${tonalli.number} ${tonalli.sign.nahuatl}`,
              nombre: tonalli.sign.name[idioma],
            })}
          </h2>
        </div>
        <dl className="portada-hoy__detalle" data-revelar>
          <div>
            <dt>{t("portada.hoy.trecena")}</dt>
            <dd>{tonalli.trecena.nahuatl}</dd>
          </div>
          <div>
            <dt>{t("portada.hoy.senor")}</dt>
            <dd>{tonalli.lordOfNight.nahuatl}</dd>
          </div>
          <div>
            <dt>{t("portada.hoy.luna")}</dt>
            <dd>{t("portada.hoy.lunaValor", { fase: faseCorta(luna.name[idioma], idioma), luz })}</dd>
          </div>
          <div>
            <dt>{t("portada.hoy.diaPersonal")}</dt>
            <dd>
              {autenticado ? (
                <Link href="/calendar" className="portada-hoy__enlace">
                  {t("portada.hoy.enCalendario")}
                </Link>
              ) : (
                t("portada.hoy.alRegistrarte")
              )}
            </dd>
          </div>
        </dl>
      </div>
      <div className="portada-marquesina suelo-tinta" data-recorta>
        <div className="portada-marquesina__pista">
          <ul aria-label={t("portada.hoy.signos")}>{signos(false)}</ul>
          <ul aria-hidden="true" className="portada-marquesina__copia">
            {signos(true)}
          </ul>
        </div>
      </div>
    </Escena>
  );
}

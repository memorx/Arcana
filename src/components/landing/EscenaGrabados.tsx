import Link from "next/link";
import { buttonClasses } from "@/components/ui/button-classes";
import { Escena } from "@/components/tinta/Escena";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { MesaDeGrabados } from "@/components/tinta/MesaDeGrabados";
import { Pincel } from "@/components/tinta/Pincel";
import type { Traducir } from "./tipos";

/** La mesa de la maqueta (design/maqueta/index.html), columna por columna: 8 × 5 grabados. */
export const MESA_PORTADA: readonly string[] = [
  "rws-tarot-00-fool", "cups01", "rws-tarot-13-death", "swords03", "rws-tarot-21-world",
  "rws-tarot-01-magician", "wands10", "rws-tarot-18-moon", "pents01", "rws-tarot-06-lovers",
  "rws-tarot-02-high-priestess", "swords01", "rws-tarot-19-sun", "cups10", "rws-tarot-12-hanged-man",
  "rws-tarot-16-tower", "pents10", "rws-tarot-03-empress", "wands01", "rws-tarot-11-justice",
  "rws-tarot-17-star", "cups02", "rws-tarot-07-chariot", "swords10", "rws-tarot-04-emperor",
  "rws-tarot-09-hermit", "wands02", "rws-tarot-20-judgement", "cups06", "rws-tarot-15-devil",
  "rws-tarot-10-wheel-of-fortune", "pents02", "rws-tarot-08-strength", "swords06", "rws-tarot-05-hierophant",
  "rws-tarot-14-temperance", "cups03", "wands06", "pents05", "swords02",
];

interface EscenaGrabadosProps {
  t: Traducir;
  autenticado: boolean;
}

/**
 * Escena 1 · Los grabados (suelo tinta). La mesa girada de grabados detrás, la palabra a pincel y la tesis en
 * tres líneas como único h1. El LCP es la tesis (texto): nada de aquí se esconde ni espera a una animación.
 */
export function EscenaGrabados({ t, autenticado }: EscenaGrabadosProps) {
  return (
    <Escena suelo="tinta" aria-labelledby="portada-tesis" className="portada-grabados">
      <MesaDeGrabados slugs={[...MESA_PORTADA]} columnas={8} filas={5} />
      <div aria-hidden="true" className="portada-velo" />
      <div className="portada-contenido portada-grabados__contenido">
        <Etiqueta>{t("portada.grabados.etiqueta")}</Etiqueta>
        <Pincel aria-hidden="true" className="portada-grabados__pincel">
          {t("portada.grabados.pincel")}
        </Pincel>
        <h1 id="portada-tesis" className="portada-tesis">
          <span>{t("portada.grabados.tesis1")}</span> <span>{t("portada.grabados.tesis2")}</span>{" "}
          <span className="portada-tesis__tuya">{t("portada.grabados.tesis3")}</span>
        </h1>
        <div className="portada-acciones">
          <Link href={autenticado ? "/reading/new" : "/register"} className={buttonClasses({ size: "lg" })}>
            {t("portada.grabados.cta")}
            <span aria-hidden="true" className="portada-flecha">
              →
            </span>
          </Link>
          {autenticado ? (
            <Link href="/dashboard" className={buttonClasses({ variant: "linea", size: "lg" })}>
              {t("portada.grabados.irEspacio")}
            </Link>
          ) : (
            <Link href="#hoy" className={buttonClasses({ variant: "linea", size: "lg" })}>
              {t("portada.grabados.verHoy")}
            </Link>
          )}
          {!autenticado && <p className="portada-nota">{t("portada.grabados.nota")}</p>}
        </div>
      </div>
    </Escena>
  );
}

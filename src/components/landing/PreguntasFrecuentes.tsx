import { Escena } from "@/components/tinta/Escena";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import type { Traducir } from "./tipos";

/**
 * Preguntas frecuentes (suelo papel), las mismas tres de siempre (SEO), como pliego: `<details>` nativo, sin JS,
 * con la pregunta en Gloock y un filete entre cada una.
 */
export function PreguntasFrecuentes({ t }: { t: Traducir }) {
  const preguntas = [1, 2, 3].map((n) => ({ pregunta: t(`faq.q${n}`), respuesta: t(`faq.a${n}`) }));

  return (
    <Escena suelo="papel" aria-labelledby="portada-faq-titulo" className="portada-faq">
      <div className="portada-contenido portada-faq__contenido">
        <div className="portada-faq__cabeza" data-revelar>
          <Etiqueta>{t("portada.faq.etiqueta")}</Etiqueta>
          <h2 id="portada-faq-titulo" className="portada-h2-chico">
            {t("faq.title")}
          </h2>
          <p className="text-grafito">{t("faq.subtitle")}</p>
        </div>
        <div className="portada-faq__lista">
          {preguntas.map(({ pregunta, respuesta }) => (
            <details key={pregunta} className="portada-faq__item">
              <summary>
                <h3>{pregunta}</h3>
                <span aria-hidden="true" className="portada-faq__signo" />
              </summary>
              <p>{respuesta}</p>
            </details>
          ))}
        </div>
      </div>
    </Escena>
  );
}

import { Escena } from "@/components/tinta/Escena";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { GrabadoParticulas } from "@/components/tinta/GrabadoParticulas";
import type { Traducir } from "./tipos";

/** El grabado que se deshace: El Loco, que abre la lectura de ejemplo. */
export const GRABADO_PORTADA = "rws-tarot-00-fool";

/**
 * Escena 2 · Del grabado a la IA (suelo papel), DEBAJO del héroe. El Loco se deshace en partículas al hacer
 * scroll y se recompone en las primeras líneas de una lectura de ejemplo. En ≤ 820 px, con reduced-motion o
 * sin JS, `GrabadoParticulas` deja el grabado y el texto quietos (todo visible).
 */
export function EscenaDelGrabado({ t }: { t: Traducir }) {
  return (
    <Escena suelo="papel" aria-labelledby="portada-grabado-titulo" className="portada-grabado">
      <GrabadoParticulas
        carta={{ slug: GRABADO_PORTADA }}
        texto={[t("portada.grabado.lectura1"), t("portada.grabado.lectura2")]}
        firma={t("portada.grabado.firma")}
        alt={t("portada.grabado.alt")}
      >
        <Etiqueta>{t("portada.grabado.etiqueta")}</Etiqueta>
        <h2 id="portada-grabado-titulo" className="portada-h2 max-w-[14ch]">
          {t("portada.grabado.titulo")}
        </h2>
        <p className="max-w-[42ch] text-grafito">{t("portada.grabado.bajada")}</p>
      </GrabadoParticulas>
    </Escena>
  );
}

import { Escena } from "@/components/tinta/Escena";
import { Pincel } from "@/components/tinta/Pincel";
import { EnlaceBoton } from "./EnlaceBoton";
import type { Traducir } from "./tipos";

interface EscenaTuTurnoProps {
  t: Traducir;
  autenticado: boolean;
}

/** Escena 6 · Tu turno (suelo tinta): el pincel y el llamado final. Le sigue el pie (también en tinta). */
export function EscenaTuTurno({ t, autenticado }: EscenaTuTurnoProps) {
  return (
    <Escena suelo="tinta" aria-labelledby="portada-turno-titulo" className="portada-turno">
      <div className="portada-contenido portada-turno__contenido">
        <Pincel aria-hidden="true" className="portada-turno__pincel">
          {t("portada.turno.pincel")}
        </Pincel>
        <h2 id="portada-turno-titulo" className="sr-only">
          {t("portada.turno.titulo")}
        </h2>
        <p className="portada-turno__texto" data-revelar>
          {t("portada.turno.texto")}
        </p>
        <div data-revelar>
          <EnlaceBoton href={autenticado ? "/reading/new" : "/register"}>
            {t(autenticado ? "portada.turno.ctaSesion" : "portada.turno.cta")}
            <span aria-hidden="true" className="portada-flecha">
              →
            </span>
          </EnlaceBoton>
        </div>
      </div>
    </Escena>
  );
}

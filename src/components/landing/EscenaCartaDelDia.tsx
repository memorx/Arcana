"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { CartaQuemable } from "@/components/tinta/CartaQuemable";
import { Escena } from "@/components/tinta/Escena";
import { Etiqueta } from "@/components/tinta/Etiqueta";

export interface TextosCartaDelDia {
  /** «La carta de hoy · 2 Tochtli» */
  etiqueta: string;
  titulo: string;
  /** «La carta de hoy está boca abajo. Tócala para voltearla.» (sólo con JS, antes de voltearla) */
  estado: string;
  /** «Carta del día · 6 de noviembre de 2026» */
  fecha: string;
  /** Primera oración del significado de la carta (de la base), si la hay. */
  sentido: string | null;
  complemento: string;
  /** Marca de ejemplo: «Mensaje de ejemplo · Arcana». */
  firma: string;
  cta: string;
  /** aria-label de la carta boca abajo (`carta.voltearPosicion`). */
  voltear: string;
}

interface EscenaCartaDelDiaProps {
  carta: { nombre: string; slug: string };
  textos: TextosCartaDelDia;
  ctaHref: string;
}

/**
 * Escena 3 · La carta del día (suelo tinta). Una carta de ejemplo boca abajo; al tocarla se quema
 * (`CartaQuemable`) y aparece su mensaje. Sin JS la carta y el mensaje se ven completos (portada.css:
 * `@media (scripting: none)`); con JS el mensaje espera a que la carta se voltee.
 */
export function EscenaCartaDelDia({ carta, textos, ctaHref }: EscenaCartaDelDiaProps) {
  const [revelada, setRevelada] = useState(false);

  return (
    <Escena suelo="tinta" id="hoy" aria-labelledby="portada-carta-titulo" className="portada-carta">
      <div className="portada-contenido portada-carta__contenido">
        <div className="portada-carta__texto">
          <Etiqueta>{textos.etiqueta}</Etiqueta>
          <h2 id="portada-carta-titulo" className="portada-h2">
            {textos.titulo}
          </h2>
          {!revelada && <p className="portada-carta__estado">{textos.estado}</p>}
          <div
            className="portada-carta__mensaje"
            data-oculto={revelada ? undefined : ""}
            data-testid="mensaje-carta-del-dia"
            aria-live="polite"
          >
            <p className="portada-carta__fecha">{textos.fecha}</p>
            <h3 className="portada-carta__nombre">{carta.nombre}</h3>
            {textos.sentido && <p>{textos.sentido}</p>}
            <p className="text-niebla">{textos.complemento}</p>
            <p className="portada-carta__firma">{textos.firma}</p>
            <p className="mt-2">
              <Link href={ctaHref} className={buttonClasses({ variant: "linea", size: "md" })}>
                {textos.cta}
              </Link>
            </p>
          </div>
        </div>
        <div className="portada-carta__lamina">
          <CartaQuemable
            key={carta.slug}
            carta={carta}
            tamano="grande"
            etiqueta={textos.voltear}
            onRevelada={() => setRevelada(true)}
          />
        </div>
      </div>
    </Escena>
  );
}

import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Footer, Header } from "@/components/layout";
import {
  EscenaCartaDelDia,
  EscenaDelGrabado,
  EscenaGrabados,
  EscenaHoy,
  EscenaMasQueTarot,
  EscenaTuTurno,
  PreguntasFrecuentes,
  RevelarAlScroll,
} from "@/components/landing";
import { CollectivePulse } from "@/components/landing/CollectivePulse";
import { cargarCartaDelDia } from "@/components/landing/datosCartaDelDia";
import "@/components/landing/portada.css";
import { auth } from "@/lib/auth";
import { getTonalli, todayUtc } from "@/lib/systems";

/**
 * La portada «Dos tintas»: las seis escenas de design/maqueta/index.html con datos reales
 * (la hora del día, la carta de ejemplo del día, el pulso colectivo si hay datos, el tonalli de hoy).
 * Ritmo de suelos: tinta → papel → tinta → papel → (marquesina en tinta) → papel → tinta.
 */
export default async function Home() {
  const session = await auth();
  const autenticado = !!session?.user;
  const t = await getTranslations("landing");
  const tPulse = await getTranslations("pulse");
  const tCarta = await getTranslations("carta");
  const locale = await getLocale();

  // Un solo «hoy» para toda la página: el día UTC, como la cabecera, /calendar y la carta del día.
  const hoy = todayUtc();
  const tonalli = getTonalli(hoy);
  const carta = await cargarCartaDelDia(hoy, locale);
  const fecha = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(hoy);

  return (
    <>
      <Header />
      <main id="main-content" className="portada flex-1">
        <EscenaGrabados t={t} autenticado={autenticado} />
        <EscenaDelGrabado t={t} />
        <EscenaCartaDelDia
          carta={{ nombre: carta.nombre, slug: carta.slug }}
          ctaHref="/subscribe"
          textos={{
            etiqueta: t("portada.carta.etiqueta", { tonalli: `${tonalli.number} ${tonalli.sign.nahuatl}` }),
            titulo: t("portada.carta.titulo"),
            estado: t("portada.carta.estado"),
            fecha: t("portada.carta.fecha", { fecha }),
            sentido: carta.sentido,
            complemento: t("portada.carta.complemento"),
            firma: t("portada.carta.firma"),
            cta: t("portada.carta.cta"),
            voltear: tCarta("voltearPosicion", { posicion: t("portada.carta.posicion") }),
          }}
        />
        {/* Pulso colectivo: no aparece si hoy hubo muy pocas lecturas */}
        <Suspense fallback={null}>
          <CollectivePulse />
        </Suspense>
        <EscenaMasQueTarot t={t} tPulse={tPulse} />
        <EscenaHoy t={t} dia={hoy} locale={locale} autenticado={autenticado} />
        <PreguntasFrecuentes t={t} />
        <EscenaTuTurno t={t} autenticado={autenticado} />
        <RevelarAlScroll />
      </main>
      <Footer />
    </>
  );
}

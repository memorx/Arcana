import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { IndiceCartas, type CartaDelIndice } from "./IndiceCartas";
import { esPalo, type Palo } from "./indice";
import { EnlaceBoton } from "./EnlaceBoton";

interface Props {
  searchParams?: Promise<{ [clave: string]: string | string[] | undefined }>;
}

const primero = (valor: string | string[] | undefined) => (Array.isArray(valor) ? valor[0] : valor);

/**
 * Explora el tarot: índice público de los 78 grabados (SEO). Se pinta completo en el servidor, así que se lee
 * igual sin JavaScript: los filtros son enlaces (`?palo=`) y la búsqueda un formulario GET (`?q=`). Con JS,
 * `IndiceCartas` filtra al instante sin volver al servidor.
 */
export default async function CardsPage({ searchParams }: Props) {
  const t = await getTranslations("cards");
  const locale = await getLocale();
  const parametros = (await searchParams) ?? {};
  const paloPedido = primero(parametros.palo);
  const palo: Palo | "all" = esPalo(paloPedido) ? paloPedido : "all";
  const busqueda = (primero(parametros.q) ?? "").slice(0, 80);

  // La misma consulta que /api/cards.
  let cartas: CartaDelIndice[] = [];
  try {
    cartas = await prisma.card.findMany({
      orderBy: [{ arcana: "asc" }, { suit: "asc" }, { number: "asc" }],
      select: { id: true, name: true, nameEs: true, slug: true, arcana: true, suit: true, number: true, keywords: true },
    });
  } catch (error) {
    console.error("Error fetching cards:", error);
  }

  return (
    <div className="grid gap-[clamp(32px,6vh,56px)]">
      <header className="grid max-w-[46rem] gap-3.5">
        <Etiqueta>{t("kicker")}</Etiqueta>
        <h1 className="text-[clamp(2rem,1.4rem+2vw,3.2rem)] leading-[1.05]">{t("title")}</h1>
        <p className="max-w-[52ch] text-[1.125rem] leading-[1.55] text-letra-suave">{t("subtitle")}</p>
      </header>

      <IndiceCartas
        key={`${palo}|${busqueda}`}
        cartas={cartas}
        paloInicial={palo}
        busquedaInicial={busqueda}
        locale={locale}
      />

      {/* CTA */}
      <Card variant="highlighted" className="grid justify-items-start gap-4 p-[clamp(20px,4vw,40px)]">
        <h2 className="text-[clamp(1.5rem,1.2rem+1vw,2.1rem)] leading-[1.1]">{t("cta.title")}</h2>
        <p className="max-w-[52ch] text-letra-suave">{t("cta.subtitle")}</p>
        <EnlaceBoton href="/reading/new" size="lg">
          {t("cta.button")}
        </EnlaceBoton>
      </Card>
    </div>
  );
}

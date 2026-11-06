import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { cartaImagen, MEDIDAS_CARTA } from "@/lib/cartas";
import { numeroRomano } from "../indice";
import { EnlaceBoton } from "../EnlaceBoton";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const card = await prisma.card.findUnique({
    where: { slug },
  });

  if (!card) {
    return { title: "Card Not Found" };
  }

  return {
    title: `${card.name} - ${card.nameEs}`,
    description: card.meaningUpright.slice(0, 160),
  };
}

/** Ficha de una carta como lámina: el grabado a color grande, su número romano, nombre, palabras clave en mono
 *  y los dos significados en Newsreader. Página pública: se pinta completa en el servidor. */
export default async function CardDetailPage({ params }: Props) {
  const { slug } = await params;
  const t = await getTranslations("cardDetail");
  const tComun = await getTranslations("common");
  const locale = await getLocale();

  const card = await prisma.card.findUnique({
    where: { slug },
  });

  if (!card) {
    notFound();
  }

  const displayName = locale === "es" ? card.nameEs : card.name;
  const otherName = locale === "es" ? card.name : card.nameEs;
  const suitNames: Record<string, { en: string; es: string }> = {
    WANDS: { en: "Wands", es: "Bastos" },
    CUPS: { en: "Cups", es: "Copas" },
    SWORDS: { en: "Swords", es: "Espadas" },
    PENTACLES: { en: "Pentacles", es: "Oros" },
  };

  const arcanaLabel =
    card.arcana === "MAJOR"
      ? locale === "es"
        ? "Arcano Mayor"
        : "Major Arcana"
      : locale === "es"
      ? `Arcano Menor - ${suitNames[card.suit!]?.es || card.suit}`
      : `Minor Arcana - ${suitNames[card.suit!]?.en || card.suit}`;

  // Focus areas this card often appears in (based on keywords)
  const focusAreas: string[] = [];
  const keywordString = card.keywords.join(" ").toLowerCase();
  if (
    keywordString.includes("amor") ||
    keywordString.includes("relacion") ||
    keywordString.includes("union")
  ) {
    focusAreas.push(t("focusAreas.love"));
  }
  if (
    keywordString.includes("trabajo") ||
    keywordString.includes("carrera") ||
    keywordString.includes("dinero") ||
    keywordString.includes("abundancia")
  ) {
    focusAreas.push(t("focusAreas.career"));
  }
  if (
    keywordString.includes("espiritual") ||
    keywordString.includes("intuicion") ||
    keywordString.includes("sabidur")
  ) {
    focusAreas.push(t("focusAreas.spirituality"));
  }
  if (focusAreas.length === 0) {
    focusAreas.push(t("focusAreas.general"));
  }

  const uprightText = locale === "en" && card.meaningUprightEn ? card.meaningUprightEn : card.meaningUpright;
  const reversedText = locale === "en" && card.meaningReversedEn ? card.meaningReversedEn : card.meaningReversed;
  const numeral = numeroRomano(card.number);

  return (
    <div className="grid gap-[clamp(36px,7vh,72px)]">
      {/* Migas: de vuelta al índice */}
      <Link
        href="/cards"
        className="inline-flex min-h-11 w-fit items-center gap-2 font-dato text-xs tracking-[0.12em] text-letra-suave uppercase no-underline hover:text-rosa-texto"
      >
        <span aria-hidden="true" className="font-lectura text-base tracking-normal">
          ←
        </span>
        {t("backToCards")}
      </Link>

      {/* La lámina: en móvil el título va primero; desde md el grabado queda fijo a la izquierda */}
      <article className="grid gap-x-[clamp(32px,6vw,96px)] gap-y-9 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <header className="grid min-w-0 content-start gap-3 md:col-start-2 md:row-start-1">
          <Etiqueta>{arcanaLabel}</Etiqueta>
          <p
            aria-hidden="true"
            className="font-dato text-[clamp(2.75rem,2rem+3vw,4.5rem)] leading-none tracking-[-0.02em] text-rosa"
          >
            {numeral}
          </p>
          <h1 className="text-[clamp(2.2rem,1.5rem+2.4vw,3.6rem)] leading-[1.02]">{displayName}</h1>
          <p className="font-lectura text-[1.1875rem] italic text-letra-suave">{otherName}</p>
        </header>

        <figure className="grid w-full max-w-[min(340px,78vw)] gap-3 justify-self-center md:sticky md:top-[calc(var(--alto-cabecera)+24px)] md:col-start-1 md:row-span-2 md:row-start-1 md:max-w-[420px] md:self-start md:justify-self-stretch">
          <div className="overflow-hidden rounded-[14px] border border-tinta/20 shadow-[0_30px_60px_-34px_rgb(14_13_12/0.55)]">
            <Image
              src={cartaImagen(card)}
              alt={displayName}
              width={MEDIDAS_CARTA.color.width}
              height={MEDIDAS_CARTA.color.height}
              className="h-auto w-full"
              priority
              unoptimized
            />
          </div>
          <figcaption className="font-dato text-[0.625rem] leading-[1.5] tracking-[0.1em] text-letra-suave uppercase">
            {tComun("cardsCredit")}
          </figcaption>
        </figure>

        <div className="grid min-w-0 content-start gap-9 md:col-start-2">
          {/* Palabras clave */}
          <section aria-labelledby="palabras-clave" className="grid gap-3 border-t border-filete pt-4">
            <h2
              id="palabras-clave"
              className="font-dato text-[0.6875rem] leading-[1.4] tracking-[0.12em] text-letra-suave uppercase"
            >
              {t("keywords")}
            </h2>
            <ul className="flex flex-wrap gap-x-2 gap-y-2.5">
              {card.keywords.map((keyword, i) => (
                <li
                  key={i}
                  className="rounded-full border border-filete/40 px-3 py-1 font-dato text-[0.75rem] leading-[1.4] tracking-[0.06em] text-letra"
                >
                  {keyword}
                </li>
              ))}
            </ul>
          </section>

          {/* Aparece en */}
          <section aria-labelledby="aparece-en" className="grid gap-3 border-t border-filete/25 pt-4">
            <h2
              id="aparece-en"
              className="font-dato text-[0.6875rem] leading-[1.4] tracking-[0.12em] text-letra-suave uppercase"
            >
              {t("appearsIn")}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {focusAreas.map((area, i) => (
                <li key={i}>
                  <Badge variant="primary">{area}</Badge>
                </li>
              ))}
            </ul>
          </section>

          {/* Significados: al derecho e invertido, en Newsreader */}
          <section aria-labelledby="al-derecho" className="grid content-start gap-4 border-t-2 border-tinta pt-5">
            <div className="flex items-start gap-4">
              <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full border border-tinta">
                <span className="block h-4 w-2.5 rounded-[2px] border border-t-[3px] border-tinta" />
              </span>
              <div className="grid gap-1">
                <h2 id="al-derecho" className="text-[clamp(1.5rem,1.2rem+1vw,2rem)] leading-[1.1]">
                  {t("upright")}
                </h2>
                <p className="font-dato text-[0.6875rem] leading-[1.5] tracking-[0.1em] text-letra-suave uppercase">
                  {t("uprightSubtitle")}
                </p>
              </div>
            </div>
            <p className="max-w-[66ch] text-[1.125rem] leading-[1.7]">{uprightText}</p>
          </section>

          <section aria-labelledby="invertido" className="grid content-start gap-4 border-t-2 border-rosa pt-5">
            <div className="flex items-start gap-4">
              <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full border border-rosa">
                <span className="block h-4 w-2.5 rotate-180 rounded-[2px] border border-t-[3px] border-rosa" />
              </span>
              <div className="grid gap-1">
                <h2 id="invertido" className="text-[clamp(1.5rem,1.2rem+1vw,2rem)] leading-[1.1]">
                  {t("reversed")}
                </h2>
                <p className="font-dato text-[0.6875rem] leading-[1.5] tracking-[0.1em] text-letra-suave uppercase">
                  {t("reversedSubtitle")}
                </p>
              </div>
            </div>
            <p className="max-w-[66ch] text-[1.125rem] leading-[1.7]">{reversedText}</p>
          </section>
        </div>
      </article>

      {/* CTA */}
      <Card variant="highlighted" className="grid justify-items-start gap-4 p-[clamp(20px,4vw,40px)]">
        <h2 className="text-[clamp(1.5rem,1.2rem+1vw,2.1rem)] leading-[1.1]">
          {t("cta.title", { card: displayName })}
        </h2>
        <p className="max-w-[52ch] text-letra-suave">{t("cta.subtitle")}</p>
        <EnlaceBoton href="/reading/new" size="lg">
          {t("cta.button")}
        </EnlaceBoton>
      </Card>
    </div>
  );
}

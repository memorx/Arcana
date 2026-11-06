import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Badge, buttonClasses } from "@/components/ui";
import { Header, Footer } from "@/components/layout";
import { Escena } from "@/components/tinta/Escena";
import { Pincel } from "@/components/tinta/Pincel";
import { Tirada, CartaFija, type PosicionTirada } from "@/components/reading/Tirada";
import {
  IntencionCita,
  Interpretacion,
  SignificadosCartas,
  type SignificadoCarta,
} from "@/components/reading/LecturaPliego";

interface PageProps {
  params: Promise<{ shareId: string }>;
}

/** Lectura pública: el mismo pliego que /reading/[id], sin lo privado, y la invitación a hacer la tuya. */
export default async function SharedReadingPage({ params }: PageProps) {
  const { shareId } = await params;
  const t = await getTranslations("reading");
  const locale = await getLocale();

  const reading = await prisma.reading.findUnique({
    where: { shareId },
    include: {
      spreadType: true,
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!reading || !reading.isPublic) {
    notFound();
  }

  // Get cards data
  const readingCards = reading.cards as Array<{
    position: number;
    cardId: string;
    isReversed: boolean;
  }>;

  const cardIds = readingCards.map((c) => c.cardId);
  const cards = await prisma.card.findMany({
    where: { id: { in: cardIds } },
  });

  const cardsMap = new Map(cards.map((c) => [c.id, c]));
  const positions = reading.spreadType.positions as Array<{
    position: number;
    name: string;
    nameEs: string;
    description: string;
  }>;

  const spreadName =
    locale === "en" ? reading.spreadType.name : reading.spreadType.nameEs;
  const sharedByName = reading.user.name || t("anonymous");

  const shown = [...readingCards]
    .sort((a, b) => Number(a.position) - Number(b.position))
    .flatMap((readingCard) => {
      const card = cardsMap.get(readingCard.cardId);
      const position = positions.find((p) => Number(p.position) === Number(readingCard.position));
      return card && position ? [{ readingCard, card, position }] : [];
    });
  const spreadPositions: PosicionTirada[] = shown.map(({ position }) => ({
    numero: Number(position.position),
    nombre: locale === "en" ? position.name : position.nameEs,
  }));
  const meanings: SignificadoCarta[] = shown.map(({ readingCard, card, position }) => ({
    numero: Number(position.position),
    posicion: locale === "en" ? position.name : position.nameEs,
    nombre: locale === "en" ? card.name : card.nameEs,
    invertida: readingCard.isReversed,
    significado: readingCard.isReversed
      ? locale === "en" && card.meaningReversedEn
        ? card.meaningReversedEn
        : card.meaningReversed
      : locale === "en" && card.meaningUprightEn
        ? card.meaningUprightEn
        : card.meaningUpright,
    claves: card.keywords,
  }));

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1 scroll-mt-(--alto-cabecera)">
        <article className="mx-auto grid w-full max-w-pliego gap-[clamp(40px,7vh,72px)] px-gutter py-[clamp(32px,6vh,64px)]">
          {/* Header */}
          <header className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary">{spreadName}</Badge>
              <Badge variant="secondary" className="max-w-full whitespace-normal break-words">
                {t("sharedBy")}: {sharedByName}
              </Badge>
              <span className="font-dato text-[0.6875rem] tracking-[0.08em] text-letra-suave">
                {new Date(reading.createdAt).toLocaleDateString(
                  locale === "en" ? "en-US" : "es-ES",
                  {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }
                )}
              </span>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
              <h1 className="font-titulo text-[clamp(2rem,1.4rem+2vw,3.2rem)] leading-[1.05]">{t("yourReading")}</h1>
              <Link href="/register" className={buttonClasses({ variant: "linea" })}>
                {t("anotherReading")}
              </Link>
            </div>
            <IntencionCita titulo={t("yourIntention")} intencion={reading.intention} locale={locale} className="mt-2 max-w-[760px]" />
          </header>

          {/* Cards */}
          <section aria-labelledby="cartas-titulo" className="grid gap-8">
            <h2 id="cartas-titulo" className="font-titulo text-[clamp(1.6rem,1.2rem+1.2vw,2.2rem)] leading-[1.05]">
              {t("cardsRevealed")}
            </h2>
            {shown.length > 0 && (
              <Tirada
                posiciones={spreadPositions}
                nombreTirada={reading.spreadType.name}
                etiqueta={t("cards", { count: shown.length })}
                carta={(_, i) => (
                  <CartaFija
                    carta={shown[i].card}
                    alt={locale === "en" ? shown[i].card.name : shown[i].card.nameEs}
                    invertida={shown[i].readingCard.isReversed}
                    prioridad={i < 3}
                  />
                )}
                pie={(_, i) => (
                  <p className="font-titulo text-[clamp(1rem,0.9rem+0.5vw,1.4rem)] leading-[1.15]">
                    {locale === "en" ? shown[i].card.name : shown[i].card.nameEs}
                  </p>
                )}
              />
            )}
            {meanings.length > 0 && (
              <SignificadosCartas cartas={meanings} textos={{ reversed: t("reversed"), meaning: t("meaning") }} />
            )}
          </section>

          {/* Interpretation */}
          <Interpretacion titulo={t("interpretation")} texto={reading.interpretation} />
        </article>

        {/* CTA: your turn (closes on ink, with the footer) */}
        <Escena suelo="tinta" aria-labelledby="cta-titulo">
          <div className="mx-auto grid w-full max-w-pliego justify-items-start gap-6 px-gutter pt-[clamp(64px,12vh,128px)] pb-12">
            <Pincel aria-hidden="true" className="text-[clamp(3.5rem,2rem+6vw,7.5rem)]">
              {t("yourTurn")}
            </Pincel>
            <h2 id="cta-titulo" className="max-w-[26ch] font-titulo text-[clamp(1.5rem,1.2rem+1vw,2.1rem)] leading-[1.15]">
              {t("shareCta.title")}
            </h2>
            <p className="max-w-[46ch] text-letra-suave">{t("shareCta.subtitle")}</p>
            <Link href="/register" className={buttonClasses({ size: "lg" })}>
              {t("anotherReading")}
            </Link>
          </div>
        </Escena>
      </main>
      <Footer />
    </>
  );
}

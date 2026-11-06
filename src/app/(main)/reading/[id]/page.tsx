import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge, buttonClasses, ShareButton } from "@/components/ui";
import { Tirada, CartaFija, type PosicionTirada } from "@/components/reading/Tirada";
import {
  IntencionCita,
  Interpretacion,
  SignificadosCartas,
  type SignificadoCarta,
} from "@/components/reading/LecturaPliego";
import { PersonalNotes } from "@/components/reading/PersonalNotes";
import { FollowUpChat } from "@/components/reading/FollowUpChat";
import { ReadAloud } from "@/components/reading/ReadAloud";
import { ResonanceCheck } from "@/components/reading/ResonanceCheck";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReadingPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?callbackUrl=/reading/${id}`);
  }

  const t = await getTranslations("reading");
  const tManual = await getTranslations("manual");
  const locale = await getLocale();

  const reading = await prisma.reading.findUnique({
    where: { id },
    include: { spreadType: true },
  });

  if (!reading) {
    notFound();
  }

  // Verify ownership
  if (reading.userId !== session.user.id) {
    redirect("/dashboard");
  }

  // Get cards data
  const readingCards = reading.cards as Array<{
    position: number;
    cardId: string;
    isReversed: boolean;
  }>;

  const cardIds = readingCards.map((c) => c.cardId);
  const [cards, followUps, user] = await Promise.all([
    prisma.card.findMany({
      where: { id: { in: cardIds } },
    }),
    prisma.readingFollowUp.findMany({
      where: { readingId: id },
      orderBy: { createdAt: "asc" },
      select: { id: true, question: true, answer: true, creditsCharged: true, createdAt: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true },
    }),
  ]);

  const cardsMap = new Map(cards.map((c) => [c.id, c]));
  const positions = reading.spreadType.positions as Array<{
    position: number;
    name: string;
    nameEs: string;
    description: string;
  }>;

  const spreadName = locale === "en" ? reading.spreadType.name : reading.spreadType.nameEs;

  // The cards that can be shown (card and position found), in position order
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
    <article className="grid gap-[clamp(40px,7vh,72px)]">
      {/* Header */}
      <header className="grid max-w-[760px] gap-4">
        <Link
          href="/history"
          className="inline-flex min-h-11 items-center gap-2 justify-self-start font-dato text-xs tracking-[0.1em] text-letra-suave uppercase hover:text-letra"
        >
          <span aria-hidden="true">←</span>
          {t("backToHistory")}
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">{spreadName}</Badge>
          {reading.source === "manual" && <Badge variant="secondary">{tManual("badge")}</Badge>}
          <span className="font-dato text-[0.6875rem] tracking-[0.08em] text-letra-suave">
            {new Date(reading.createdAt).toLocaleDateString(
              locale === "en" ? "en-US" : "es-ES",
              {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }
            )}
          </span>
        </div>
        <h1 className="font-titulo text-[clamp(2rem,1.4rem+2vw,3.2rem)] leading-[1.05]">{t("yourReading")}</h1>
        <IntencionCita titulo={t("yourIntention")} intencion={reading.intention} locale={locale} className="mt-2" />
      </header>

      {/* The cards, in the figure of the spread, and what each one says */}
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
      <Interpretacion
        titulo={t("interpretation")}
        texto={reading.interpretation}
        accion={<ReadAloud text={reading.interpretation} locale={locale} />}
      />

      {/* How the reading resonated (asks after 24 h; shows the rating once given) */}
      <ResonanceCheck
        readingId={id}
        createdAt={reading.createdAt.toISOString()}
        resonance={reading.resonance}
        resonanceNote={reading.resonanceNote}
        locale={locale}
      />

      {/* Personal Notes */}
      <PersonalNotes
        readingId={id}
        initialNotes={reading.personalNotes}
      />

      {/* Follow-up questions */}
      <FollowUpChat
        readingId={id}
        initialFollowUps={followUps.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() }))}
        credits={user?.credits ?? 0}
        locale={locale}
      />

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 border-t border-filete/20 pt-8">
        <Link href="/reading/new" className={buttonClasses()}>
          {t("anotherReading")}
        </Link>
        <ShareButton
          readingId={id}
          translations={{
            share: t("share"),
            shareReading: t("shareReading"),
            shareDescription: t("shareDescription"),
            makePublic: t("makePublic"),
            makePrivate: t("makePrivate"),
            copyLink: t("copyLink"),
            linkCopied: t("linkCopied"),
            publicReading: t("publicReading"),
            privateReading: t("privateReading"),
            shareLink: t("shareLink"),
            close: t("close"),
          }}
        />
        <Link href="/history" className={buttonClasses({ variant: "linea" })}>
          {t("viewHistory")}
        </Link>
      </div>
    </article>
  );
}

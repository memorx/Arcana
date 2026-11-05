import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  SavedReadingCard,
  ShareButton,
} from "@/components/ui";
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

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/history"
          className="text-slate-400 hover:text-slate-300 text-sm mb-4 inline-flex items-center gap-1"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {t("backToHistory")}
        </Link>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-2">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <Badge variant="primary">{spreadName}</Badge>
              {reading.source === "manual" && (
                <Badge variant="secondary">
                  <span aria-hidden="true" className="mr-1">&#127924;</span>
                  {tManual("badge")}
                </Badge>
              )}
              <span className="text-sm text-slate-500">
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
            <h1 className="text-2xl font-bold text-slate-100">{t("yourReading")}</h1>
          </div>
          <Link href="/reading/new">
            <Button variant="secondary">{t("newReading")}</Button>
          </Link>
        </div>
      </div>

      {/* Intention */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-amber-400">&#10022;</span>
            {t("yourIntention")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-300 italic">&quot;{reading.intention}&quot;</p>
        </CardContent>
      </Card>

      {/* Cards Grid */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-100 mb-4">
          {t("cardsRevealed")}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {readingCards.map((readingCard) => {
            const card = cardsMap.get(readingCard.cardId);
            const position = positions.find(
              (p) => Number(p.position) === Number(readingCard.position)
            );

            if (!card || !position) return null;

            // Extract number from card id (e.g., "major_0" -> 0, "wands_5" -> 5)
            const cardNumber = parseInt(card.id.split("_").pop() || "0") || 0;

            return (
              <SavedReadingCard
                key={readingCard.position}
                card={{
                  id: card.id,
                  name: card.name,
                  nameEs: card.nameEs,
                  arcana: card.arcana,
                  suit: card.suit,
                  number: cardNumber,
                  imageUrl: card.imageUrl,
                  meaningUpright: card.meaningUpright,
                  meaningReversed: card.meaningReversed,
                  meaningUprightEn: card.meaningUprightEn,
                  meaningReversedEn: card.meaningReversedEn,
                  keywords: card.keywords,
                }}
                position={position}
                isReversed={readingCard.isReversed}
                locale={locale}
                translations={{
                  position: t("position", { number: position.position }),
                  reversed: t("reversed"),
                  meaning: t("meaning"),
                }}
              />
            );
          })}
        </div>
      </section>

      {/* Interpretation */}
      <Card variant="highlighted">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <span className="text-amber-400">&#9788;</span>
            {t("interpretation")}
          </CardTitle>
          <ReadAloud text={reading.interpretation} locale={locale} />
        </CardHeader>
        <CardContent>
          <div className="prose prose-invert prose-slate max-w-none">
            {reading.interpretation.split("\n").map((paragraph, i) => (
              <p key={i} className="text-slate-300 mb-4 last:mb-0">
                {paragraph}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>

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
      <div className="flex justify-center gap-4 mt-8">
        <Link href="/reading/new">
          <Button>{t("anotherReading")}</Button>
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
          }}
        />
        <Link href="/history">
          <Button variant="secondary">{t("viewHistory")}</Button>
        </Link>
      </div>
    </div>
  );
}

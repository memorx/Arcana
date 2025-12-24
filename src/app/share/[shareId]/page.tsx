import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  SavedReadingCard,
} from "@/components/ui";

interface PageProps {
  params: Promise<{ shareId: string }>;
}

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="primary">{spreadName}</Badge>
                <Badge variant="secondary">{t("sharedBy")}: {sharedByName}</Badge>
                <span className="text-sm text-slate-500">
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
              <h1 className="text-2xl font-bold text-slate-100">{t("yourReading")}</h1>
            </div>
            <Link href="/register">
              <Button>{t("anotherReading")}</Button>
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
                (p) => p.position === readingCard.position
              );

              if (!card || !position) return null;

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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-amber-400">&#9788;</span>
              {t("interpretation")}
            </CardTitle>
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

        {/* CTA */}
        <div className="text-center mt-12 p-8 bg-gradient-to-r from-purple-900/30 to-amber-900/20 rounded-lg border border-slate-800">
          <h2 className="text-xl font-semibold text-slate-100 mb-2">
            Want your own reading?
          </h2>
          <p className="text-slate-400 mb-4">
            Sign up now and get 3 free readings
          </p>
          <Link href="/register">
            <Button size="lg">{t("anotherReading")}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

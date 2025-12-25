import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, Button, Badge } from "@/components/ui";

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

export default async function CardDetailPage({ params }: Props) {
  const { slug } = await params;
  const t = await getTranslations("cardDetail");
  const locale = await getLocale();

  const card = await prisma.card.findUnique({
    where: { slug },
  });

  if (!card) {
    notFound();
  }

  const displayName = locale === "es" ? card.nameEs : card.name;
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
    focusAreas.push(locale === "es" ? "Amor" : "Love");
  }
  if (
    keywordString.includes("trabajo") ||
    keywordString.includes("carrera") ||
    keywordString.includes("dinero") ||
    keywordString.includes("abundancia")
  ) {
    focusAreas.push(locale === "es" ? "Carrera" : "Career");
  }
  if (
    keywordString.includes("espiritual") ||
    keywordString.includes("intuicion") ||
    keywordString.includes("sabidur")
  ) {
    focusAreas.push(locale === "es" ? "Espiritualidad" : "Spirituality");
  }
  if (focusAreas.length === 0) {
    focusAreas.push(locale === "es" ? "General" : "General");
  }

  return (
    <div className="container mx-auto px-4">
      {/* Breadcrumb */}
          <div className="mb-8">
            <Link
              href="/cards"
              className="text-purple-400 hover:text-purple-300 flex items-center gap-2"
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
              {t("backToCards")}
            </Link>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Card Image */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-amber-500/20 blur-3xl" />
                <div className="relative w-72 md:w-80 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl shadow-purple-500/20 border border-purple-500/30">
                  <Image
                    src={card.imageUrl}
                    alt={displayName}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            </div>

            {/* Card Info */}
            <div>
              <Badge variant="secondary" className="mb-4">
                {arcanaLabel}
              </Badge>

              <h1 className="text-4xl md:text-5xl font-bold mb-2">
                <span className="bg-gradient-to-r from-purple-400 to-amber-400 bg-clip-text text-transparent">
                  {displayName}
                </span>
              </h1>

              {locale !== "es" && (
                <p className="text-slate-400 text-lg mb-6">{card.nameEs}</p>
              )}
              {locale === "es" && (
                <p className="text-slate-400 text-lg mb-6">{card.name}</p>
              )}

              {/* Keywords */}
              <div className="mb-8">
                <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">
                  {t("keywords")}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {card.keywords.map((keyword, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-purple-900/30 text-purple-300 rounded-full text-sm"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              {/* Focus Areas */}
              <div className="mb-8">
                <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">
                  {t("appearsIn")}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {focusAreas.map((area, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-amber-900/30 text-amber-300 rounded-full text-sm"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Meanings */}
          <div className="max-w-4xl mx-auto mt-12 space-y-8">
            {/* Upright */}
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-purple-900/50 to-purple-800/30 px-6 py-4 border-b border-purple-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-600/30 flex items-center justify-center">
                    <span className="text-2xl">&#9650;</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-100">
                      {t("upright")}
                    </h2>
                    <p className="text-sm text-slate-400">
                      {t("uprightSubtitle")}
                    </p>
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                <p className="text-slate-300 leading-relaxed">
                  {card.meaningUpright}
                </p>
              </CardContent>
            </Card>

            {/* Reversed */}
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-red-900/30 to-red-800/20 px-6 py-4 border-b border-red-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-red-600/30 flex items-center justify-center">
                    <span className="text-2xl rotate-180">&#9650;</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-100">
                      {t("reversed")}
                    </h2>
                    <p className="text-sm text-slate-400">
                      {t("reversedSubtitle")}
                    </p>
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                <p className="text-slate-300 leading-relaxed">
                  {card.meaningReversed}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* CTA */}
          <div className="max-w-2xl mx-auto mt-16">
            <Card variant="highlighted" className="p-8 text-center">
              <h2 className="text-2xl font-bold text-slate-100 mb-4">
                {t("cta.title", { card: displayName })}
              </h2>
              <p className="text-slate-400 mb-6">{t("cta.subtitle")}</p>
              <Link href="/reading/new">
              <Button size="lg">{t("cta.button")}</Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

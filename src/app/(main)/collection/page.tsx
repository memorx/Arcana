"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, Button } from "@/components/ui";

interface CollectionCard {
  id: string;
  name: string;
  nameEs: string;
  slug: string | null;
  imageUrl: string;
  arcana: string;
  suit: string | null;
  number: number;
  isDiscovered: boolean;
  isGolden: boolean;
}

interface CollectionStats {
  discovered: number;
  total: number;
  percentage: number;
}

interface GoldenStats {
  discovered: number;
  total: number;
  percentage: number;
  totalGoldenCardsFound: number;
}

type FilterType = "all" | "golden" | "major" | "wands" | "cups" | "swords" | "pentacles";

export default function CollectionPage() {
  const t = useTranslations("collection");
  const tGolden = useTranslations("goldenCards");
  const locale = useLocale();
  const [cards, setCards] = useState<CollectionCard[]>([]);
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [goldenStats, setGoldenStats] = useState<GoldenStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/collection")
      .then((res) => res.json())
      .then((data) => {
        setCards(data.cards);
        setStats(data.stats);
        setGoldenStats(data.goldenStats);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filters: { id: FilterType; label: string; isGolden?: boolean }[] = useMemo(() => {
    const majorCount = cards.filter((c) => c.arcana === "MAJOR").length;
    const majorDiscovered = cards.filter((c) => c.arcana === "MAJOR" && c.isDiscovered).length;
    const goldenCount = cards.filter((c) => c.isGolden).length;

    const suitCounts = (suit: string) => {
      const total = cards.filter((c) => c.suit === suit).length;
      const discovered = cards.filter((c) => c.suit === suit && c.isDiscovered).length;
      return { total, discovered };
    };

    return [
      { id: "all" as FilterType, label: t("filters.all") },
      { id: "golden" as FilterType, label: `${tGolden("goldenCardsShort")} (${goldenCount}/${cards.length})`, isGolden: true },
      { id: "major" as FilterType, label: `${t("majorArcana")} (${majorDiscovered}/${majorCount})` },
      { id: "wands" as FilterType, label: `${t("wands")} (${suitCounts("WANDS").discovered}/${suitCounts("WANDS").total})` },
      { id: "cups" as FilterType, label: `${t("cups")} (${suitCounts("CUPS").discovered}/${suitCounts("CUPS").total})` },
      { id: "swords" as FilterType, label: `${t("swords")} (${suitCounts("SWORDS").discovered}/${suitCounts("SWORDS").total})` },
      { id: "pentacles" as FilterType, label: `${t("pentacles")} (${suitCounts("PENTACLES").discovered}/${suitCounts("PENTACLES").total})` },
    ];
  }, [cards, t, tGolden]);

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      if (filter === "golden") return card.isGolden;
      if (filter === "major") return card.arcana === "MAJOR";
      if (filter === "wands") return card.suit === "WANDS";
      if (filter === "cups") return card.suit === "CUPS";
      if (filter === "swords") return card.suit === "SWORDS";
      if (filter === "pentacles") return card.suit === "PENTACLES";
      return true;
    });
  }, [cards, filter]);

  // Group cards by section
  const groupedCards = useMemo(() => {
    if (filter === "golden") return { golden: filteredCards };
    if (filter !== "all") return { [filter]: filteredCards };

    return {
      major: cards.filter((c) => c.arcana === "MAJOR"),
      wands: cards.filter((c) => c.suit === "WANDS"),
      cups: cards.filter((c) => c.suit === "CUPS"),
      swords: cards.filter((c) => c.suit === "SWORDS"),
      pentacles: cards.filter((c) => c.suit === "PENTACLES"),
    };
  }, [cards, filter, filteredCards]);

  const getSectionTitle = (key: string) => {
    switch (key) {
      case "golden": return tGolden("goldenCardsShort");
      case "major": return t("majorArcana");
      case "wands": return t("wands");
      case "cups": return t("cups");
      case "swords": return t("swords");
      case "pentacles": return t("pentacles");
      default: return "";
    }
  };

  const getCardName = (card: CollectionCard) => {
    return locale === "en" ? card.name : card.nameEs;
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header with Progress */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">
          <span className="bg-gradient-to-r from-purple-400 via-amber-400 to-purple-400 bg-clip-text text-transparent">
            {t("title")}
          </span>
        </h1>

        {stats && (
          <div className="max-w-2xl mx-auto">
            {/* Regular Collection Progress */}
            <div className="mb-6">
              <p className="text-slate-400 mb-3">
                {t("progress", { count: stats.discovered, total: stats.total })}
              </p>
              <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-amber-500 transition-all duration-500"
                  style={{ width: `${stats.percentage}%` }}
                />
              </div>
              <p className="text-2xl font-bold text-amber-400 mt-2">
                {stats.percentage}%
              </p>
            </div>

            {/* Golden Collection Progress */}
            {goldenStats && (
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-amber-900/20 via-yellow-900/20 to-amber-900/20 border border-amber-500/30">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="text-xl">&#10024;</span>
                  <span className="text-amber-400 font-semibold">{tGolden("goldenCardsShort")}</span>
                  <span className="text-xl">&#10024;</span>
                </div>
                <p className="text-amber-200/70 text-sm mb-2">
                  {tGolden("collectionProgress", { count: goldenStats.discovered, total: goldenStats.total })}
                </p>
                <div className="h-3 bg-slate-800/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                    style={{ width: `${goldenStats.percentage}%` }}
                  />
                </div>
                <p className="text-lg font-bold text-amber-300 mt-2">
                  {goldenStats.percentage}%
                </p>
                {goldenStats.totalGoldenCardsFound > 0 && (
                  <p className="text-amber-200/50 text-xs mt-1">
                    {tGolden("totalFound", { count: goldenStats.totalGoldenCardsFound })}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === f.id
                ? f.isGolden
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-900"
                  : "bg-purple-600 text-white"
                : f.isGolden
                  ? "bg-slate-800 text-amber-400 hover:bg-slate-700 border border-amber-500/30"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {f.isGolden && <span className="mr-1">&#10024;</span>}
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] bg-slate-800/50 rounded-lg animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Cards Grid */}
      {!loading && (
        <div className="space-y-10">
          {Object.entries(groupedCards).map(([key, sectionCards]) => (
            <section key={key}>
              {filter === "all" && (
                <h2 className="text-xl font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  {getSectionTitle(key)}
                  <span className="text-sm font-normal text-slate-500">
                    ({sectionCards.filter((c) => c.isDiscovered).length}/{sectionCards.length})
                  </span>
                </h2>
              )}

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {sectionCards.map((card) => (
                  <div
                    key={card.id}
                    className="relative"
                    onMouseEnter={() => !card.isDiscovered && !card.isGolden && setShowTooltip(card.id)}
                    onMouseLeave={() => setShowTooltip(null)}
                  >
                    {card.isDiscovered || card.isGolden ? (
                      <Link href={`/cards/${card.slug}`}>
                        <Card
                          variant="interactive"
                          className={`overflow-hidden ${
                            card.isGolden
                              ? "ring-2 ring-amber-400 golden-card-collection"
                              : "ring-2 ring-amber-500/50 hover:ring-amber-400"
                          }`}
                        >
                          <div className="aspect-[2/3] relative">
                            <Image
                              src={card.imageUrl}
                              alt={getCardName(card)}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 12vw"
                              unoptimized
                            />
                            {/* Golden shimmer overlay */}
                            {card.isGolden && (
                              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                <div className="absolute inset-0 golden-shimmer-collection" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity">
                              <div className="absolute bottom-0 left-0 right-0 p-2">
                                <p className="text-white text-xs font-medium text-center truncate">
                                  {getCardName(card)}
                                </p>
                              </div>
                            </div>
                            {/* Golden badge */}
                            {card.isGolden && (
                              <div className="absolute top-1 right-1 z-10">
                                <span className="inline-flex items-center px-1 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-900 text-[8px] font-bold rounded-full">
                                  &#10024;
                                </span>
                              </div>
                            )}
                          </div>
                        </Card>
                      </Link>
                    ) : filter === "golden" ? (
                      // In golden filter, show locked cards with golden theme
                      <Card className="overflow-hidden bg-amber-950/20 border-amber-700/30">
                        <div className="aspect-[2/3] relative flex items-center justify-center bg-gradient-to-br from-amber-900/20 to-slate-900/80">
                          <div className="text-3xl text-amber-700/50">&#10024;</div>
                          <div className="absolute inset-0 opacity-5">
                            <Image
                              src={card.imageUrl}
                              alt=""
                              fill
                              className="object-cover filter grayscale"
                              sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 12vw"
                              unoptimized
                            />
                          </div>
                        </div>
                      </Card>
                    ) : (
                      <Card className="overflow-hidden bg-slate-900/80 border-slate-700/50">
                        <div className="aspect-[2/3] relative flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                          <div className="text-4xl text-slate-700">&#128274;</div>
                          {/* Silhouette effect */}
                          <div className="absolute inset-0 opacity-10">
                            <Image
                              src={card.imageUrl}
                              alt=""
                              fill
                              className="object-cover filter grayscale blur-sm"
                              sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 12vw"
                              unoptimized
                            />
                          </div>
                        </div>

                        {/* Tooltip */}
                        {showTooltip === card.id && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg whitespace-nowrap z-10 border border-slate-700">
                            {t("locked")}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                          </div>
                        )}
                      </Card>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="mt-16 text-center">
        <Card variant="highlighted" className="inline-block p-8">
          <h2 className="text-2xl font-bold text-slate-100 mb-4">
            {t("cta.title")}
          </h2>
          <p className="text-slate-400 mb-6">{t("cta.subtitle")}</p>
          <Link href="/reading/new">
            <Button size="lg">{t("cta.button")}</Button>
          </Link>
        </Card>
      </div>

      {/* Golden card styles */}
      <style jsx global>{`
        .golden-card-collection {
          animation: golden-glow-collection 2s ease-in-out infinite;
        }
        @keyframes golden-glow-collection {
          0%, 100% {
            box-shadow: 0 0 8px rgba(251, 191, 36, 0.4);
          }
          50% {
            box-shadow: 0 0 16px rgba(251, 191, 36, 0.7);
          }
        }
        .golden-shimmer-collection {
          background: linear-gradient(
            105deg,
            transparent 40%,
            rgba(251, 191, 36, 0.2) 45%,
            rgba(253, 224, 71, 0.3) 50%,
            rgba(251, 191, 36, 0.2) 55%,
            transparent 60%
          );
          background-size: 200% 100%;
          animation: golden-shimmer-sweep-collection 4s ease-in-out infinite;
        }
        @keyframes golden-shimmer-sweep-collection {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}

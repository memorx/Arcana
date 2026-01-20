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
}

interface CollectionStats {
  discovered: number;
  total: number;
  percentage: number;
}

type FilterType = "all" | "major" | "wands" | "cups" | "swords" | "pentacles";

export default function CollectionPage() {
  const t = useTranslations("collection");
  const locale = useLocale();
  const [cards, setCards] = useState<CollectionCard[]>([]);
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/collection")
      .then((res) => res.json())
      .then((data) => {
        setCards(data.cards);
        setStats(data.stats);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filters: { id: FilterType; label: string; count?: number }[] = useMemo(() => {
    const majorCount = cards.filter((c) => c.arcana === "MAJOR").length;
    const majorDiscovered = cards.filter((c) => c.arcana === "MAJOR" && c.isDiscovered).length;

    const suitCounts = (suit: string) => {
      const total = cards.filter((c) => c.suit === suit).length;
      const discovered = cards.filter((c) => c.suit === suit && c.isDiscovered).length;
      return { total, discovered };
    };

    return [
      { id: "all" as FilterType, label: t("filters.all") },
      { id: "major" as FilterType, label: `${t("majorArcana")} (${majorDiscovered}/${majorCount})` },
      { id: "wands" as FilterType, label: `${t("wands")} (${suitCounts("WANDS").discovered}/${suitCounts("WANDS").total})` },
      { id: "cups" as FilterType, label: `${t("cups")} (${suitCounts("CUPS").discovered}/${suitCounts("CUPS").total})` },
      { id: "swords" as FilterType, label: `${t("swords")} (${suitCounts("SWORDS").discovered}/${suitCounts("SWORDS").total})` },
      { id: "pentacles" as FilterType, label: `${t("pentacles")} (${suitCounts("PENTACLES").discovered}/${suitCounts("PENTACLES").total})` },
    ];
  }, [cards, t]);

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
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
          <div className="max-w-md mx-auto">
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
                ? "bg-purple-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
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
                    onMouseEnter={() => !card.isDiscovered && setShowTooltip(card.id)}
                    onMouseLeave={() => setShowTooltip(null)}
                  >
                    {card.isDiscovered ? (
                      <Link href={`/cards/${card.slug}`}>
                        <Card
                          variant="interactive"
                          className="overflow-hidden ring-2 ring-amber-500/50 hover:ring-amber-400"
                        >
                          <div className="aspect-[2/3] relative">
                            <Image
                              src={card.imageUrl}
                              alt={getCardName(card)}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 12vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity">
                              <div className="absolute bottom-0 left-0 right-0 p-2">
                                <p className="text-white text-xs font-medium text-center truncate">
                                  {getCardName(card)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Link>
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
    </div>
  );
}

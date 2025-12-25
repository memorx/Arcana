"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Card, CardContent, Button } from "@/components/ui";

interface TarotCard {
  id: string;
  name: string;
  nameEs: string;
  slug: string;
  arcana: "MAJOR" | "MINOR";
  suit: "WANDS" | "CUPS" | "SWORDS" | "PENTACLES" | null;
  number: number;
  keywords: string[];
  imageUrl: string;
}

type FilterType = "all" | "major" | "wands" | "cups" | "swords" | "pentacles";

export default function CardsPage() {
  const t = useTranslations("cards");
  const [cards, setCards] = useState<TarotCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/cards")
      .then((res) => res.json())
      .then((data) => {
        setCards(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filters: { id: FilterType; label: string }[] = [
    { id: "all", label: t("filters.all") },
    { id: "major", label: t("filters.major") },
    { id: "wands", label: t("filters.wands") },
    { id: "cups", label: t("filters.cups") },
    { id: "swords", label: t("filters.swords") },
    { id: "pentacles", label: t("filters.pentacles") },
  ];

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      // Apply filter
      if (filter === "major" && card.arcana !== "MAJOR") return false;
      if (filter === "wands" && card.suit !== "WANDS") return false;
      if (filter === "cups" && card.suit !== "CUPS") return false;
      if (filter === "swords" && card.suit !== "SWORDS") return false;
      if (filter === "pentacles" && card.suit !== "PENTACLES") return false;

      // Apply search
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          card.name.toLowerCase().includes(searchLower) ||
          card.nameEs.toLowerCase().includes(searchLower) ||
          card.keywords.some((k) => k.toLowerCase().includes(searchLower))
        );
      }

      return true;
    });
  }, [cards, filter, search]);

  return (
    <div className="container mx-auto px-4">
      {/* Header */}
      <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-400 via-amber-400 to-purple-400 bg-clip-text text-transparent">
                {t("title")}
              </span>
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              {t("subtitle")}
            </p>
          </div>

          {/* Filters */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
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

            {/* Search */}
            <div className="max-w-md mx-auto">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Results count */}
          <p className="text-center text-slate-500 mb-8">
            {t("showing", { count: filteredCards.length })}
          </p>

          {/* Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[2/3] bg-slate-800/50 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredCards.map((card) => (
                <Link
                  key={card.id}
                  href={`/cards/${card.slug}`}
                  className="group"
                >
                  <Card
                    variant="interactive"
                    className="overflow-hidden h-full"
                  >
                    <div className="aspect-[2/3] relative">
                      <Image
                        src={card.imageUrl}
                        alt={card.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-sm font-medium text-center truncate">
                          {card.nameEs}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredCards.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">&#127183;</div>
              <p className="text-slate-400">{t("noResults")}</p>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => {
                  setFilter("all");
                  setSearch("");
                }}
              >
                {t("clearFilters")}
              </Button>
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

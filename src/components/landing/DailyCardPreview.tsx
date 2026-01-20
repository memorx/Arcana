"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button, Card as UICard } from "@/components/ui";

interface Card {
  id: string;
  name: string;
  nameEs: string;
  imageUrl: string;
  meaningUpright: string;
}

interface DailyCardPreviewProps {
  title: string;
  ctaText: string;
  ctaHref?: string;
  locale: string;
}

// Simple seeded random based on date
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getTodaysSeed() {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

export function DailyCardPreview({ title, ctaText, ctaHref = "/register", locale }: DailyCardPreviewProps) {
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for today's card
    const todayKey = `dailyCard_${getTodaysSeed()}`;
    const cached = localStorage.getItem(todayKey);

    if (cached) {
      setCard(JSON.parse(cached));
      setLoading(false);
      return;
    }

    // Fetch all cards and select one based on today's date
    fetch("/api/cards")
      .then((res) => res.json())
      .then((cards: Card[]) => {
        if (cards.length === 0) {
          setLoading(false);
          return;
        }

        const seed = getTodaysSeed();
        const index = Math.floor(seededRandom(seed) * cards.length);
        const selectedCard = cards[index];

        // Cache in localStorage
        localStorage.setItem(todayKey, JSON.stringify(selectedCard));

        // Clean up old entries
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("dailyCard_") && key !== todayKey) {
            localStorage.removeItem(key);
          }
        });

        setCard(selectedCard);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <UICard className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-purple-900/30 rounded-lg mx-auto w-48" />
            <div className="h-4 bg-purple-900/30 rounded w-3/4 mx-auto" />
            <div className="h-4 bg-purple-900/30 rounded w-1/2 mx-auto" />
          </div>
        </UICard>
      </div>
    );
  }

  if (!card) return null;

  const displayName = locale === "es" ? card.nameEs : card.name;

  // Get a short excerpt of the meaning (first 2 sentences)
  const shortMeaning = card.meaningUpright
    .split(".")
    .slice(0, 2)
    .join(".") + ".";

  return (
    <div className="max-w-2xl mx-auto">
      <UICard variant="highlighted" className="p-8 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-5">
          <div className="absolute top-4 left-4 text-6xl">&#9733;</div>
          <div className="absolute bottom-4 right-4 text-6xl">&#9790;</div>
        </div>

        <div className="relative z-10">
          <h3 className="text-2xl font-bold text-center mb-6 text-amber-400">
            {title}
          </h3>

          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Card Image */}
            <div className="flex-shrink-0">
              <div className="relative w-40 h-64 rounded-lg overflow-hidden shadow-xl shadow-purple-500/20 border border-purple-500/30">
                <Image
                  src={card.imageUrl}
                  alt={displayName}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <p className="text-center mt-3 font-semibold text-purple-300">
                {displayName}
              </p>
            </div>

            {/* Card Meaning */}
            <div className="flex-1 text-center md:text-left">
              <p className="text-slate-300 leading-relaxed">
                {shortMeaning}
              </p>

              <div className="mt-6">
                <Link href={ctaHref}>
                  <Button size="lg" className="w-full md:w-auto">
                    {ctaText}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </UICard>
    </div>
  );
}

"use client";

import { TarotCardStatic } from "./TarotCard";
import { Badge } from "./badge";

interface SavedReadingCardProps {
  card: {
    id: string;
    name: string;
    nameEs: string;
    arcana: string;
    suit: string | null;
    number: number;
    imageUrl: string | null;
    meaningUpright: string;
    meaningReversed: string;
    keywords: string[];
  };
  position: {
    position: number;
    name: string;
    nameEs: string;
  };
  isReversed: boolean;
  locale: string;
  translations: {
    position: string;
    reversed: string;
    meaning: string;
  };
}

export function SavedReadingCard({
  card,
  position,
  isReversed,
  locale,
  translations,
}: SavedReadingCardProps) {
  const cardName = locale === "en" ? card.name : card.nameEs;
  const positionName = locale === "en" ? position.name : position.nameEs;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
      <div className="bg-gradient-to-r from-purple-900/30 to-amber-900/20 px-4 py-2 border-b border-slate-800">
        <p className="text-xs text-slate-400 uppercase tracking-wide">
          {translations.position}
        </p>
        <p className="text-sm font-medium text-slate-200">
          {positionName}
        </p>
      </div>
      <div className="p-4">
        <div className="flex flex-col items-center">
          <TarotCardStatic
            card={{
              name: card.name,
              nameEs: card.nameEs,
              arcana: card.arcana as "MAJOR" | "MINOR",
              suit: card.suit as "WANDS" | "CUPS" | "SWORDS" | "PENTACLES" | null,
              number: card.number,
              imageUrl: card.imageUrl,
            }}
            isReversed={isReversed}
            showReversedBadge={false}
            size="md"
            locale={locale}
            className="mb-3"
          />

          <div className="text-center">
            <h3 className="font-semibold text-slate-100">
              {cardName}
            </h3>
            {isReversed && (
              <Badge variant="warning" className="mt-1">
                {translations.reversed}
              </Badge>
            )}
          </div>

          <div className="mt-4 space-y-2 w-full">
            <p className="text-xs text-slate-500 uppercase">
              {translations.meaning}
            </p>
            <p className="text-sm text-slate-400">
              {isReversed ? card.meaningReversed : card.meaningUpright}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-1 justify-center">
            {card.keywords.slice(0, 3).map((keyword, i) => (
              <span
                key={i}
                className="text-xs bg-slate-800/50 text-slate-500 px-2 py-0.5 rounded"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

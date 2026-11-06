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
    meaningUprightEn?: string | null;
    meaningReversedEn?: string | null;
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

export function SavedReadingCard({ card, position, isReversed, locale, translations }: SavedReadingCardProps) {
  const cardName = locale === "en" ? card.name : card.nameEs;
  const positionName = locale === "en" ? position.name : position.nameEs;
  const meaning = isReversed
    ? locale === "en" && card.meaningReversedEn
      ? card.meaningReversedEn
      : card.meaningReversed
    : locale === "en" && card.meaningUprightEn
      ? card.meaningUprightEn
      : card.meaningUpright;

  return (
    <div className="overflow-hidden rounded-[10px] border border-tinta/15 bg-papel text-tinta">
      <div className="border-b border-tinta/15 px-4 py-3">
        <p className="font-dato text-[11px] uppercase tracking-[0.12em] text-grafito">{translations.position}</p>
        <p className="font-titulo text-lg leading-tight">{positionName}</p>
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
            <h3 className="font-titulo text-xl leading-tight">{cardName}</h3>
            {isReversed && (
              <Badge variant="warning" className="mt-1">
                {translations.reversed}
              </Badge>
            )}
          </div>

          <div className="mt-4 w-full space-y-2">
            <p className="font-dato text-[11px] uppercase tracking-[0.12em] text-grafito">{translations.meaning}</p>
            <p className="font-lectura text-base leading-relaxed">{meaning}</p>
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {card.keywords.slice(0, 3).map((keyword, i) => (
              <span
                key={i}
                className="rounded-full border border-tinta/20 px-2 py-0.5 font-dato text-[10px] uppercase tracking-[0.08em] text-grafito"
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

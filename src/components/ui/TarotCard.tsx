"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { CardPlaceholder, CardBack } from "./CardPlaceholder";

interface TarotCardProps {
  card: {
    name: string;
    nameEs: string;
    arcana: "MAJOR" | "MINOR";
    suit: "WANDS" | "CUPS" | "SWORDS" | "PENTACLES" | null;
    number: number;
    imageUrl?: string | null;
  };
  isReversed?: boolean;
  isRevealed?: boolean;
  showReversedBadge?: boolean;
  size?: "sm" | "md" | "lg";
  locale?: string;
  className?: string;
}

const SIZES = {
  sm: { width: 64, height: 96, className: "w-16 h-24" },
  md: { width: 80, height: 120, className: "w-20 h-[120px]" },
  lg: { width: 120, height: 180, className: "w-[120px] h-[180px]" },
};

function CardSkeleton({ className }: { className: string }) {
  return (
    <div className={`relative ${className} rounded-lg overflow-hidden border-2 border-amber-500/30 bg-slate-800`}>
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-slate-900/50 animate-pulse" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    </div>
  );
}

export function TarotCard({
  card,
  isReversed = false,
  isRevealed = true,
  showReversedBadge = true,
  size = "md",
  locale: localeProp,
  className = "",
}: TarotCardProps) {
  const t = useTranslations("reading");
  const currentLocale = useLocale();
  const locale = localeProp || currentLocale;
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const sizeConfig = SIZES[size];
  const displayName = locale === "en" ? card.name : card.nameEs;

  // Check if we should show the actual image
  const hasImage = card.imageUrl && !imageError;

  return (
    <div className={`relative ${className}`}>
      {/* Card container with flip animation */}
      <div
        className={`relative ${sizeConfig.className} transition-transform duration-500 transform-gpu`}
        style={{
          transformStyle: "preserve-3d",
          transform: isRevealed ? "rotateY(0deg)" : "rotateY(180deg)",
        }}
      >
        {/* Front of card */}
        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: "hidden",
            transform: isReversed ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          {hasImage ? (
            <div className="relative w-full h-full rounded-lg overflow-hidden border-2 border-amber-500/30">
              {isLoading && (
                <CardSkeleton className={sizeConfig.className} />
              )}
              <Image
                src={card.imageUrl!}
                alt={displayName}
                fill
                className={`object-cover transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"}`}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setImageError(true);
                  setIsLoading(false);
                }}
                unoptimized
              />
            </div>
          ) : (
            <CardPlaceholder
              cardName={displayName}
              arcana={card.arcana}
              suit={card.suit}
              number={card.number}
              className={sizeConfig.className}
            />
          )}
        </div>

        {/* Back of card */}
        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <CardBack className={sizeConfig.className} />
        </div>
      </div>

      {/* Reversed badge */}
      {isRevealed && isReversed && showReversedBadge && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-10">
          <span className="inline-block px-2 py-0.5 bg-orange-500/90 text-white text-[10px] font-medium rounded-full shadow-lg">
            {t("reversed")}
          </span>
        </div>
      )}
    </div>
  );
}

// Simple static card display (no animation)
export function TarotCardStatic({
  card,
  isReversed = false,
  showReversedBadge = true,
  size = "md",
  locale: localeProp,
  className = "",
}: Omit<TarotCardProps, "isRevealed">) {
  const t = useTranslations("reading");
  const currentLocale = useLocale();
  const locale = localeProp || currentLocale;
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const sizeConfig = SIZES[size];
  const displayName = locale === "en" ? card.name : card.nameEs;
  const hasImage = card.imageUrl && !imageError;

  return (
    <div className={`relative ${className}`}>
      <div
        className={`${sizeConfig.className}`}
        style={{
          transform: isReversed ? "rotate(180deg)" : "rotate(0deg)",
        }}
      >
        {hasImage ? (
          <div className="relative w-full h-full rounded-lg overflow-hidden border-2 border-amber-500/30">
            {isLoading && (
              <CardSkeleton className={sizeConfig.className} />
            )}
            <Image
              src={card.imageUrl!}
              alt={displayName}
              fill
              className={`object-cover transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"}`}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setImageError(true);
                setIsLoading(false);
              }}
              unoptimized
            />
          </div>
        ) : (
          <CardPlaceholder
            cardName={displayName}
            arcana={card.arcana}
            suit={card.suit}
            number={card.number}
          />
        )}
      </div>

      {/* Reversed badge */}
      {isReversed && showReversedBadge && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-10">
          <span className="inline-block px-2 py-0.5 bg-orange-500/90 text-white text-[10px] font-medium rounded-full shadow-lg">
            {t("reversed")}
          </span>
        </div>
      )}
    </div>
  );
}

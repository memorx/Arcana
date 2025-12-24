"use client";

import { useState } from "react";
import Image from "next/image";
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

export function TarotCard({
  card,
  isReversed = false,
  isRevealed = true,
  showReversedBadge = true,
  size = "md",
  locale = "es",
  className = "",
}: TarotCardProps) {
  const [imageError, setImageError] = useState(false);
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
              <Image
                src={card.imageUrl!}
                alt={displayName}
                fill
                className="object-cover"
                onError={() => setImageError(true)}
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
            {locale === "en" ? "Reversed" : "Invertida"}
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
  locale = "es",
  className = "",
}: Omit<TarotCardProps, "isRevealed">) {
  const [imageError, setImageError] = useState(false);
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
            <Image
              src={card.imageUrl!}
              alt={displayName}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
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
            {locale === "en" ? "Reversed" : "Invertida"}
          </span>
        </div>
      )}
    </div>
  );
}

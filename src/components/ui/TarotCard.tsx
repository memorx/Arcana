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
  isGolden?: boolean;
  showReversedBadge?: boolean;
  showGoldenBadge?: boolean;
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
  isGolden = false,
  showReversedBadge = true,
  showGoldenBadge = true,
  size = "md",
  locale: localeProp,
  className = "",
}: TarotCardProps) {
  const t = useTranslations("reading");
  const tGolden = useTranslations("goldenCards");
  const currentLocale = useLocale();
  const locale = localeProp || currentLocale;
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const sizeConfig = SIZES[size];
  const displayName = locale === "en" ? card.name : card.nameEs;

  // Check if we should show the actual image
  const hasImage = card.imageUrl && !imageError;

  // Golden card styling
  const goldenBorderClass = isGolden
    ? "border-2 border-transparent golden-card-border"
    : "border-2 border-amber-500/30";

  const goldenGlowClass = isGolden ? "golden-card-glow" : "";

  return (
    <div className={`relative ${className}`}>
      {/* Card container with flip animation */}
      <div
        className={`relative ${sizeConfig.className} transition-transform duration-500 transform-gpu ${goldenGlowClass}`}
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
            <div className={`relative w-full h-full rounded-lg overflow-hidden ${goldenBorderClass}`}>
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
              {/* Golden shimmer overlay */}
              {isGolden && !isLoading && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
                  <div className="absolute inset-0 golden-shimmer-effect" />
                </div>
              )}
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

      {/* Golden badge */}
      {isRevealed && isGolden && showGoldenBadge && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-900 text-[10px] font-bold rounded-full shadow-lg">
            <span>&#10024;</span>
            {tGolden("golden")}
          </span>
        </div>
      )}

      {/* Reversed badge */}
      {isRevealed && isReversed && showReversedBadge && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-10">
          <span className="inline-block px-2 py-0.5 bg-orange-500/90 text-white text-[10px] font-medium rounded-full shadow-lg">
            {t("reversed")}
          </span>
        </div>
      )}

      {/* Golden card CSS */}
      {isGolden && (
        <style jsx global>{`
          .golden-card-border {
            background: linear-gradient(135deg, #fbbf24, #fde047, #fbbf24);
            -webkit-mask:
              linear-gradient(#fff 0 0) content-box,
              linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            padding: 2px;
          }
          .golden-card-glow {
            animation: golden-card-pulse 2s ease-in-out infinite;
          }
          @keyframes golden-card-pulse {
            0%, 100% {
              filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.6));
            }
            50% {
              filter: drop-shadow(0 0 16px rgba(251, 191, 36, 0.9));
            }
          }
          .golden-shimmer-effect {
            background: linear-gradient(
              105deg,
              transparent 40%,
              rgba(251, 191, 36, 0.3) 45%,
              rgba(253, 224, 71, 0.4) 50%,
              rgba(251, 191, 36, 0.3) 55%,
              transparent 60%
            );
            background-size: 200% 100%;
            animation: golden-shimmer-sweep 3s ease-in-out infinite;
          }
          @keyframes golden-shimmer-sweep {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }
        `}</style>
      )}
    </div>
  );
}

// Simple static card display (no animation)
export function TarotCardStatic({
  card,
  isReversed = false,
  isGolden = false,
  showReversedBadge = true,
  showGoldenBadge = true,
  size = "md",
  locale: localeProp,
  className = "",
}: Omit<TarotCardProps, "isRevealed">) {
  const t = useTranslations("reading");
  const tGolden = useTranslations("goldenCards");
  const currentLocale = useLocale();
  const locale = localeProp || currentLocale;
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const sizeConfig = SIZES[size];
  const displayName = locale === "en" ? card.name : card.nameEs;
  const hasImage = card.imageUrl && !imageError;

  // Golden card styling
  const goldenBorderClass = isGolden
    ? "border-2 border-transparent golden-card-border"
    : "border-2 border-amber-500/30";

  const goldenGlowClass = isGolden ? "golden-card-glow" : "";

  return (
    <div className={`relative ${className}`}>
      <div
        className={`${sizeConfig.className} ${goldenGlowClass}`}
        style={{
          transform: isReversed ? "rotate(180deg)" : "rotate(0deg)",
        }}
      >
        {hasImage ? (
          <div className={`relative w-full h-full rounded-lg overflow-hidden ${goldenBorderClass}`}>
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
            {/* Golden shimmer overlay */}
            {isGolden && !isLoading && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
                <div className="absolute inset-0 golden-shimmer-effect" />
              </div>
            )}
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

      {/* Golden badge */}
      {isGolden && showGoldenBadge && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-900 text-[10px] font-bold rounded-full shadow-lg">
            <span>&#10024;</span>
            {tGolden("golden")}
          </span>
        </div>
      )}

      {/* Reversed badge */}
      {isReversed && showReversedBadge && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-10">
          <span className="inline-block px-2 py-0.5 bg-orange-500/90 text-white text-[10px] font-medium rounded-full shadow-lg">
            {t("reversed")}
          </span>
        </div>
      )}

      {/* Golden card CSS */}
      {isGolden && (
        <style jsx global>{`
          .golden-card-border {
            background: linear-gradient(135deg, #fbbf24, #fde047, #fbbf24);
            -webkit-mask:
              linear-gradient(#fff 0 0) content-box,
              linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            padding: 2px;
          }
          .golden-card-glow {
            animation: golden-card-pulse 2s ease-in-out infinite;
          }
          @keyframes golden-card-pulse {
            0%, 100% {
              filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.6));
            }
            50% {
              filter: drop-shadow(0 0 16px rgba(251, 191, 36, 0.9));
            }
          }
          .golden-shimmer-effect {
            background: linear-gradient(
              105deg,
              transparent 40%,
              rgba(251, 191, 36, 0.3) 45%,
              rgba(253, 224, 71, 0.4) 50%,
              rgba(251, 191, 36, 0.3) 55%,
              transparent 60%
            );
            background-size: 200% 100%;
            animation: golden-shimmer-sweep 3s ease-in-out infinite;
          }
          @keyframes golden-shimmer-sweep {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }
        `}</style>
      )}
    </div>
  );
}

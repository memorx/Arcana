"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { cartaImagen, slugCarta } from "@/lib/cartas";
import { CardPlaceholder, CardBack } from "./CardPlaceholder";
import "@/components/tinta/tinta.css"; // carta dorada: golden-card-border / golden-card-glow / golden-shimmer-effect

interface TarotCardProps {
  card: {
    name: string;
    nameEs: string;
    arcana: "MAJOR" | "MINOR";
    suit: "WANDS" | "CUPS" | "SWORDS" | "PENTACLES" | null;
    number: number;
    /** Ya no se usa: la imagen sale de `cartaImagen(card)` (cartas autohospedadas). Se conserva por compatibilidad. */
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

// Mismos anchos de siempre; el alto sigue la proporción de los grabados (≈ 7:12) para no cortarles el título.
const SIZES = {
  sm: { sizes: "64px", className: "w-16 h-[110px]" },
  md: { sizes: "80px", className: "w-20 h-[137px]" },
  lg: { sizes: "120px", className: "w-[120px] h-[206px]" },
};

const MARCO = "relative w-full h-full overflow-hidden rounded-[6px] bg-papel-hondo";

function CardSkeleton() {
  return <div className="absolute inset-0 bg-papel-hondo motion-safe:animate-pulse" aria-hidden="true" />;
}

function GoldenBadge({ label }: { label: string }) {
  return (
    <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-tinta px-2 py-0.5 font-dato text-[10px] uppercase tracking-[0.12em] text-rosa-luz">
        <span className="h-1.5 w-1.5 rounded-full bg-rosa" aria-hidden="true" />
        {label}
      </span>
    </div>
  );
}

function ReversedBadge({ label }: { label: string }) {
  return (
    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-10">
      <span className="inline-block whitespace-nowrap rounded-full border border-tinta/25 bg-papel px-2 py-0.5 font-dato text-[10px] uppercase tracking-[0.12em] text-tinta">
        {label}
      </span>
    </div>
  );
}

/** La cara de la carta: el grabado a color autohospedado, o el marcador si no es una de las 78 o no carga. */
function CardFace({
  card,
  displayName,
  isGolden,
  sizes,
  className,
}: {
  card: TarotCardProps["card"];
  displayName: string;
  isGolden: boolean;
  sizes: string;
  className: string;
}) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hasImage = slugCarta(card.name) !== "" && !imageError;

  if (!hasImage) {
    return (
      <CardPlaceholder
        cardName={displayName}
        arcana={card.arcana}
        suit={card.suit}
        number={card.number}
        className={className}
      />
    );
  }
  return (
    <div className={`${MARCO} ${isGolden ? "border-2 golden-card-border" : "border border-tinta/20"}`}>
      {isLoading && <CardSkeleton />}
      <Image
        src={cartaImagen(card)}
        alt={displayName}
        fill
        sizes={sizes}
        className={`object-cover transition-opacity duration-300 motion-reduce:transition-none ${isLoading ? "opacity-0" : "opacity-100"}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setImageError(true);
          setIsLoading(false);
        }}
        unoptimized
      />
      {isGolden && !isLoading && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
          <div className="absolute inset-0 golden-shimmer-effect" />
        </div>
      )}
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
  const sizeConfig = SIZES[size];
  const displayName = locale === "en" ? card.name : card.nameEs;

  return (
    <div className={`relative ${className}`}>
      {/* Volteo: la cara y el reverso de tinta, con la cara invertida girada 180° */}
      <div
        className={`relative ${sizeConfig.className} rounded-[6px] transition-transform duration-500 motion-reduce:transition-none transform-gpu ${isGolden ? "golden-card-glow" : ""}`}
        style={{
          transformStyle: "preserve-3d",
          transform: isRevealed ? "rotateY(0deg)" : "rotateY(180deg)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: "hidden",
            transform: isReversed ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <CardFace
            key={card.name}
            card={card}
            displayName={displayName}
            isGolden={isGolden}
            sizes={sizeConfig.sizes}
            className={sizeConfig.className}
          />
        </div>

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

      {isRevealed && isGolden && showGoldenBadge && <GoldenBadge label={tGolden("golden")} />}
      {isRevealed && isReversed && showReversedBadge && <ReversedBadge label={t("reversed")} />}
    </div>
  );
}

// Carta quieta (sin volteo)
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
  const sizeConfig = SIZES[size];
  const displayName = locale === "en" ? card.name : card.nameEs;

  return (
    <div className={`relative ${className}`}>
      <div
        className={`${sizeConfig.className} rounded-[6px] ${isGolden ? "golden-card-glow" : ""}`}
        style={{
          transform: isReversed ? "rotate(180deg)" : "rotate(0deg)",
        }}
      >
        <CardFace
          key={card.name}
          card={card}
          displayName={displayName}
          isGolden={isGolden}
          sizes={sizeConfig.sizes}
          className={sizeConfig.className}
        />
      </div>

      {isGolden && showGoldenBadge && <GoldenBadge label={tGolden("golden")} />}
      {isReversed && showReversedBadge && <ReversedBadge label={t("reversed")} />}
    </div>
  );
}

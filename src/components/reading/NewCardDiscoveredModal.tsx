"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Modal, ModalBody, Button } from "@/components/ui";
import { CardPlaceholder } from "@/components/ui/CardPlaceholder";

interface DiscoveredCard {
  id: string;
  name: string;
  nameEs: string;
  imageUrl: string;
  arcana: string;
  suit: string | null;
}

interface NewCardDiscoveredModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: DiscoveredCard[];
}

export function NewCardDiscoveredModal({
  isOpen,
  onClose,
  cards,
}: NewCardDiscoveredModalProps) {
  const t = useTranslations("collection");
  const locale = useLocale();
  const [showShimmer, setShowShimmer] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      setShowShimmer(true);
      setImageErrors({});
      const timer = setTimeout(() => setShowShimmer(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleImageError = (cardId: string) => {
    setImageErrors(prev => ({ ...prev, [cardId]: true }));
  };

  if (cards.length === 0) return null;

  const getCardName = (card: DiscoveredCard) => {
    return locale === "en" ? card.name : card.nameEs;
  };

  const isSingle = cards.length === 1;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="overflow-visible">
      <ModalBody className="text-center py-8 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-2 rounded-full hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-200"
          aria-label="Close"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6">
          <span className="text-5xl mb-4 block">&#10024;</span>
          <h2 className="text-2xl font-bold text-slate-100">
            {isSingle ? t("newCard") : t("newCards", { count: cards.length })}
          </h2>
        </div>

        {/* Cards Display */}
        <div className={`flex justify-center gap-4 mb-6 ${cards.length > 3 ? "flex-wrap" : ""}`}>
          {cards.map((card, index) => (
            <div
              key={card.id}
              className="relative"
              style={{
                animationDelay: `${index * 0.15}s`,
              }}
            >
              {/* Card Container with Shimmer */}
              <div
                className={`relative w-24 h-36 rounded-lg overflow-hidden ring-2 ring-amber-500 shadow-lg shadow-amber-500/30 ${
                  showShimmer ? "animate-pulse" : ""
                }`}
              >
                {imageErrors[card.id] ? (
                  <CardPlaceholder
                    cardName={getCardName(card)}
                    arcana={card.arcana as "MAJOR" | "MINOR"}
                    suit={card.suit as "WANDS" | "CUPS" | "SWORDS" | "PENTACLES" | null}
                    number={0}
                    className="w-24 h-36"
                  />
                ) : (
                  <Image
                    src={card.imageUrl}
                    alt={getCardName(card)}
                    fill
                    className="object-cover"
                    sizes="96px"
                    onError={() => handleImageError(card.id)}
                    unoptimized
                  />
                )}

                {/* Shimmer overlay */}
                {showShimmer && !imageErrors[card.id] && (
                  <div className="absolute inset-0 overflow-hidden">
                    <div
                      className="absolute inset-0 -translate-x-full animate-shimmer"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                        animationDelay: `${index * 0.15}s`,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Card Name */}
              <p className="mt-2 text-sm text-slate-300 font-medium max-w-24 truncate text-center">
                {getCardName(card)}
              </p>
            </div>
          ))}
        </div>

        {/* Encouragement */}
        <p className="text-slate-400 text-sm mb-6">
          {t("addedToCollection")}
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Button onClick={onClose} size="lg">
            {t("continue")}
          </Button>
        </div>
      </ModalBody>

      <style jsx global>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </Modal>
  );
}

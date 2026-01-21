"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Modal, ModalBody, Button } from "@/components/ui";
import { CardPlaceholder } from "@/components/ui/CardPlaceholder";
import { GOLDEN_CARD_CREDITS_REWARD } from "@/lib/golden-cards";

interface GoldenCard {
  id: string;
  name: string;
  nameEs: string;
  imageUrl: string;
  arcana: string;
  suit: string | null;
  isNew: boolean;
  creditsAwarded: number;
}

interface GoldenCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: GoldenCard[];
}

export function GoldenCardModal({
  isOpen,
  onClose,
  cards,
}: GoldenCardModalProps) {
  const t = useTranslations("goldenCards");
  const locale = useLocale();
  const [showParticles, setShowParticles] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      setShowParticles(true);
      setImageErrors({});
      const timer = setTimeout(() => setShowParticles(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleImageError = (cardId: string) => {
    setImageErrors(prev => ({ ...prev, [cardId]: true }));
  };

  if (cards.length === 0) return null;

  const getCardName = (card: GoldenCard) => {
    return locale === "en" ? card.name : card.nameEs;
  };

  const totalCredits = cards.length * GOLDEN_CARD_CREDITS_REWARD;
  const isSingle = cards.length === 1;
  const hasNewCard = cards.some(c => c.isNew);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="overflow-visible">
      <ModalBody className="text-center py-8 relative">
        {/* Golden particles effect */}
        {showParticles && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-golden-particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              >
                <span className="text-2xl opacity-80">&#10022;</span>
              </div>
            ))}
          </div>
        )}

        {/* Header */}
        <div className="mb-6 relative z-10">
          <div className={`text-6xl mb-4 ${showParticles ? "animate-pulse" : ""}`}>
            &#10024;
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent animate-shimmer-text">
            {isSingle ? t("title") : t("titleMultiple", { count: cards.length })}
          </h2>
          <p className="text-amber-200/80 mt-2">
            {t("subtitle")}
          </p>
        </div>

        {/* Cards Display */}
        <div className={`flex justify-center gap-4 mb-6 ${cards.length > 3 ? "flex-wrap" : ""}`}>
          {cards.map((card, index) => (
            <div
              key={card.id}
              className="relative flex flex-col items-center"
              style={{
                animationDelay: `${index * 0.15}s`,
              }}
            >
              {/* Golden Card Container */}
              <div
                className={`relative w-28 h-40 rounded-lg overflow-hidden ${
                  showParticles ? "animate-golden-glow" : ""
                }`}
              >
                {/* Golden border */}
                <div className="absolute inset-0 rounded-lg border-4 border-transparent bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 z-10 pointer-events-none golden-border-gradient" />

                {/* Inner glow */}
                <div className="absolute inset-0 rounded-lg shadow-[inset_0_0_20px_rgba(251,191,36,0.5)] z-10 pointer-events-none" />

                {imageErrors[card.id] ? (
                  <CardPlaceholder
                    cardName={getCardName(card)}
                    arcana={card.arcana as "MAJOR" | "MINOR"}
                    suit={card.suit as "WANDS" | "CUPS" | "SWORDS" | "PENTACLES" | null}
                    number={0}
                    className="w-28 h-40"
                  />
                ) : (
                  <Image
                    src={card.imageUrl}
                    alt={getCardName(card)}
                    fill
                    className="object-cover"
                    sizes="112px"
                    onError={() => handleImageError(card.id)}
                    unoptimized
                  />
                )}

                {/* Shimmer overlay */}
                {showParticles && !imageErrors[card.id] && (
                  <div className="absolute inset-0 overflow-hidden z-20">
                    <div
                      className="absolute inset-0 -translate-x-full animate-golden-shimmer"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent, rgba(251,191,36,0.5), transparent)",
                        animationDelay: `${index * 0.15}s`,
                      }}
                    />
                  </div>
                )}

                {/* NEW badge */}
                {card.isNew && (
                  <div className="absolute top-1 right-1 z-20">
                    <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-[9px] font-bold rounded-full uppercase">
                      {t("new")}
                    </span>
                  </div>
                )}
              </div>

              {/* Card Name */}
              <p className="mt-2 text-sm text-amber-300 font-medium max-w-28 text-center leading-tight">
                {getCardName(card)}
              </p>
            </div>
          ))}
        </div>

        {/* Credits Reward */}
        <div className="bg-gradient-to-r from-amber-900/40 via-yellow-900/40 to-amber-900/40 rounded-xl p-5 mb-6 border border-amber-500/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent animate-shimmer-bg" />
          <p className="text-amber-200/80 text-sm mb-2 relative z-10">
            {t("creditsEarned")}
          </p>
          <p className="text-4xl font-bold text-amber-300 relative z-10">
            +{totalCredits} <span className="text-lg text-amber-400">{t("credits")}</span>
          </p>
        </div>

        {/* Collection info */}
        {hasNewCard && (
          <p className="text-slate-400 text-sm mb-4">
            {t("addedToCollection")}
          </p>
        )}

        {/* Continue Button */}
        <Button
          onClick={onClose}
          size="lg"
          className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-semibold"
        >
          {t("continue")}
        </Button>
      </ModalBody>

      <style jsx global>{`
        @keyframes golden-particle {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) scale(0);
            opacity: 0;
          }
        }
        .animate-golden-particle {
          animation: golden-particle 3s ease-out infinite;
          color: #fbbf24;
        }
        @keyframes golden-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(251, 191, 36, 0.5), 0 0 40px rgba(251, 191, 36, 0.3);
          }
          50% {
            box-shadow: 0 0 30px rgba(251, 191, 36, 0.7), 0 0 60px rgba(251, 191, 36, 0.5);
          }
        }
        .animate-golden-glow {
          animation: golden-glow 1.5s ease-in-out infinite;
        }
        @keyframes golden-shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
        .animate-golden-shimmer {
          animation: golden-shimmer 1.5s ease-in-out infinite;
        }
        @keyframes shimmer-text {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-shimmer-text {
          background-size: 200% 200%;
          animation: shimmer-text 3s ease-in-out infinite;
        }
        @keyframes shimmer-bg {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer-bg {
          animation: shimmer-bg 2s ease-in-out infinite;
        }
        .golden-border-gradient {
          background: linear-gradient(135deg, #fbbf24, #fde047, #fbbf24);
          -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          padding: 3px;
        }
      `}</style>
    </Modal>
  );
}

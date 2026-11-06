"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Modal, ModalBody, Button, Badge } from "@/components/ui";
import { CardPlaceholder } from "@/components/ui/CardPlaceholder";
import { Pincel } from "@/components/tinta/Pincel";
import { ESTAMPA } from "@/components/achievements/Celebracion";
import { GOLDEN_CARD_CREDITS_REWARD } from "@/lib/golden-cards";
import { cartaImagen, MEDIDAS_CARTA } from "@/lib/cartas";
import { cn } from "@/lib/utils";

interface GoldenCard {
  id: string;
  name: string;
  nameEs: string;
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

/**
 * Carta dorada, sobre tinta: la carta a color con la brasa rosa persistente (`golden-card-*` de tinta.css, quieta
 * con reduced-motion), la palabra a pincel y los créditos en mono. Nada de oro ni partículas.
 */
export function GoldenCardModal({
  isOpen,
  onClose,
  cards,
}: GoldenCardModalProps) {
  const t = useTranslations("goldenCards");
  const locale = useLocale();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      setImageErrors({});
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
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <ModalBody className="grid gap-6 px-[clamp(20px,6vw,36px)] pb-8 pt-9 text-center">
        <div className="grid justify-items-center gap-2">
          <Pincel aria-hidden="true" className={cn("text-[clamp(3.4rem,2.6rem+4vw,4.75rem)]", ESTAMPA)}>
            {t("golden")}
          </Pincel>
          <h2 className="text-[clamp(1.6rem,1.3rem+1.4vw,2.1rem)] leading-[1.1] text-letra">
            {isSingle ? t("title") : t("titleMultiple", { count: cards.length })}
          </h2>
          <p className="font-lectura text-[1.0625rem] italic text-letra-suave">{t("subtitle")}</p>
        </div>

        {/* Las cartas: lo único a color, con su brasa */}
        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-6">
          {cards.map((card) => (
            <li key={card.id} className="grid w-28 justify-items-center gap-2.5" data-carta="dorada">
              <div className="golden-card-glow relative w-full rounded-[8px]">
                <div className="golden-card-border relative overflow-hidden rounded-[8px] border-2">
                  {imageErrors[card.id] ? (
                    <CardPlaceholder
                      cardName={getCardName(card)}
                      arcana={card.arcana as "MAJOR" | "MINOR"}
                      suit={card.suit as "WANDS" | "CUPS" | "SWORDS" | "PENTACLES" | null}
                      number={0}
                      className="w-full"
                    />
                  ) : (
                    <Image
                      src={cartaImagen(card)}
                      alt={getCardName(card)}
                      width={MEDIDAS_CARTA.color.width}
                      height={MEDIDAS_CARTA.color.height}
                      className="h-auto w-full"
                      onError={() => handleImageError(card.id)}
                      unoptimized
                    />
                  )}
                  {!imageErrors[card.id] && (
                    <span aria-hidden="true" className="golden-shimmer-effect pointer-events-none absolute inset-0" />
                  )}
                </div>
                {card.isNew && (
                  <Badge variant="warning" className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    {t("new")}
                  </Badge>
                )}
              </div>
              <p className="font-titulo text-[0.9375rem] leading-[1.15] text-balance text-letra">
                {getCardName(card)}
              </p>
            </li>
          ))}
        </ul>

        {/* Créditos ganados */}
        <div className="grid gap-1 border-y border-filete/20 py-4">
          <p className="font-dato text-[0.6875rem] leading-[1.5] tracking-[0.12em] text-letra-suave uppercase">
            {t("creditsEarned")}
          </p>
          <p className="flex flex-wrap items-baseline justify-center gap-x-2.5 font-dato text-[2.5rem] leading-none tracking-[-0.03em] text-letra-acento tabular-nums">
            <span>+{totalCredits}</span>
            <span className="text-sm tracking-[0.12em] text-letra-suave uppercase">{t("credits")}</span>
          </p>
        </div>

        {/* Collection info */}
        {hasNewCard && (
          <p className="text-[0.9375rem] leading-[1.5] text-letra-suave">
            {t("addedToCollection")}
          </p>
        )}

        <Button onClick={onClose} size="lg" className="w-full">
          {t("continue")}
        </Button>
      </ModalBody>
    </Modal>
  );
}

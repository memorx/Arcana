"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Modal, ModalBody, Button, Badge } from "@/components/ui";
import { CardPlaceholder } from "@/components/ui/CardPlaceholder";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { cartaImagen, CARTA_REVERSO, MEDIDAS_CARTA } from "@/lib/cartas";
import { cn } from "@/lib/utils";

interface DiscoveredCard {
  id: string;
  name: string;
  nameEs: string;
  arcana: string;
  suit: string | null;
  keywords: string[];
  meaningUpright: string;
  meaningReversed: string;
  meaningUprightEn: string | null;
  meaningReversedEn: string | null;
  isReversed: boolean;
}

interface NewCardDiscoveredModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: DiscoveredCard[];
}

/**
 * Cartas nuevas para la colección, sobre tinta (el modal de «Dos tintas»): la carta a color, su nombre en Gloock,
 * las palabras clave en mono y el significado. Tercer modal de la cadena del revelado.
 */
export function NewCardDiscoveredModal({
  isOpen,
  onClose,
  cards,
}: NewCardDiscoveredModalProps) {
  const t = useTranslations("collection");
  const tReading = useTranslations("reading");
  const locale = useLocale();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) setImageErrors({});
  }, [isOpen]);

  const handleImageError = (cardId: string) => {
    setImageErrors(prev => ({ ...prev, [cardId]: true }));
  };

  if (cards.length === 0) return null;

  const getCardName = (card: DiscoveredCard) => {
    return locale === "en" ? card.name : card.nameEs;
  };

  const getCardMeaning = (card: DiscoveredCard) => {
    if (card.isReversed) {
      return locale === "en" && card.meaningReversedEn
        ? card.meaningReversedEn
        : card.meaningReversed;
    }
    return locale === "en" && card.meaningUprightEn
      ? card.meaningUprightEn
      : card.meaningUpright;
  };

  const getKeywordsDisplay = (card: DiscoveredCard) => {
    return card.keywords.slice(0, 3).join(" · ");
  };

  const isSingle = cards.length === 1;

  /** La carta a color; si no es una de las 78 o la imagen falla, el marcador de F1-B. */
  const cardImage = (card: DiscoveredCard, ancho: string) => {
    const src = cartaImagen(card);
    if (imageErrors[card.id] || src === CARTA_REVERSO) {
      return (
        <CardPlaceholder
          cardName={getCardName(card)}
          arcana={card.arcana as "MAJOR" | "MINOR"}
          suit={card.suit as "WANDS" | "CUPS" | "SWORDS" | "PENTACLES" | null}
          number={0}
          className={cn(ancho, "aspect-[300/520] h-auto")}
        />
      );
    }
    return (
      <span className={cn("relative block aspect-[300/520] overflow-hidden rounded-[8px] shadow-[0_0_0_1px_rgb(236_234_230/0.25),0_20px_40px_-24px_rgb(0_0_0/0.9)]", ancho)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- WebP autohospedada y ya optimizada (scripts/cartas.py) */}
        <img
          src={src}
          alt={getCardName(card)}
          width={MEDIDAS_CARTA.color.width}
          height={MEDIDAS_CARTA.color.height}
          decoding="async"
          onError={() => handleImageError(card.id)}
          className={cn("absolute inset-0 h-full w-full object-cover", card.isReversed && "rotate-180")}
        />
      </span>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBody className="relative grid justify-items-center gap-6 py-8 text-center">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-full text-letra-suave transition-colors hover:bg-papel/10 hover:text-letra"
          aria-label={tReading("close")}
        >
          <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="grid justify-items-center gap-3 px-8">
          <Etiqueta>{t("title")}</Etiqueta>
          <h2 className="font-titulo text-[clamp(1.6rem,1.3rem+1vw,2.1rem)] leading-[1.1] text-letra">
            {isSingle ? t("newCard") : t("newCards", { count: cards.length })}
          </h2>
        </div>

        {/* Cards Display */}
        {isSingle ? (
          /* Single card - larger display with description */
          <div className="grid justify-items-center gap-3 motion-safe:animate-entra">
            {cardImage(cards[0], "w-36")}

            {/* Card Name with Reversed Badge */}
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <p className="font-titulo text-xl leading-tight text-letra">{getCardName(cards[0])}</p>
              {cards[0].isReversed && <Badge variant="warning">{tReading("reversed")}</Badge>}
            </div>

            {/* Keywords */}
            <p className="font-dato text-[0.6875rem] tracking-[0.1em] text-letra-acento uppercase">
              {getKeywordsDisplay(cards[0])}
            </p>

            {/* Card Meaning */}
            <p className="max-w-sm font-lectura text-[0.9375rem] leading-relaxed text-letra-suave">
              {getCardMeaning(cards[0])}
            </p>
          </div>
        ) : (
          /* Multiple cards - compact display */
          <ul className="flex flex-wrap justify-center gap-4">
            {cards.map((card, index) => (
              <li
                key={card.id}
                className="flex w-24 flex-col items-center gap-1.5 motion-safe:animate-entra"
                style={{ animationDelay: `${index * 0.12}s` }}
              >
                {cardImage(card, "w-24")}
                <p className="mt-1 font-titulo text-[0.9375rem] leading-tight text-letra">{getCardName(card)}</p>
                {card.isReversed && (
                  <span className="font-dato text-[0.5625rem] tracking-[0.1em] text-letra-acento uppercase">
                    {tReading("reversed")}
                  </span>
                )}
                <p className="w-full truncate font-dato text-[0.5625rem] tracking-[0.08em] text-letra-suave uppercase">
                  {card.keywords[0]}
                </p>
              </li>
            ))}
          </ul>
        )}

        {/* Encouragement */}
        <p className="font-dato text-xs tracking-[0.06em] text-letra-suave">
          {t("addedToCollection")}
        </p>

        {/* Actions */}
        <Button onClick={onClose} size="lg">
          {t("continue")}
        </Button>
      </ModalBody>
    </Modal>
  );
}

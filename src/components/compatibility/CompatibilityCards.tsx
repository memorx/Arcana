import Image from "next/image";
import { useTranslations } from "next-intl";
import { cartaImagen, MEDIDAS_CARTA } from "@/lib/cartas";
import type { CompatibilityCard } from "@/lib/compatibility";

interface CompatibilityCardsProps {
  cards: CompatibilityCard[];
  /** Shown instead of "The other person" when the reading has a name. */
  partnerName: string | null;
  locale: string;
}

/**
 * The three cards: You / The other person / The bond. They are revealed
 * cards, so they are the one thing in full color (the self-hosted engraving,
 * turned when it came out reversed); role in mono, name in Gloock.
 */
export function CompatibilityCards({ cards, partnerName, locale }: CompatibilityCardsProps) {
  const t = useTranslations("compatibility");
  const tCarta = useTranslations("carta");

  return (
    <ul className="grid grid-cols-3 gap-2 sm:gap-6 lg:gap-10">
      {cards.map((card) => {
        const role = card.role === "partner" && partnerName ? partnerName : t(`roles.${card.role}`);
        const name = locale === "en" ? card.name : card.nameEs;

        return (
          <li key={card.position} data-rol={card.role} className="flex min-w-0 flex-col items-center gap-3 text-center">
            <span className="line-clamp-2 max-w-full font-dato text-[0.625rem] leading-[1.4] tracking-[0.1em] break-words text-letra-acento uppercase sm:text-[0.6875rem] sm:tracking-[0.12em]">
              {role}
            </span>
            <div className="w-full max-w-[220px] overflow-hidden rounded-[8px] border border-filete/20 bg-papel-hondo">
              <Image
                src={cartaImagen(card)}
                alt={name}
                width={MEDIDAS_CARTA.color.width}
                height={MEDIDAS_CARTA.color.height}
                sizes="(min-width: 1024px) 220px, (min-width: 640px) 28vw, 30vw"
                unoptimized
                className={`h-auto w-full ${card.isReversed ? "rotate-180" : ""}`}
              />
            </div>
            <span className="font-titulo text-[clamp(0.95rem,0.8rem+0.7vw,1.35rem)] leading-[1.15] break-words">
              {name}
            </span>
            {card.isReversed && (
              <span className="-mt-1.5 font-dato text-[0.5625rem] leading-[1.4] tracking-[0.1em] text-letra-suave uppercase sm:text-[0.625rem]">
                {tCarta("invertida")}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

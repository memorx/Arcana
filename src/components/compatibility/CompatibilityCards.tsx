import { useTranslations } from "next-intl";
import { TarotCardStatic } from "@/components/ui";
import type { CompatibilityCard } from "@/lib/compatibility";

interface CompatibilityCardsProps {
  cards: CompatibilityCard[];
  /** Shown instead of "The other person" when the reading has a name. */
  partnerName: string | null;
  locale: string;
}

/** The three cards: You / The other person / The bond. */
export function CompatibilityCards({ cards, partnerName, locale }: CompatibilityCardsProps) {
  const t = useTranslations("compatibility");

  return (
    <ul className="grid grid-cols-3 gap-2 sm:gap-6">
      {cards.map((card) => {
        const role = card.role === "partner" && partnerName ? partnerName : t(`roles.${card.role}`);
        const name = locale === "en" ? card.name : card.nameEs;
        const tarotCard = {
          name: card.name,
          nameEs: card.nameEs,
          arcana: card.arcana,
          suit: card.suit,
          number: card.number,
          imageUrl: card.imageUrl,
        };

        return (
          <li key={card.position} className="flex min-w-0 flex-col items-center text-center">
            <span className="mb-3 max-w-full line-clamp-2 break-words text-xs font-semibold uppercase tracking-wider text-amber-400">
              {role}
            </span>
            {/* Same image URL in both sizes, so it is only downloaded once */}
            <div className="sm:hidden">
              <TarotCardStatic card={tarotCard} isReversed={card.isReversed} size="md" locale={locale} />
            </div>
            <div className="hidden sm:block">
              <TarotCardStatic card={tarotCard} isReversed={card.isReversed} size="lg" locale={locale} />
            </div>
            <span className="mt-3 text-sm font-medium text-slate-200 break-words">{name}</span>
          </li>
        );
      })}
    </ul>
  );
}

import { getLocale, getTranslations } from "next-intl/server";
import { TarotCardStatic } from "@/components/ui";
import type { InsightsCard } from "@/lib/insights";

interface RecurringCardsProps {
  cards: InsightsCard[];
}

/** The cards that keep coming up: image, how many times, and how often reversed. */
export async function RecurringCards({ cards }: RecurringCardsProps) {
  const t = await getTranslations("insights.recurring");
  const locale = await getLocale();

  if (cards.length === 0) {
    return <p className="text-slate-400">{t("empty")}</p>;
  }

  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
      {cards.map((card, index) => {
        const name = locale === "en" ? card.name : card.nameEs;
        const reversedPercent = card.count > 0 ? Math.round((card.reversedCount * 100) / card.count) : 0;
        return (
          <li
            key={card.cardId}
            className={`flex flex-col items-center text-center gap-2 p-3 sm:p-4 rounded-xl border ${
              index === 0
                ? "border-amber-500/40 bg-gradient-to-b from-amber-900/20 to-slate-900/40"
                : "border-slate-800 bg-slate-900/40"
            }`}
          >
            <TarotCardStatic
              card={{
                name: card.name,
                nameEs: card.nameEs,
                arcana: card.arcana,
                suit: card.suit,
                number: card.number,
                imageUrl: card.imageUrl,
              }}
              size="md"
              showReversedBadge={false}
              locale={locale}
            />
            <p className="text-sm font-medium text-slate-100 leading-tight">{name}</p>
            <p className="text-sm font-semibold text-amber-300 tabular-nums">{t("count", { count: card.count })}</p>
            <p className="text-xs text-slate-400 tabular-nums">{t("reversed", { percent: reversedPercent })}</p>
          </li>
        );
      })}
    </ul>
  );
}

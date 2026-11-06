import { getLocale, getTranslations } from "next-intl/server";
import { cartaImagen, MEDIDAS_CARTA } from "@/lib/cartas";
import { cn } from "@/lib/utils";
import { INSIGHTS_WINDOW_DAYS, type InsightsCard } from "@/lib/insights";

interface RecurringCardsProps {
  cards: InsightsCard[];
}

/**
 * The cards that keep coming up, as engravings in ink (the archive is in two inks; only a card
 * revealed today is in full colour): how many times, and how often reversed. The first one, the
 * most frequent, carries the pink rule.
 */
export async function RecurringCards({ cards }: RecurringCardsProps) {
  const t = await getTranslations("insights.recurring");
  const locale = await getLocale();

  if (cards.length === 0) {
    return <p className="font-lectura text-letra-suave">{t("empty", { days: INSIGHTS_WINDOW_DAYS })}</p>;
  }

  return (
    <ol className="grid grid-cols-3 gap-x-3 gap-y-8 sm:gap-x-4 lg:grid-cols-6">
      {cards.map((card, index) => {
        const name = locale === "en" ? card.name : card.nameEs;
        const reversedPercent = card.count > 0 ? Math.round((card.reversedCount * 100) / card.count) : 0;
        return (
          <li
            key={card.cardId}
            className={cn("flex min-w-0 flex-col gap-2 border-t pt-3", index === 0 ? "border-t-[3px] border-rosa" : "border-filete/30")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- grabado autohospedado (scripts/cartas.py) */}
            <img
              src={cartaImagen(card, "tinta")}
              alt=""
              width={MEDIDAS_CARTA.tinta.width}
              height={MEDIDAS_CARTA.tinta.height}
              loading="lazy"
              decoding="async"
              className="h-auto w-full max-w-[150px] rounded-[4px] border border-filete/30"
            />
            <p className="font-titulo text-base leading-tight text-letra sm:text-lg">{name}</p>
            <p className="font-dato text-xs tabular-nums text-letra-acento">{t("count", { count: card.count })}</p>
            <p className="font-dato text-[0.6875rem] uppercase tracking-[0.06em] tabular-nums text-letra-suave">
              {t("reversed", { percent: reversedPercent })}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

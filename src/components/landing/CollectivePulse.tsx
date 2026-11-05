import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge, Card } from "@/components/ui";
import { getCollectivePulse, type CollectivePulse as Pulse } from "@/lib/pulse";

/**
 * "Today in Arcana, X came up the most": the most drawn card of the day,
 * anonymous. Renders nothing when there are too few readings or the pulse
 * can't be computed. Server component; wrap it in <Suspense>.
 */
export async function CollectivePulse() {
  let pulse: Pulse;
  try {
    pulse = await getCollectivePulse();
  } catch (error) {
    console.error("[pulse] Could not load the collective pulse:", error);
    return null;
  }

  if (!pulse.enough || pulse.cards.length === 0) return null;

  const t = await getTranslations("pulse");
  const locale = await getLocale();
  const cardName = (card: { name: string; nameEs: string }) =>
    locale === "en" ? card.name : card.nameEs;

  const [first, ...rest] = pulse.cards;

  return (
    <section aria-labelledby="collective-pulse-title" className="py-12 border-t border-slate-800/50">
      <div className="container mx-auto px-4">
        <Card variant="highlighted" className="max-w-3xl mx-auto p-6 sm:p-8 overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative w-28 h-44 sm:w-32 sm:h-52 shrink-0 rounded-lg overflow-hidden border border-amber-500/30 shadow-xl shadow-amber-500/10">
              <Image
                src={first.imageUrl}
                alt={cardName(first)}
                fill
                sizes="128px"
                className="object-cover"
                unoptimized
              />
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <p className="flex items-center justify-center sm:justify-start gap-2 text-xs uppercase tracking-[0.2em] text-amber-400/80">
                <span aria-hidden="true" className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                {t("kicker")}
              </p>

              <h2
                id="collective-pulse-title"
                className="text-2xl sm:text-3xl font-bold text-slate-100 mt-2 text-balance"
              >
                {t.rich("title", {
                  card: cardName(first),
                  hl: (chunks) => <span className="text-amber-300">{chunks}</span>,
                })}
              </h2>

              <p className="text-slate-400 mt-2">{t("share", { percentage: first.percent })}</p>

              {rest.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-slate-500 mb-2">{t("also")}</p>
                  <ul className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    {rest.map((card) => (
                      <li key={card.name}>
                        <Badge variant="primary">
                          {cardName(card)} · {card.percent}%
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs text-slate-500 mt-4">{t("anonymous")}</p>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

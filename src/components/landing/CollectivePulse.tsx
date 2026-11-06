import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Escena } from "@/components/tinta/Escena";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { cartaImagen, MEDIDAS_CARTA } from "@/lib/cartas";
import { getCollectivePulse, type CollectivePulse as Pulse } from "@/lib/pulse";

/**
 * "Today in Arcana, X came up the most": the most drawn card of the day,
 * anonymous. Renders nothing when there are too few readings or the pulse
 * can't be computed. Server component; wrap it in <Suspense>.
 *
 * «Dos tintas»: banda de tinta que sigue a la carta del día; la carta más sacada es lo único a color.
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
    <Escena suelo="tinta" aria-labelledby="collective-pulse-title" className="portada-pulso">
      <div className="portada-contenido">
        <div className="grid items-center gap-6 border-t border-filete/15 py-12 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-10">
          {/* eslint-disable-next-line @next/next/no-img-element -- WebP autohospedada y ya optimizada (scripts/cartas.py) */}
          <img
            src={cartaImagen(first, "color")}
            alt={cardName(first)}
            width={MEDIDAS_CARTA.color.width}
            height={MEDIDAS_CARTA.color.height}
            loading="lazy"
            decoding="async"
            className="h-auto w-24 rounded-[10px] sm:w-28"
          />

          <div className="grid min-w-0 gap-3">
            <Etiqueta>{t("kicker")}</Etiqueta>
            <h2
              id="collective-pulse-title"
              className="font-titulo text-[clamp(1.6rem,1.2rem+1.4vw,2.4rem)] leading-[1.1] text-papel"
            >
              {t.rich("title", {
                card: cardName(first),
                hl: (chunks) => <span className="text-rosa-luz">{chunks}</span>,
              })}
            </h2>

            <p className="text-niebla">{t("share", { percentage: first.percent })}</p>

            {rest.length > 0 && (
              <div className="grid gap-2">
                <p className="font-dato text-xs tracking-[0.12em] text-niebla uppercase">{t("also")}</p>
                <ul className="flex flex-wrap gap-2">
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

            <p className="text-sm text-niebla italic">{t("anonymous")}</p>
          </div>
        </div>
      </div>
    </Escena>
  );
}

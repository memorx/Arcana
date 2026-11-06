import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { getCollectionStats, getRecentlyDiscovered } from "@/lib/collection";
import { cartaImagen, MEDIDAS_CARTA } from "@/lib/cartas";
import { Barra } from "./Barra";
import { CIFRA, ENLACE_DATO, ROTULO, TITULO_CELDA } from "./estilos";

interface CollectionWidgetProps {
  userId: string;
}

export async function CollectionWidget({ userId }: CollectionWidgetProps) {
  const t = await getTranslations("collection");
  const locale = await getLocale();

  const [stats, recentCards] = await Promise.all([
    getCollectionStats(userId),
    getRecentlyDiscovered(userId, 3),
  ]);

  const getCardName = (card: { name: string; nameEs: string }) => {
    return locale === "en" ? card.name : card.nameEs;
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 className={TITULO_CELDA}>{t("title")}</h2>
        <Link href="/collection" className={ENLACE_DATO}>
          {t("viewAll")} <span aria-hidden="true">→</span>
        </Link>
      </div>

      <p className="flex flex-wrap items-baseline gap-x-3">
        <span className={CIFRA}>
          {stats.discovered}/{stats.total}
        </span>
        <span className={ROTULO}>{stats.percentage}%</span>
      </p>
      <Barra valor={stats.percentage} etiqueta={`${t("title")}: ${stats.percentage}%`} />

      {recentCards.length > 0 ? (
        <div>
          <p className={ROTULO}>{t("recentlyDiscovered")}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {recentCards.map((card) => (
              <li key={card.id}>
                <Link
                  href={`/cards/${card.id}`}
                  className="block w-14 overflow-hidden rounded-[4px] border border-filete/30 transition-colors hover:border-rosa"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- grabado autohospedado de 200 px (scripts/cartas.py) */}
                  <img
                    src={cartaImagen(card, "mesa")}
                    alt={getCardName(card)}
                    width={MEDIDAS_CARTA.mesa.width}
                    height={MEDIDAS_CARTA.mesa.height}
                    loading="lazy"
                    decoding="async"
                    className="block h-auto w-full"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="font-lectura text-[0.9375rem] text-letra-suave">{t("noCardsYet")}</p>
      )}
    </div>
  );
}

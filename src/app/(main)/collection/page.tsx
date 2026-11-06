"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Card, buttonClasses } from "@/components/ui";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { BarraProgreso } from "@/components/achievements/BarraProgreso";
import { cartaImagen, MEDIDAS_CARTA } from "@/lib/cartas";
import { cn } from "@/lib/utils";
import { numeralDeCarta } from "../cards/indice";

interface CollectionCard {
  id: string;
  name: string;
  nameEs: string;
  slug: string | null;
  arcana: string;
  suit: string | null;
  number: number;
  isDiscovered: boolean;
  isGolden: boolean;
}

interface CollectionStats {
  discovered: number;
  total: number;
  percentage: number;
}

interface GoldenStats {
  discovered: number;
  total: number;
  percentage: number;
  totalGoldenCardsFound: number;
}

type FilterType = "all" | "golden" | "major" | "wands" | "cups" | "swords" | "pentacles";

const REJILLA = "grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8";

export default function CollectionPage() {
  const t = useTranslations("collection");
  const tGolden = useTranslations("goldenCards");
  const locale = useLocale();
  const [cards, setCards] = useState<CollectionCard[]>([]);
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [goldenStats, setGoldenStats] = useState<GoldenStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    fetch("/api/collection")
      .then((res) => res.json())
      .then((data) => {
        setCards(data.cards ?? []);
        setStats(data.stats ?? null);
        setGoldenStats(data.goldenStats ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filters: { id: FilterType; label: string; count?: string; isGolden?: boolean }[] = useMemo(() => {
    const majorCount = cards.filter((c) => c.arcana === "MAJOR").length;
    const majorDiscovered = cards.filter((c) => c.arcana === "MAJOR" && c.isDiscovered).length;
    const goldenCount = cards.filter((c) => c.isGolden).length;

    const suitCounts = (suit: string) => {
      const total = cards.filter((c) => c.suit === suit).length;
      const discovered = cards.filter((c) => c.suit === suit && c.isDiscovered).length;
      return `${discovered}/${total}`;
    };

    return [
      { id: "all" as FilterType, label: t("filters.all") },
      { id: "golden" as FilterType, label: tGolden("goldenCardsShort"), count: `${goldenCount}/${cards.length}`, isGolden: true },
      { id: "major" as FilterType, label: t("majorArcana"), count: `${majorDiscovered}/${majorCount}` },
      { id: "wands" as FilterType, label: t("wands"), count: suitCounts("WANDS") },
      { id: "cups" as FilterType, label: t("cups"), count: suitCounts("CUPS") },
      { id: "swords" as FilterType, label: t("swords"), count: suitCounts("SWORDS") },
      { id: "pentacles" as FilterType, label: t("pentacles"), count: suitCounts("PENTACLES") },
    ];
  }, [cards, t, tGolden]);

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      if (filter === "golden") return card.isGolden;
      if (filter === "major") return card.arcana === "MAJOR";
      if (filter === "wands") return card.suit === "WANDS";
      if (filter === "cups") return card.suit === "CUPS";
      if (filter === "swords") return card.suit === "SWORDS";
      if (filter === "pentacles") return card.suit === "PENTACLES";
      return true;
    });
  }, [cards, filter]);

  // Group cards by section
  const groupedCards = useMemo(() => {
    if (filter === "golden") return { golden: filteredCards };
    if (filter !== "all") return { [filter]: filteredCards };

    return {
      major: cards.filter((c) => c.arcana === "MAJOR"),
      wands: cards.filter((c) => c.suit === "WANDS"),
      cups: cards.filter((c) => c.suit === "CUPS"),
      swords: cards.filter((c) => c.suit === "SWORDS"),
      pentacles: cards.filter((c) => c.suit === "PENTACLES"),
    };
  }, [cards, filter, filteredCards]);

  const getSectionTitle = (key: string) => {
    switch (key) {
      case "golden": return tGolden("goldenCardsShort");
      case "major": return t("majorArcana");
      case "wands": return t("wands");
      case "cups": return t("cups");
      case "swords": return t("swords");
      case "pentacles": return t("pentacles");
      default: return "";
    }
  };

  const getCardName = (card: CollectionCard) => {
    return locale === "en" ? card.name : card.nameEs;
  };

  return (
    <div className="grid gap-[clamp(32px,6vh,56px)]">
      {/* Encabezado: el índice y su contador */}
      <header className="grid gap-x-[clamp(24px,5vw,80px)] gap-y-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
        <div className="grid gap-3.5">
          <Etiqueta>{t("kicker")}</Etiqueta>
          <h1 className="text-[clamp(2rem,1.4rem+2vw,3.2rem)] leading-[1.05]">{t("title")}</h1>
          <p className="max-w-[46ch] text-letra-suave">{t("legend")}</p>
        </div>

        {stats && (
          <div className="grid gap-5">
            <div className="grid gap-3 border-t border-filete pt-4">
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-dato" data-contador>
                <span className="text-[clamp(2.75rem,2rem+3vw,4.25rem)] leading-none tracking-[-0.04em] tabular-nums">
                  {stats.discovered}
                </span>{" "}
                <span className="text-sm tracking-[0.12em] text-letra-suave uppercase">
                  {t("counterOf", { total: stats.total })}
                </span>
              </p>
              <BarraProgreso
                valor={stats.discovered}
                max={stats.total}
                etiqueta={t("progress", { count: stats.discovered, total: stats.total })}
                texto={`${stats.discovered} ${t("counterOf", { total: stats.total })}`}
              />
              <p className="font-dato text-[0.6875rem] leading-[1.5] tracking-[0.1em] text-letra-suave uppercase">
                {t("progress", { count: stats.discovered, total: stats.total })} · {stats.percentage}%
              </p>
            </div>

            {/* Cartas doradas: la segunda tinta */}
            {goldenStats && (
              <div className="grid gap-2">
                <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 font-dato text-[0.6875rem] leading-[1.5] tracking-[0.1em] uppercase">
                  <span className="inline-flex items-center gap-2 text-letra-acento">
                    <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-rosa" />
                    {tGolden("goldenCardsShort")}
                  </span>
                  <span className="text-letra-suave">
                    {tGolden("collectionProgress", { count: goldenStats.discovered, total: goldenStats.total })} ·{" "}
                    {goldenStats.percentage}%
                  </span>
                </p>
                <BarraProgreso
                  valor={goldenStats.discovered}
                  max={goldenStats.total}
                  etiqueta={tGolden("collectionProgress", { count: goldenStats.discovered, total: goldenStats.total })}
                  logrado
                  grosor="fina"
                />
                {goldenStats.totalGoldenCardsFound > 0 && (
                  <p className="font-dato text-[0.6875rem] leading-[1.5] tracking-[0.06em] text-letra-suave">
                    {tGolden("totalFound", { count: goldenStats.totalGoldenCardsFound })}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Filtros: botones de alternar, con su cuenta */}
      <div role="group" aria-label={t("filters.label")} className="flex flex-wrap gap-2">
        {filters.map((f) => {
          const activo = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={activo}
              onClick={() => setFilter(f.id)}
              className={cn(
                "inline-flex min-h-11 cursor-pointer flex-wrap items-center gap-x-2 gap-y-0.5 rounded-full border px-4 py-1.5 text-left font-dato text-[0.6875rem] leading-[1.3] tracking-[0.1em] uppercase transition-colors duration-200",
                activo
                  ? "border-tinta bg-tinta text-papel"
                  : "border-tinta/30 text-tinta hover:border-tinta"
              )}
            >
              {f.isGolden && <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-rosa" />}
              <span>{f.label}</span>
              {f.count && (
                <span className={cn("tabular-nums", activo ? "text-niebla" : "text-grafito")}>{f.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Cargando: esqueleto en papel hondo, quieto con reduced-motion */}
      {loading && (
        <div className={REJILLA} aria-hidden="true">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="aspect-[300/514] rounded-[6px] bg-papel-hondo motion-safe:animate-pulse" />
          ))}
        </div>
      )}

      {/* El índice, por palo */}
      {!loading && cards.length > 0 && (
        <div className="grid gap-[clamp(32px,5vh,48px)]">
          {(Object.entries(groupedCards) as [string, CollectionCard[]][]).map(([key, sectionCards]) => {
            const descubiertas = sectionCards.filter((c) => c.isDiscovered).length;
            return (
              <section key={key} aria-labelledby={`palo-${key}`} className="grid gap-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-filete pt-3">
                  <h2 id={`palo-${key}`} className="text-[clamp(1.4rem,1.1rem+1vw,1.9rem)] leading-[1.1]">
                    {getSectionTitle(key)}
                  </h2>
                  <p className="font-dato text-xs tracking-[0.12em] text-letra-suave uppercase tabular-nums">
                    {key === "golden"
                      ? sectionCards.length
                      : `${descubiertas} ${t("counterOf", { total: sectionCards.length })}`}
                  </p>
                </div>

                {sectionCards.length === 0 ? (
                  <p className="font-dato text-xs tracking-[0.08em] text-letra-suave">{tGolden("chance")}</p>
                ) : (
                  <ul className={REJILLA}>
                    {sectionCards.map((card) => (
                      <CartaDelIndice
                        key={card.id}
                        card={card}
                        nombre={getCardName(card)}
                        porDescubrir={t("undiscovered")}
                        dorada={tGolden("golden")}
                      />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* CTA */}
      <Card variant="highlighted" className="grid justify-items-start gap-4 p-[clamp(20px,4vw,40px)]">
        <h2 className="text-[clamp(1.5rem,1.2rem+1vw,2.1rem)] leading-[1.1]">{t("cta.title")}</h2>
        <p className="max-w-[52ch] text-letra-suave">{t("cta.subtitle")}</p>
        <Link href="/reading/new" className={buttonClasses({ size: "lg" })}>
          {t("cta.button")}
        </Link>
      </Card>
    </div>
  );
}

/**
 * Una carta del índice. Descubierta: el grabado a color, con su número y su nombre, enlazado a su ficha.
 * Por descubrir: el grabado en tinta tenue, sin enlace. La dorada es la única con brasa rosa persistente.
 */
function CartaDelIndice({
  card,
  nombre,
  porDescubrir,
  dorada,
}: {
  card: CollectionCard;
  nombre: string;
  porDescubrir: string;
  dorada: string;
}) {
  // Las cortes no llevan número: un espacio duro guarda el renglón para que los nombres alineen.
  const numero = numeralDeCarta(card) ?? "\u00a0";

  if (!card.isDiscovered && !card.isGolden) {
    return (
      <li className="grid content-start gap-1.5" data-carta="por-descubrir">
        <span className="block aspect-[7/12] overflow-hidden rounded-[6px] border border-dashed border-tinta/25">
          <Image
            src={cartaImagen(card.name, "tinta")}
            alt=""
            width={MEDIDAS_CARTA.tinta.width}
            height={MEDIDAS_CARTA.tinta.height}
            sizes="(max-width: 640px) 30vw, (max-width: 1024px) 16vw, 140px"
            className="h-full w-full object-cover opacity-[0.22]"
            unoptimized
          />
        </span>
        <span className="font-dato text-[0.625rem] leading-[1.4] tracking-[0.14em] text-grafito uppercase">
          <span aria-hidden="true">{numero}</span>
          <span className="sr-only">{porDescubrir}</span>
        </span>
      </li>
    );
  }

  return (
    <li className="grid content-start" data-carta={card.isGolden ? "dorada" : "descubierta"}>
      <Link
        href={`/cards/${card.slug}`}
        className="group grid content-start gap-1.5 rounded-[6px] focus-visible:outline-offset-4"
      >
        <span className={cn("relative block rounded-[6px]", card.isGolden && "golden-card-glow")}>
          <span
            className={cn(
              "relative block aspect-[7/12] overflow-hidden rounded-[6px] border transition-[transform,border-color] duration-300 ease-tinta group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0",
              card.isGolden ? "golden-card-border border-2" : "border-tinta/20 group-hover:border-rosa"
            )}
          >
            <Image
              src={cartaImagen(card.name)}
              alt=""
              width={MEDIDAS_CARTA.color.width}
              height={MEDIDAS_CARTA.color.height}
              sizes="(max-width: 640px) 30vw, (max-width: 1024px) 16vw, 140px"
              className="h-full w-full object-cover"
              unoptimized
            />
            {card.isGolden && (
              <span aria-hidden="true" className="golden-shimmer-effect pointer-events-none absolute inset-0" />
            )}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="font-dato text-[0.625rem] leading-[1.4] tracking-[0.14em] text-grafito uppercase"
        >
          {numero}
        </span>
        <span className="font-titulo text-[0.9375rem] leading-[1.15] text-balance group-hover:text-rosa-texto">
          {nombre}
        </span>
        {card.isGolden && (
          <span className="inline-flex items-center gap-1.5 font-dato text-[0.625rem] leading-[1.4] tracking-[0.12em] text-rosa-texto uppercase">
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-rosa" />
            {dorada}
          </span>
        )}
      </Link>
    </li>
  );
}

"use client";

import { useMemo, useState, type FormEvent, type MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Input, Button, buttonClasses } from "@/components/ui";
import { cartaImagen, MEDIDAS_CARTA } from "@/lib/cartas";
import { cn } from "@/lib/utils";
import { PALOS, agruparPorPalo, numeralDeCarta, paloDe, type Palo } from "./indice";

export interface CartaDelIndice {
  id: string;
  name: string;
  nameEs: string;
  slug: string | null;
  arcana: string;
  suit: string | null;
  number: number;
  keywords: string[];
}

interface IndiceCartasProps {
  cartas: CartaDelIndice[];
  paloInicial: Palo | "all";
  busquedaInicial: string;
  locale: string;
}

type Filtro = Palo | "all";
const FILTROS: Filtro[] = ["all", ...PALOS];

/** `/cards?palo=cups&q=amor` (sin los parámetros vacíos). */
function hrefDe(palo: Filtro, busqueda: string) {
  const params = new URLSearchParams();
  if (palo !== "all") params.set("palo", palo);
  if (busqueda.trim()) params.set("q", busqueda.trim());
  const query = params.toString();
  return query ? `/cards?${query}` : "/cards";
}

/** Un clic con modificador (abrir en otra pestaña) sigue siendo un enlace normal. */
const esClicSimple = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

/**
 * El índice de los 78 grabados con sus filtros. Lo pinta el servidor ya filtrado (`paloInicial`,
 * `busquedaInicial`): sin JS los filtros son enlaces y la búsqueda un GET. Con JS filtra en el momento y
 * deja la URL al día con `history.replaceState`.
 */
export function IndiceCartas({ cartas, paloInicial, busquedaInicial, locale }: IndiceCartasProps) {
  const t = useTranslations("cards");
  const [palo, setPalo] = useState<Filtro>(paloInicial);
  const [busqueda, setBusqueda] = useState(busquedaInicial);

  const sincronizar = (p: Filtro, q: string) => {
    if (typeof window !== "undefined") window.history.replaceState(null, "", hrefDe(p, q));
  };

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return cartas.filter((carta) => {
      if (palo !== "all" && paloDe(carta) !== palo) return false;
      if (!texto) return true;
      return (
        carta.name.toLowerCase().includes(texto) ||
        carta.nameEs.toLowerCase().includes(texto) ||
        carta.keywords.some((k) => k.toLowerCase().includes(texto))
      );
    });
  }, [cartas, palo, busqueda]);

  const grupos = useMemo(() => agruparPorPalo(filtradas), [filtradas]);

  const elegir = (e: MouseEvent, p: Filtro) => {
    if (!esClicSimple(e)) return;
    e.preventDefault();
    setPalo(p);
    sincronizar(p, busqueda);
  };

  const limpiar = (e: MouseEvent) => {
    if (!esClicSimple(e)) return;
    e.preventDefault();
    setPalo("all");
    setBusqueda("");
    sincronizar("all", "");
  };

  const buscar = (e: FormEvent) => {
    e.preventDefault();
    sincronizar(palo, busqueda);
  };

  const nombreDe = (carta: CartaDelIndice) => (locale === "en" ? carta.name : carta.nameEs);
  const tituloDe = (p: Filtro) => t(`filters.${p}`);

  return (
    <div className="grid gap-[clamp(28px,5vh,44px)]">
      <div className="grid gap-x-[clamp(24px,5vw,64px)] gap-y-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
        {/* Filtros por palo: enlaces que también sirven sin JS */}
        <nav aria-label={t("filters.label")}>
          <ul className="flex flex-wrap gap-2">
            {FILTROS.map((p) => {
              const activo = palo === p;
              return (
                <li key={p}>
                  <Link
                    href={hrefDe(p, busqueda)}
                    scroll={false}
                    aria-current={activo ? "page" : undefined}
                    onClick={(e) => elegir(e, p)}
                    className={cn(
                      "inline-flex min-h-11 items-center rounded-full border px-4 font-dato text-[0.6875rem] leading-[1.3] tracking-[0.1em] uppercase no-underline transition-colors duration-200",
                      activo ? "border-tinta bg-tinta text-papel" : "border-tinta/30 text-tinta hover:border-tinta"
                    )}
                  >
                    {tituloDe(p)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Búsqueda: GET sin JS, al instante con JS */}
        <form action="/cards" method="get" role="search" onSubmit={buscar} className="flex items-end gap-3">
          {palo !== "all" && <input type="hidden" name="palo" value={palo} />}
          <div className="min-w-0 flex-1">
            <Input
              id="buscar-cartas"
              name="q"
              type="search"
              label={t("searchLabel")}
              placeholder={t("searchPlaceholder")}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              autoComplete="off"
              enterKeyHint="search"
            />
          </div>
          <Button type="submit" variant="linea" size="sm" className="shrink-0">
            {t("searchButton")}
          </Button>
        </form>
      </div>

      <p aria-live="polite" className="font-dato text-xs tracking-[0.12em] text-letra-suave uppercase">
        {t("showing", { count: filtradas.length })}
      </p>

      {filtradas.length === 0 ? (
        <div className="grid justify-items-start gap-4 border-y border-filete/20 py-10">
          <p className="font-titulo text-[1.6rem] leading-[1.15]">{t("noResults")}</p>
          <Link href="/cards" scroll={false} onClick={limpiar} className={buttonClasses({ variant: "linea" })}>
            {t("clearFilters")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-[clamp(32px,5vh,48px)]">
          {grupos.map(([p, lista]) => (
            <section key={p} aria-labelledby={`indice-${p}`} className="grid gap-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-filete pt-3">
                <h2 id={`indice-${p}`} className="text-[clamp(1.4rem,1.1rem+1vw,1.9rem)] leading-[1.1]">
                  {tituloDe(p)}
                </h2>
                <p className="font-dato text-xs tracking-[0.12em] text-letra-suave uppercase tabular-nums">
                  {t("sectionCount", { count: lista.length })}
                </p>
              </div>
              <ul className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 sm:gap-x-4 md:grid-cols-6 lg:grid-cols-8">
                {lista.map((carta) => (
                  <li key={carta.id}>
                    <Link href={`/cards/${carta.slug}`} className="group grid content-start gap-1.5 rounded-[6px]">
                      <span className="block aspect-[7/12] overflow-hidden rounded-[6px] border border-tinta/15 transition-colors duration-300 group-hover:border-rosa">
                        <Image
                          src={cartaImagen(carta.name, "tinta")}
                          alt=""
                          width={MEDIDAS_CARTA.tinta.width}
                          height={MEDIDAS_CARTA.tinta.height}
                          className="h-full w-full object-cover transition-transform duration-500 ease-tinta motion-safe:group-hover:scale-[1.03]"
                          unoptimized
                        />
                      </span>
                      <span
                        aria-hidden="true"
                        className="mt-0.5 font-dato text-[0.625rem] leading-[1.4] tracking-[0.14em] text-grafito uppercase"
                      >
                        {/* Las cortes no llevan número: un espacio duro guarda el renglón para que los nombres alineen. */}
                        {numeralDeCarta(carta) ?? "\u00a0"}
                      </span>
                      <span className="font-titulo text-[0.9375rem] leading-[1.15] text-balance group-hover:text-rosa-texto">
                        {nombreDe(carta)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

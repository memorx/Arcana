"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui";
import { MEDIDAS_CARTA } from "@/lib/cartas";
import { cn } from "@/lib/utils";
import { DECK_FILTERS, filterDeck, thumbnailOf, type DeckCard, type DeckFilter } from "./manual-cards";

export interface CardPickerProps {
  cards: DeckCard[];
  /** cardId → position (1-based) where that card is already placed. */
  takenAt: Record<string, number>;
  /** Card currently placed in the active position (shown as pressed, still clickable). */
  activeCardId: string | null;
  onPick: (cardId: string) => void;
  locale: string;
}

const FILTER_KEYS: Record<DeckFilter, string> = {
  all: "filters.all",
  major: "filters.major",
  WANDS: "filters.wands",
  CUPS: "filters.cups",
  SWORDS: "filters.swords",
  PENTACLES: "filters.pentacles",
};

const NAV_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"]);

/**
 * Grid of the 78 cards with search (English and Spanish names) and a suit filter.
 * Cards already placed in another position are marked and can't be picked again.
 * Only one card is in the Tab order (roving tabindex); arrow keys, Home and End move
 * between cards and Enter or Space picks one. The grid is an index of engravings: the grey `mesa`
 * variant of each card, inked (`tinta`) once it is placed in the spread.
 */
export function CardPicker({ cards, takenAt, activeCardId, onPick, locale }: CardPickerProps) {
  const t = useTranslations("manual");
  const searchId = useId();
  const gridRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DeckFilter>("all");
  // Images that failed to load: the card shows its name instead.
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  // Roving tabindex: only one card is in the Tab order; arrows move between cards.
  const [focusId, setFocusId] = useState<string | null>(null);

  const visible = useMemo(() => filterDeck(cards, query, filter), [cards, query, filter]);
  const nameOf = (card: DeckCard) => (locale === "en" ? card.name : card.nameEs);

  // The tabbable card: the last one focused if it's still visible, else the active position's card, else the first.
  const isVisible = (id: string | null) => !!id && visible.some((c) => c.id === id);
  const tabbableId = isVisible(focusId)
    ? focusId
    : isVisible(activeCardId)
      ? activeCardId
      : (visible[0]?.id ?? null);

  const markImageFailed = (card: DeckCard) => setFailedImages((prev) => ({ ...prev, [card.id]: true }));

  // Left/right step by one, up/down by a row, Home/End to the ends.
  const handleGridKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (!NAV_KEYS.has(event.key) || !gridRef.current) return;
    const buttons = Array.from(gridRef.current.querySelectorAll<HTMLButtonElement>("button[data-card-id]"));
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (current === -1 || buttons.length === 0) return;

    const firstTop = buttons[0].offsetTop;
    const columns = Math.max(1, buttons.filter((b) => b.offsetTop === firstTop).length);

    const targets: Record<string, number> = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      ArrowUp: current - columns,
      ArrowDown: current + columns,
      Home: 0,
      End: buttons.length - 1,
    };
    const next = Math.min(buttons.length - 1, Math.max(0, targets[event.key]));
    event.preventDefault();
    const target = buttons[next];
    if (!target) return;
    setFocusId(target.dataset.cardId ?? null);
    target.focus();
  };

  return (
    <div className="grid gap-4">
      <Input
        id={searchId}
        type="search"
        label={t("searchLabel")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("searchPlaceholder")}
        autoComplete="off"
      />

      <div role="group" aria-label={t("filterLabel")} className="flex flex-wrap gap-1.5">
        {DECK_FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-3.5 font-dato text-[0.6875rem] tracking-[0.1em] uppercase",
              "motion-safe:transition-colors",
              filter === value
                ? "border-filete bg-filete text-suelo"
                : "border-filete/25 text-letra-suave hover:border-filete hover:text-letra"
            )}
          >
            {t(FILTER_KEYS[value])}
          </button>
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        {t("resultsCount", { count: visible.length })}
      </p>

      {visible.length === 0 ? (
        <p className="border-y border-dashed border-filete/30 px-4 py-8 text-center text-[0.9375rem] text-letra-suave">
          {t("noResults", { query: query.trim() })}
        </p>
      ) : (
        <ul
          ref={gridRef}
          onKeyDown={handleGridKeyDown}
          aria-label={t("deckLabel")}
          className="grid max-h-[26rem] grid-cols-4 gap-x-2 gap-y-3 overflow-y-auto overscroll-contain p-2 sm:max-h-[32rem] sm:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6"
        >
          {visible.map((card) => {
            const name = nameOf(card);
            const placedAt = takenAt[card.id];
            const isActive = activeCardId === card.id;
            const isTaken = placedAt !== undefined && !isActive;
            const showImage = !failedImages[card.id];

            return (
              <li key={card.id}>
                <button
                  type="button"
                  data-card-id={card.id}
                  tabIndex={card.id === tabbableId ? 0 : -1}
                  onFocus={() => setFocusId(card.id)}
                  aria-pressed={isActive}
                  aria-disabled={isTaken || undefined}
                  aria-label={isTaken ? t("alreadyChosen", { card: name, position: placedAt }) : t("pickCard", { card: name })}
                  onClick={() => {
                    if (!isTaken) onPick(card.id);
                  }}
                  className={cn(
                    "group flex w-full flex-col items-center gap-1.5 rounded-[6px] p-1 text-center",
                    isTaken ? "cursor-not-allowed opacity-45" : "hover:bg-papel-hondo",
                    isActive && "bg-papel-hondo"
                  )}
                >
                  <span
                    className={cn(
                      "relative block aspect-[300/520] w-full overflow-hidden rounded-[5px] bg-papel-hondo",
                      isActive ? "ring-2 ring-rosa ring-offset-2 ring-offset-papel" : "ring-1 ring-filete/15"
                    )}
                  >
                    {showImage ? (
                      // eslint-disable-next-line @next/next/no-img-element -- WebP autohospedada de 200/360 px (scripts/cartas.py)
                      <img
                        key={placedAt !== undefined ? "tinta" : "mesa"}
                        src={thumbnailOf(card, placedAt !== undefined)}
                        alt=""
                        width={MEDIDAS_CARTA.mesa.width}
                        height={MEDIDAS_CARTA.mesa.height}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-200 group-hover:motion-safe:scale-105"
                        onError={() => markImageFailed(card)}
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center p-1 font-lectura text-[0.625rem] leading-tight text-letra-suave">
                        {name}
                      </span>
                    )}
                    {isTaken && (
                      <span
                        aria-hidden="true"
                        className="absolute top-1 right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-tinta px-1 font-dato text-[0.625rem] text-papel"
                      >
                        {placedAt}
                      </span>
                    )}
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 bottom-0 bg-rosa-luz py-0.5 font-dato text-[0.625rem] text-tinta"
                      >
                        &#10003;
                      </span>
                    )}
                  </span>
                  <span aria-hidden="true" className="line-clamp-2 font-lectura text-[0.75rem] leading-tight text-letra">
                    {name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

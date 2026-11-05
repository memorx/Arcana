"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { DECK_FILTERS, THUMB_WIDTH, filterDeck, thumbUrl, type DeckCard, type DeckFilter } from "./manual-cards";

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
 * between cards and Enter or Space picks one. Thumbnails are Wikimedia's 120 px copies.
 */
export function CardPicker({ cards, takenAt, activeCardId, onPick, locale }: CardPickerProps) {
  const t = useTranslations("manual");
  const searchId = useId();
  const gridRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DeckFilter>("all");
  // Images that failed: 1 = the thumbnail failed (use the original), 2 = both failed (show the name).
  const [failedImages, setFailedImages] = useState<Record<string, number>>({});
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

  const imageFor = (card: DeckCard): string | null => {
    const failed = failedImages[card.id] ?? 0;
    if (!card.imageUrl || failed >= 2) return null;
    const thumb = thumbUrl(card.imageUrl, THUMB_WIDTH);
    if (failed === 0) return thumb;
    // The thumbnail failed: try the original once (if it's a different URL).
    return thumb === card.imageUrl ? null : card.imageUrl;
  };

  const markImageFailed = (card: DeckCard) =>
    setFailedImages((prev) => ({ ...prev, [card.id]: (prev[card.id] ?? 0) + 1 }));

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
    <div className="space-y-3">
      <div>
        <label htmlFor={searchId} className="sr-only">
          {t("searchLabel")}
        </label>
        <div className="relative">
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
          </svg>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            autoComplete="off"
            className="w-full rounded-lg border border-slate-700 bg-slate-900/60 py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>
      </div>

      <div role="group" aria-label={t("filterLabel")} className="flex flex-wrap gap-1.5">
        {DECK_FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500",
              "motion-safe:transition-colors",
              filter === value
                ? "border-purple-400/60 bg-purple-500/20 text-purple-200"
                : "border-slate-700 bg-slate-900/40 text-slate-400 hover:border-slate-600 hover:text-slate-200"
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
        <p className="rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-400">
          {t("noResults", { query: query.trim() })}
        </p>
      ) : (
        <ul
          ref={gridRef}
          onKeyDown={handleGridKeyDown}
          aria-label={t("deckLabel")}
          className="grid max-h-[26rem] grid-cols-4 gap-2 overflow-y-auto overscroll-contain p-1 sm:max-h-[32rem] sm:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6"
        >
          {visible.map((card) => {
            const name = nameOf(card);
            const placedAt = takenAt[card.id];
            const isActive = activeCardId === card.id;
            const isTaken = placedAt !== undefined && !isActive;
            const image = imageFor(card);

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
                    "group flex w-full flex-col items-center gap-1 rounded-lg p-1 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
                    isTaken ? "cursor-not-allowed opacity-40" : "hover:bg-slate-800/60",
                    isActive && "bg-amber-500/10 ring-2 ring-amber-400/80"
                  )}
                >
                  <span className="relative block aspect-[2/3] w-full overflow-hidden rounded-md border border-amber-500/20 bg-slate-800">
                    {image ? (
                      <Image
                        key={image}
                        src={image}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 22vw, 96px"
                        className="object-cover motion-safe:transition-transform motion-safe:duration-200 group-hover:motion-safe:scale-105"
                        onError={() => markImageFailed(card)}
                        unoptimized
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center p-1 text-[10px] leading-tight text-slate-400">
                        {name}
                      </span>
                    )}
                    {isTaken && (
                      <span
                        aria-hidden="true"
                        className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-950/90 px-1 text-[10px] font-bold text-amber-300"
                      >
                        {placedAt}
                      </span>
                    )}
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 bottom-0 bg-amber-500/90 py-0.5 text-[10px] font-semibold text-slate-950"
                      >
                        &#10003;
                      </span>
                    )}
                  </span>
                  <span aria-hidden="true" className="line-clamp-2 text-[11px] leading-tight text-slate-300">
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

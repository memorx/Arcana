"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { DeckCard, SlotChoice } from "./manual-cards";

export interface ManualSpreadPosition {
  position: number;
  name: string;
  nameEs: string;
  description: string;
}

export interface SlotListProps {
  positions: ManualSpreadPosition[];
  slots: SlotChoice[];
  activeIndex: number;
  cardsById: Record<string, DeckCard>;
  locale: string;
  onSelect: (index: number) => void;
  onToggleReversed: (index: number) => void;
  onClear: (index: number) => void;
}

/** Name of position `index` (0-based), falling back to "Position N" if the spread data is incomplete. */
export function positionLabel(
  positions: ManualSpreadPosition[],
  index: number,
  locale: string,
  fallback: string
): string {
  const position = positions.find((p) => Number(p.position) === index + 1);
  if (!position) return fallback;
  return locale === "en" ? position.name : position.nameEs;
}

/**
 * The spread's positions, in order. Selecting one makes it the target of the
 * card picker; each row can mark its card as reversed or clear it.
 */
export function SlotList({
  positions,
  slots,
  activeIndex,
  cardsById,
  locale,
  onSelect,
  onToggleReversed,
  onClear,
}: SlotListProps) {
  const t = useTranslations("manual");

  return (
    <ol className="space-y-2">
      {slots.map((slot, index) => {
        const label = positionLabel(positions, index, locale, t("positionLabel", { number: index + 1 }));
        const card = slot.cardId ? cardsById[slot.cardId] : undefined;
        const cardName = card ? (locale === "en" ? card.name : card.nameEs) : null;
        const isActive = index === activeIndex;

        return (
          <li
            key={index}
            className={cn(
              "flex items-center gap-2 rounded-lg border p-2",
              "motion-safe:transition-colors",
              isActive ? "border-amber-400/60 bg-amber-500/5" : "border-slate-800 bg-slate-900/40"
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(index)}
              aria-current={isActive ? "step" : undefined}
              aria-label={t("choosePosition", { position: label, number: index + 1 })}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <span
                className={cn(
                  "relative flex h-12 w-8 shrink-0 items-center justify-center overflow-hidden rounded border text-xs font-bold",
                  card ? "border-amber-500/30" : "border-dashed border-slate-600 text-slate-500"
                )}
              >
                {card?.imageUrl ? (
                  <Image
                    src={card.imageUrl}
                    alt=""
                    fill
                    sizes="32px"
                    className={cn("object-cover motion-safe:transition-transform motion-safe:duration-300", slot.isReversed && "rotate-180")}
                    unoptimized
                  />
                ) : (
                  index + 1
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs text-slate-400">
                  {index + 1}. {label}
                </span>
                <span className={cn("block truncate text-sm", card ? "font-medium text-slate-100" : "italic text-slate-500")}>
                  {cardName ?? t("emptySlot")}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => onToggleReversed(index)}
              aria-pressed={slot.isReversed}
              aria-label={t("reversedToggle", { position: label })}
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500",
                slot.isReversed
                  ? "border-orange-400/50 bg-orange-500/20 text-orange-200"
                  : "border-slate-700 text-slate-400 hover:text-slate-200"
              )}
            >
              <span aria-hidden="true">&#8645; </span>
              {t("reversed")}
            </button>

            {card && (
              <button
                type="button"
                onClick={() => onClear(index)}
                aria-label={t("clearSlot", { card: cardName ?? "", position: label })}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { cartaImagen, MEDIDAS_CARTA } from "@/lib/cartas";
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
    <ol className="grid gap-2">
      {slots.map((slot, index) => {
        const label = positionLabel(positions, index, locale, t("positionLabel", { number: index + 1 }));
        const card = slot.cardId ? cardsById[slot.cardId] : undefined;
        const cardName = card ? (locale === "en" ? card.name : card.nameEs) : null;
        const isActive = index === activeIndex;

        return (
          <li
            key={index}
            className={cn(
              "flex items-center gap-1.5 rounded-[6px] border p-1.5",
              "motion-safe:transition-colors",
              isActive ? "border-rosa bg-papel-hondo" : "border-filete/20"
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(index)}
              aria-current={isActive ? "step" : undefined}
              aria-label={t("choosePosition", { position: label, number: index + 1 })}
              className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-[4px] text-left"
            >
              <span
                className={cn(
                  "relative flex h-[55px] w-8 shrink-0 items-center justify-center overflow-hidden rounded-[4px] font-dato text-xs",
                  card ? "bg-tinta" : "border border-dashed border-filete/40 text-letra-suave"
                )}
              >
                {card ? (
                  // eslint-disable-next-line @next/next/no-img-element -- WebP autohospedada (scripts/cartas.py)
                  <img
                    src={cartaImagen(card.name)}
                    alt=""
                    width={MEDIDAS_CARTA.color.width}
                    height={MEDIDAS_CARTA.color.height}
                    decoding="async"
                    className={cn(
                      "absolute inset-0 h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-300",
                      slot.isReversed && "rotate-180"
                    )}
                  />
                ) : (
                  index + 1
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-dato text-[0.625rem] tracking-[0.1em] text-letra-suave uppercase">
                  {index + 1}. {label}
                </span>
                <span className={cn("block truncate", card ? "font-titulo text-[1.0625rem] leading-tight" : "font-lectura text-[0.9375rem] text-letra-suave italic")}>
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
                "inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border px-2.5 font-dato text-[0.625rem] tracking-[0.08em] uppercase",
                slot.isReversed
                  ? "border-rosa-luz bg-rosa-luz text-tinta"
                  : "border-filete/25 text-letra-suave hover:border-filete hover:text-letra"
              )}
            >
              <span aria-hidden="true">&#8645;</span>
              {t("reversed")}
            </button>

            {card && (
              <button
                type="button"
                onClick={() => onClear(index)}
                aria-label={t("clearSlot", { card: cardName ?? "", position: label })}
                className="flex size-11 shrink-0 items-center justify-center rounded-full text-letra-suave hover:bg-papel hover:text-letra"
              >
                <span aria-hidden="true" className="text-lg leading-none">&times;</span>
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}

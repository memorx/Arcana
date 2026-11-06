"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MotionConfig } from "framer-motion";
import { useTranslations } from "next-intl";
import { Badge, Button } from "@/components/ui";
import { FadeIn } from "@/components/animations";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { CartaFija, FiguraTirada, Tirada } from "@/components/reading/Tirada";
import { cn } from "@/lib/utils";
import { CardPicker } from "./CardPicker";
import { SlotList, positionLabel, type ManualSpreadPosition } from "./SlotList";
import {
  assignCard,
  buildManualCards,
  emptySlots,
  isComplete,
  nextEmptySlot,
  type DeckCard,
  type SlotChoice,
} from "./manual-cards";

export interface ManualSpread {
  id: string;
  name: string;
  nameEs: string;
  description: string;
  descriptionEs: string;
  cardCount: number;
  creditCost: number;
  category: string;
  positions: ManualSpreadPosition[];
}

export interface ManualReadingFlowProps {
  spreadTypes: ManualSpread[];
  freeReadingsLeft: number;
  credits: number;
  locale: string;
}

type Step = "spread" | "cards" | "intention";
const STEPS: Step[] = ["spread", "cards", "intention"];
const MIN_INTENTION = 10;

const ENLACE =
  "inline-flex min-h-11 items-center font-dato text-xs font-medium tracking-[0.1em] text-letra-acento uppercase underline-offset-[0.3em] hover:underline";

type DeckState = { status: "loading" } | { status: "error" } | { status: "ready"; cards: DeckCard[] };
type SubmitError = "unavailable" | "refused" | "credits" | "generic" | null;

/**
 * "Your own deck" reading: (1) choose the spread you laid out, (2) tell us which
 * card came out in each position (and whether it was reversed), (3) write the
 * intention and confirm. Arcana interprets and we go to the saved reading.
 */
export function ManualReadingFlow({ spreadTypes, freeReadingsLeft, credits, locale }: ManualReadingFlowProps) {
  const t = useTranslations("manual");
  const tReading = useTranslations("reading");
  const router = useRouter();

  const [step, setStep] = useState<Step>("spread");
  const [spread, setSpread] = useState<ManualSpread | null>(null);
  const [slots, setSlots] = useState<SlotChoice[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [deck, setDeck] = useState<DeckState>({ status: "loading" });
  const [intention, setIntention] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<SubmitError>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Only move focus after the person changes step, not on the first render.
  const focusOnStepChange = useRef(false);

  const loadDeck = useCallback(async () => {
    setDeck({ status: "loading" });
    try {
      const res = await fetch("/api/cards");
      const cards = (await res.json()) as DeckCard[];
      if (!res.ok || !Array.isArray(cards) || cards.length === 0) throw new Error("deck");
      setDeck({ status: "ready", cards });
    } catch {
      setDeck({ status: "error" });
    }
  }, []);

  useEffect(() => {
    loadDeck();
  }, [loadDeck]);

  // Move focus to the step heading so keyboard and screen reader users land on the new step.
  useEffect(() => {
    if (!focusOnStepChange.current) return;
    focusOnStepChange.current = false;
    headingRef.current?.focus();
  }, [step]);

  const goTo = (next: Step) => {
    focusOnStepChange.current = true;
    setStep(next);
  };

  const cardsById = useMemo(() => {
    const map: Record<string, DeckCard> = {};
    if (deck.status === "ready") for (const card of deck.cards) map[card.id] = card;
    return map;
  }, [deck]);

  const takenAt = useMemo(() => {
    const map: Record<string, number> = {};
    slots.forEach((slot, index) => {
      if (slot.cardId) map[slot.cardId] = index + 1;
    });
    return map;
  }, [slots]);

  const positions = useMemo(
    () => [...(spread?.positions ?? [])].sort((a, b) => Number(a.position) - Number(b.position)),
    [spread]
  );

  const localized = (item: { name: string; nameEs: string }) => (locale === "en" ? item.name : item.nameEs);
  const labelFor = (index: number) =>
    positionLabel(positions, index, locale, t("positionLabel", { number: index + 1 }));
  const filledCount = slots.filter((s) => s.cardId).length;
  const usesFreeReading = freeReadingsLeft > 0;

  const chooseSpread = (next: ManualSpread) => {
    if (spread?.id !== next.id) {
      setSpread(next);
      setSlots(emptySlots(next.cardCount));
      setActiveIndex(0);
    }
    setSubmitError(null);
    goTo("cards");
  };

  const pickCard = (cardId: string) => {
    const updated = assignCard(slots, activeIndex, cardId);
    setSlots(updated);
    const next = nextEmptySlot(updated, activeIndex);
    if (next !== -1) setActiveIndex(next);
  };

  const toggleReversed = (index: number) =>
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, isReversed: !s.isReversed } : s)));

  const clearSlot = (index: number) => {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, cardId: null } : s)));
    setActiveIndex(index);
  };

  const handleSubmit = async () => {
    if (!spread || !isComplete(slots) || intention.trim().length < MIN_INTENTION) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/reading/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadTypeId: spread.id,
          intention: intention.trim(),
          locale,
          cards: buildManualCards(slots),
        }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.reading?.id) {
        // Keep the loading state until the reading page takes over.
        router.push(`/reading/${data.reading.id}`);
        return;
      }

      if (res.status === 503) setSubmitError("unavailable");
      else if (res.status === 422) setSubmitError("refused");
      else if (res.status === 403) setSubmitError("credits");
      else setSubmitError("generic");
    } catch {
      setSubmitError("generic");
    }
    setIsSubmitting(false);
  };

  const stepIndex = STEPS.indexOf(step);

  return (
    <MotionConfig reducedMotion="user">
      <div className="grid gap-8">
        {/* Header */}
        <header className="grid max-w-[760px] gap-4">
          <Link
            href="/reading/new"
            className="inline-flex min-h-11 items-center gap-2 justify-self-start font-dato text-xs tracking-[0.1em] text-letra-suave uppercase hover:text-letra"
          >
            <span aria-hidden="true">←</span>
            {t("backToSpreads")}
          </Link>
          <h1 className="font-titulo text-[clamp(2rem,1.4rem+2vw,3.2rem)] leading-[1.05]">{t("title")}</h1>
          <p className="max-w-[56ch] text-letra-suave">{t("subtitle")}</p>

          <div className="flex flex-wrap items-center gap-2">
            {freeReadingsLeft > 0 && <Badge variant="success">{t("balanceFree", { count: freeReadingsLeft })}</Badge>}
            <Badge variant="secondary">{t("balanceCredits", { count: credits })}</Badge>
          </div>
        </header>

        {/* Step indicator */}
        <nav aria-label={t("stepsLabel")}>
          <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-filete/20 py-3 font-dato text-[0.6875rem] tracking-[0.1em] uppercase">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-3">
                <span
                  aria-current={s === step ? "step" : undefined}
                  className={cn("flex items-center gap-2", s === step || i < stepIndex ? "text-letra" : "text-letra-suave")}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full border text-[0.625rem]",
                      s === step ? "border-rosa-luz bg-rosa-luz text-tinta" : i < stepIndex ? "border-filete" : "border-filete/30"
                    )}
                  >
                    {i + 1}
                  </span>
                  <span>{t(`steps.${s}`)}</span>
                </span>
                {i < STEPS.length - 1 && <span aria-hidden="true" className="h-px w-5 bg-filete/30 sm:w-10" />}
              </li>
            ))}
          </ol>
        </nav>

        {/* Step 1: spread */}
        {step === "spread" && (
          <FadeIn key="spread" className="grid gap-5">
            <div className="grid gap-1.5">
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="font-titulo text-[clamp(1.5rem,1.2rem+1vw,2rem)] leading-[1.1] focus:outline-none"
              >
                {t("chooseSpread")}
              </h2>
              <p className="text-letra-suave">{t("chooseSpreadHint")}</p>
            </div>

            <ul className="grid grid-cols-1 border-t border-l border-filete/25 sm:grid-cols-2 lg:grid-cols-3">
              {spreadTypes.map((s) => {
                const canAfford = usesFreeReading || credits >= s.creditCost;
                const sorted = [...s.positions].sort((a, b) => Number(a.position) - Number(b.position));
                return (
                  <li key={s.id} className="border-r border-b border-filete/25">
                    <button
                      type="button"
                      onClick={() => canAfford && chooseSpread(s)}
                      aria-disabled={!canAfford || undefined}
                      className={cn(
                        "flex h-full w-full flex-col gap-4 p-5 text-left outline-offset-[-3px]",
                        "motion-safe:transition-colors motion-safe:duration-300",
                        canAfford ? "hover:bg-papel-hondo" : "cursor-not-allowed text-letra-suave",
                        spread?.id === s.id && "bg-papel-hondo"
                      )}
                    >
                      <span className="flex items-end justify-between gap-3">
                        <span className="grid gap-1">
                          <span className="font-titulo text-[1.35rem] leading-[1.1]">{localized(s)}</span>
                          <span className="font-dato text-[0.6875rem] tracking-[0.1em] text-letra-suave uppercase">
                            {tReading("cards", { count: s.cardCount })}
                          </span>
                        </span>
                        <span className="flex h-16 shrink-0 items-end">
                          <FiguraTirada total={s.cardCount} nombreTirada={s.name} />
                        </span>
                      </span>
                      <span className="font-dato text-[0.6875rem] leading-[1.7] tracking-[0.04em] break-words">
                        {sorted.slice(0, 5).map((pos) => localized(pos)).join(" · ")}
                        {sorted.length > 5 && (
                          <span className="text-letra-suave"> · {tReading("more", { count: sorted.length - 5 })}</span>
                        )}
                      </span>
                      <span className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-filete/15 pt-3">
                        <span className="font-dato text-xs font-medium tracking-[0.1em] text-letra-acento uppercase">
                          {usesFreeReading ? tReading("free") : t("cost", { count: s.creditCost })}
                        </span>
                        {!canAfford && (
                          <span className="font-dato text-[0.6875rem] tracking-[0.06em] text-letra-suave">
                            {t("cantAfford", { count: s.creditCost - credits })}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {!usesFreeReading && spreadTypes.every((s) => credits < s.creditCost) && (
              <p>
                <Link href="/credits" className={ENLACE}>
                  {t("buyCredits")} &rarr;
                </Link>
              </p>
            )}
          </FadeIn>
        )}

        {/* Step 2: which cards came out */}
        {step === "cards" && spread && (
          <FadeIn key="cards" className="grid gap-5">
            <div className="grid gap-1.5">
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="font-titulo text-[clamp(1.5rem,1.2rem+1vw,2rem)] leading-[1.1] focus:outline-none"
              >
                {t("pickCardsTitle")}
              </h2>
              <p className="max-w-[60ch] text-letra-suave">{t("pickCardsHint")}</p>
            </div>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-10">
              <section aria-labelledby="manual-tirada-titulo" className="grid content-start gap-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-filete/20 pb-2">
                  <Etiqueta as="h3" id="manual-tirada-titulo">
                    {localized(spread)}
                  </Etiqueta>
                  <span className="font-dato text-[0.6875rem] tracking-[0.06em] text-letra-suave">
                    {t("progress", { done: filledCount, total: slots.length })}
                  </span>
                </div>
                <SlotList
                  positions={positions}
                  slots={slots}
                  activeIndex={activeIndex}
                  cardsById={cardsById}
                  locale={locale}
                  onSelect={setActiveIndex}
                  onToggleReversed={toggleReversed}
                  onClear={clearSlot}
                />
              </section>

              <div className="grid content-start gap-3">
                <p className="border-b border-filete/20 pb-2 font-lectura text-[1.0625rem] italic" aria-live="polite">
                  {t("choosingFor", { number: activeIndex + 1, position: labelFor(activeIndex) })}
                </p>
                {deck.status === "loading" && (
                  <div role="status" className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6">
                    <span className="sr-only">{t("loadingCards")}</span>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <span
                        key={i}
                        aria-hidden="true"
                        className="aspect-[300/520] rounded-[5px] bg-papel-hondo motion-safe:animate-pulse"
                      />
                    ))}
                  </div>
                )}
                {deck.status === "error" && (
                  <div role="alert" className="grid justify-items-start gap-3 border-l-2 border-rosa bg-papel-hondo px-4 py-4">
                    <p className="text-[0.9375rem]">{t("cardsLoadError")}</p>
                    <Button variant="secondary" size="sm" onClick={loadDeck}>
                      {t("retryLoad")}
                    </Button>
                  </div>
                )}
                {deck.status === "ready" && (
                  <CardPicker
                    cards={deck.cards}
                    takenAt={takenAt}
                    activeCardId={slots[activeIndex]?.cardId ?? null}
                    onPick={pickCard}
                    locale={locale}
                  />
                )}
              </div>
            </div>

            <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-filete/30 bg-papel py-3">
              <Button variant="ghost" onClick={() => goTo("spread")}>
                {t("back")}
              </Button>
              <span className="hidden font-dato text-xs tracking-[0.06em] text-letra-suave sm:inline">
                {t("progress", { done: filledCount, total: slots.length })}
              </span>
              <Button onClick={() => goTo("intention")} disabled={!isComplete(slots)}>
                {t("next")}
              </Button>
            </div>
          </FadeIn>
        )}

        {/* Step 3: intention and confirm */}
        {step === "intention" && spread && (
          <FadeIn key="intention" className="grid gap-8">
            <div className="grid gap-1.5">
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="font-titulo text-[clamp(1.5rem,1.2rem+1vw,2rem)] leading-[1.1] focus:outline-none"
              >
                {t("summaryTitle")}
              </h2>
              <Etiqueta>{localized(spread)}</Etiqueta>
            </div>

            <Tirada
              compacta
              posiciones={slots.map((_, index) => ({ numero: index + 1, nombre: labelFor(index) }))}
              nombreTirada={spread.name}
              etiqueta={t("summaryTitle")}
              carta={(_, index) => {
                const cardId = slots[index].cardId;
                const card = cardId ? cardsById[cardId] : undefined;
                return card ? <CartaFija carta={card} alt={localized(card)} invertida={slots[index].isReversed} /> : null;
              }}
              pie={(_, index) => {
                const cardId = slots[index].cardId;
                const card = cardId ? cardsById[cardId] : undefined;
                if (!card) return null;
                return (
                  <p className="font-titulo text-[clamp(1rem,0.9rem+0.5vw,1.3rem)] leading-[1.15]">
                    {localized(card)}
                    {slots[index].isReversed && (
                      <span className="mt-1 block font-dato text-[0.625rem] tracking-[0.12em] text-letra-acento uppercase">
                        {tReading("reversed")}
                      </span>
                    )}
                  </p>
                );
              }}
            />

            <section
              aria-labelledby="manual-intencion-titulo"
              className="grid max-w-[760px] gap-4 border-t-[3px] border-rosa pt-6"
            >
              <h3 id="manual-intencion-titulo" className="font-titulo text-[clamp(1.4rem,1.15rem+0.8vw,1.8rem)] leading-[1.1]">
                {t("intentionTitle")}
              </h3>
              <label htmlFor="manual-intention" className="text-letra-suave">
                {t("intentionHint")}
              </label>
              <textarea
                id="manual-intention"
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                placeholder={tReading("intentionPlaceholder")}
                disabled={isSubmitting}
                className="block min-h-36 w-full resize-y rounded-none border-0 border-y border-filete/40 bg-transparent px-0 py-4 font-lectura text-[1.15rem] leading-[1.55] text-letra italic placeholder:text-letra-suave placeholder:not-italic focus:border-rosa focus:shadow-[0_1px_0_0_var(--color-rosa)] focus:outline-none disabled:opacity-60 sm:text-[1.25rem]"
              />
              <p className="font-dato text-[0.6875rem] tracking-[0.06em] text-letra-suave">
                {tReading("intentionHint", { count: intention.trim().length })}
              </p>

              <p className="font-dato text-xs leading-[1.6] tracking-[0.04em]">
                {usesFreeReading
                  ? t("costFree", { count: freeReadingsLeft })
                  : t("costCredits", { count: spread.creditCost, balance: credits })}
              </p>

              {submitError && (
                <div role="alert" className="border-l-2 border-rosa bg-papel-hondo px-4 py-3">
                  <p className="text-[0.9375rem] leading-[1.5]">
                    {submitError === "unavailable" && tReading("interpretationUnavailable")}
                    {submitError === "refused" && tReading("interpretationRefused")}
                    {submitError === "credits" && t("needCredits")}
                    {submitError === "generic" && t("createError")}
                  </p>
                  {submitError === "credits" && (
                    <Link href="/credits" className={cn(ENLACE, "mt-1")}>
                      {t("buyCredits")} &rarr;
                    </Link>
                  )}
                </div>
              )}

              {isSubmitting && (
                <p role="status" className="flex items-center gap-2 font-lectura italic">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-rosa motion-safe:animate-pulse" />
                  {t("interpreting")}
                </p>
              )}

              <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <Button variant="ghost" onClick={() => goTo("cards")} disabled={isSubmitting}>
                  {t("back")}
                </Button>
                <Button
                  size="lg"
                  onClick={handleSubmit}
                  isLoading={isSubmitting}
                  disabled={intention.trim().length < MIN_INTENTION || submitError === "credits"}
                >
                  {submitError === "unavailable" ? tReading("retry") : t("submit")}
                </Button>
              </div>
            </section>
          </FadeIn>
        )}
      </div>
    </MotionConfig>
  );
}

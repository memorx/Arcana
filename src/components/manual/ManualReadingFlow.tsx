"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MotionConfig } from "framer-motion";
import { useTranslations } from "next-intl";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, TarotCardStatic } from "@/components/ui";
import { FadeIn } from "@/components/animations";
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
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <Link
            href="/reading/new"
            className="mb-3 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-300"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("backToSpreads")}
          </Link>
          <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">{t("title")}</h1>
          <p className="mx-auto mt-2 max-w-xl text-slate-400">{t("subtitle")}</p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {freeReadingsLeft > 0 && (
              <Badge variant="success" className="px-3 py-1 text-sm">
                {t("balanceFree", { count: freeReadingsLeft })}
              </Badge>
            )}
            <Badge variant="secondary" className="px-3 py-1 text-sm">
              {t("balanceCredits", { count: credits })}
            </Badge>
          </div>
        </div>

        {/* Step indicator */}
        <nav aria-label={t("stepsLabel")} className="mb-6">
          <ol className="flex items-center justify-center gap-2 text-xs sm:text-sm">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <span
                  aria-current={s === step ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1",
                    s === step
                      ? "border-amber-400/60 bg-amber-500/10 text-amber-200"
                      : i < stepIndex
                        ? "border-purple-500/40 text-purple-300"
                        : "border-slate-800 text-slate-500"
                  )}
                >
                  <span className="font-semibold">{i + 1}</span>
                  <span>{t(`steps.${s}`)}</span>
                </span>
                {i < STEPS.length - 1 && <span aria-hidden="true" className="h-px w-4 bg-slate-700 sm:w-8" />}
              </li>
            ))}
          </ol>
        </nav>

        {/* Step 1: spread */}
        {step === "spread" && (
          <FadeIn key="spread" className="space-y-4">
            <div className="text-center">
              <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-slate-100 focus:outline-none">
                {t("chooseSpread")}
              </h2>
              <p className="mt-1 text-sm text-slate-400">{t("chooseSpreadHint")}</p>
            </div>

            <ul className="grid gap-4 md:grid-cols-2">
              {spreadTypes.map((s) => {
                const canAfford = usesFreeReading || credits >= s.creditCost;
                const isThemed = s.category === "themed";
                const sorted = [...s.positions].sort((a, b) => Number(a.position) - Number(b.position));
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => canAfford && chooseSpread(s)}
                      aria-disabled={!canAfford || undefined}
                      className={cn(
                        "relative h-full w-full overflow-hidden rounded-xl border bg-slate-900/50 p-5 text-left backdrop-blur-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
                        "motion-safe:transition-all motion-safe:duration-300",
                        canAfford
                          ? "border-slate-800 hover:border-purple-500/50 hover:bg-slate-900/80"
                          : "cursor-not-allowed border-slate-800 opacity-50",
                        spread?.id === s.id && "border-amber-400/60"
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute right-0 top-0 h-32 w-32 rounded-full bg-gradient-to-br to-transparent blur-2xl",
                          isThemed ? "from-amber-500/10" : "from-purple-500/10"
                        )}
                      />
                      <span className="relative flex items-start justify-between gap-3">
                        <span>
                          <span className="block text-lg font-semibold text-slate-100">{localized(s)}</span>
                          <span className="mt-0.5 block text-sm text-slate-400">
                            {tReading("cards", { count: s.cardCount })}
                          </span>
                        </span>
                        <Badge variant={usesFreeReading ? "success" : "secondary"} className="shrink-0 text-sm">
                          {usesFreeReading ? tReading("free") : t("cost", { count: s.creditCost })}
                        </Badge>
                      </span>
                      <span className="relative mt-3 flex flex-wrap gap-1.5">
                        {sorted.slice(0, 5).map((pos) => (
                          <span key={pos.position} className="rounded bg-slate-800/50 px-2 py-1 text-xs text-slate-400">
                            {localized(pos)}
                          </span>
                        ))}
                        {sorted.length > 5 && (
                          <span className="px-1 py-1 text-xs text-slate-500">
                            {tReading("more", { count: sorted.length - 5 })}
                          </span>
                        )}
                      </span>
                      {!canAfford && (
                        <span className="relative mt-3 block text-sm text-amber-400/80">
                          {t("cantAfford", { count: s.creditCost - credits })}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            {!usesFreeReading && spreadTypes.every((s) => credits < s.creditCost) && (
              <p className="text-center text-sm text-slate-400">
                <Link href="/credits" className="font-medium text-amber-400 hover:text-amber-300">
                  {t("buyCredits")} &rarr;
                </Link>
              </p>
            )}
          </FadeIn>
        )}

        {/* Step 2: which cards came out */}
        {step === "cards" && spread && (
          <FadeIn key="cards" className="space-y-4">
            <div className="text-center">
              <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-slate-100 focus:outline-none">
                {t("pickCardsTitle")}
              </h2>
              <p className="mx-auto mt-1 max-w-xl text-sm text-slate-400">{t("pickCardsHint")}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <span>{localized(spread)}</span>
                    <span className="text-xs font-normal text-slate-400">
                      {t("progress", { done: filledCount, total: slots.length })}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4 pb-2">
                  <p className="text-sm text-slate-300" aria-live="polite">
                    {t("choosingFor", { number: activeIndex + 1, position: labelFor(activeIndex) })}
                  </p>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {deck.status === "loading" && (
                    <div role="status" className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6">
                      <span className="sr-only">{t("loadingCards")}</span>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <span
                          key={i}
                          aria-hidden="true"
                          className="aspect-[2/3] rounded-md bg-slate-800 motion-safe:animate-pulse"
                        />
                      ))}
                    </div>
                  )}
                  {deck.status === "error" && (
                    <div role="alert" className="space-y-3 py-6 text-center">
                      <p className="text-sm text-slate-300">{t("cardsLoadError")}</p>
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
                </CardContent>
              </Card>
            </div>

            <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-3 border-t border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
              <Button variant="ghost" onClick={() => goTo("spread")}>
                {t("back")}
              </Button>
              <span className="text-xs text-slate-400 sm:text-sm">
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
          <FadeIn key="intention" className="space-y-6">
            <div className="text-center">
              <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-slate-100 focus:outline-none">
                {t("summaryTitle")}
              </h2>
              <p className="mt-1 text-sm text-slate-400">{localized(spread)}</p>
            </div>

            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {slots.map((slot, index) => {
                const card = slot.cardId ? cardsById[slot.cardId] : undefined;
                if (!card) return null;
                return (
                  <li
                    key={index}
                    className="flex flex-col items-center rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-center"
                  >
                    <span className="mb-2 line-clamp-1 text-xs text-slate-400">
                      {index + 1}. {labelFor(index)}
                    </span>
                    <TarotCardStatic
                      card={card}
                      isReversed={slot.isReversed}
                      showReversedBadge={false}
                      size="sm"
                      locale={locale}
                    />
                    <span className="mt-2 text-sm font-medium text-slate-100">{localized(card)}</span>
                    {slot.isReversed && <span className="text-xs text-orange-400">{tReading("reversed")}</span>}
                  </li>
                );
              })}
            </ul>

            <Card variant="highlighted">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span aria-hidden="true" className="text-amber-400">&#10022;</span>
                  {t("intentionTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <label htmlFor="manual-intention" className="mb-3 block text-sm text-slate-400">
                  {t("intentionHint")}
                </label>
                <textarea
                  id="manual-intention"
                  value={intention}
                  onChange={(e) => setIntention(e.target.value)}
                  placeholder={tReading("intentionPlaceholder")}
                  disabled={isSubmitting}
                  className="h-32 w-full resize-none rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
                <p className="mt-2 text-xs text-slate-500">
                  {tReading("intentionHint", { count: intention.trim().length })}
                </p>

                <p className="mt-4 rounded-lg border border-slate-700 bg-slate-900/40 px-4 py-3 text-sm text-slate-300">
                  {usesFreeReading
                    ? t("costFree", { count: freeReadingsLeft })
                    : t("costCredits", { count: spread.creditCost, balance: credits })}
                </p>

                {submitError && (
                  <div role="alert" className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                    <p className="text-sm text-amber-200">
                      {submitError === "unavailable" && tReading("interpretationUnavailable")}
                      {submitError === "refused" && tReading("interpretationRefused")}
                      {submitError === "credits" && t("needCredits")}
                      {submitError === "generic" && t("createError")}
                    </p>
                    {submitError === "credits" && (
                      <Link href="/credits" className="mt-2 inline-block text-sm font-medium text-amber-400 hover:text-amber-300">
                        {t("buyCredits")} &rarr;
                      </Link>
                    )}
                  </div>
                )}

                {isSubmitting && (
                  <p role="status" className="mt-4 flex items-center justify-center gap-2 text-sm text-purple-300">
                    <span aria-hidden="true" className="motion-safe:animate-pulse">&#10022;</span>
                    {t("interpreting")}
                  </p>
                )}

                <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
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
              </CardContent>
            </Card>
          </FadeIn>
        )}
      </div>
    </MotionConfig>
  );
}

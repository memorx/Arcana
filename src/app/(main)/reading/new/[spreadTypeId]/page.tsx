"use client";

import { useState, useEffect, useRef, use, type ComponentProps } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Button, buttonClasses, Modal, ModalHeader, ModalBody } from "@/components/ui";
import { CartaQuemable } from "@/components/tinta/CartaQuemable";
import { TransicionPincel } from "@/components/tinta/TransicionPincel";
import { MesaDeGrabados } from "@/components/tinta/MesaDeGrabados";
import { Escena } from "@/components/tinta/Escena";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { Pincel } from "@/components/tinta/Pincel";
import { CARTAS, slugCarta } from "@/lib/cartas";
import { cn } from "@/lib/utils";
import { Tirada, CartaFija, FiguraTirada, type PosicionTirada } from "@/components/reading/Tirada";
import { IntencionCita, Interpretacion, entreComillas } from "@/components/reading/LecturaPliego";
import { numeroRomano } from "@/components/reading/disposicion";
import { useMedia } from "@/components/reading/useMedia";
import { StreakRewardModal } from "@/components/dashboard/StreakRewardModal";
import { NewCardDiscoveredModal } from "@/components/reading/NewCardDiscoveredModal";
import { AchievementUnlockedModal } from "@/components/achievements/AchievementUnlockedModal";
import { LevelUpModal } from "@/components/levels/LevelUpModal";
import { ChallengeCompletedModal } from "@/components/challenges/ChallengeCompletedModal";
import { GoldenCardModal } from "@/components/golden";

interface SpreadType {
  id: string;
  name: string;
  nameEs: string;
  description: string;
  descriptionEs: string;
  cardCount: number;
  creditCost: number;
  positions: Array<{
    position: number;
    name: string;
    nameEs: string;
    description: string;
  }>;
}

interface CardData {
  id: string;
  name: string;
  nameEs: string;
  arcana: string;
  suit: string | null;
  keywords: string[];
  meaningUpright: string;
  meaningReversed: string;
  meaningUprightEn: string | null;
  meaningReversedEn: string | null;
}

interface PositionInfo {
  position: number;
  name: string;
  nameEs: string;
  description: string;
}

interface ReadingCard {
  position: number;
  cardId: string;
  isReversed: boolean;
  isGolden: boolean;
  card: CardData;
  positionInfo: PositionInfo;
}

/** Lo que manda la API para el modal de cartas doradas (el tipo lo pone el modal). */
type GoldenCardInfo = ComponentProps<typeof GoldenCardModal>["cards"][number];

interface StreakRewardInfo {
  milestone: number;
  creditsAwarded: number;
}

interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  reward: StreakRewardInfo | null;
}

type DiscoveredCardInfo = ComponentProps<typeof NewCardDiscoveredModal>["cards"][number];

interface UnlockedAchievementInfo {
  id: string;
  key: string;
  name: string;
  nameEs: string;
  description: string;
  descriptionEs: string;
  icon: string;
  category: string;
  creditReward: number;
}

interface LevelUpInfo {
  newLevel: number;
  levelName: string;
  levelNameEs: string;
  levelIcon: string;
  creditsAwarded: number;
}

interface CompletedChallengeInfo {
  id: string;
  key: string;
  name: string;
  nameEs: string;
  icon: string;
  creditReward: number;
}

interface ReadingResult {
  reading: {
    id: string;
    intention: string;
    interpretation: string;
    createdAt: string;
    spreadType: SpreadType;
  };
  cards: ReadingCard[];
  usedFreeReading: boolean;
  streak?: StreakInfo;
  newlyDiscoveredCards?: DiscoveredCardInfo[];
  goldenCards?: GoldenCardInfo[];
  unlockedAchievements?: UnlockedAchievementInfo[];
  levelUp?: LevelUpInfo;
  completedChallenges?: CompletedChallengeInfo[];
}

type Step = "intention" | "shuffling" | "revealing" | "interpretation";

/** Barajar: 16 grabados (dos bandas de 8) que se reacomodan mientras la API arma la tirada. */
const GRABADOS_AL_BARAJAR = 16;

function revolver<T>(lista: readonly T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

const titulo1 = "font-titulo text-[clamp(2rem,1.4rem+2vw,3.2rem)] leading-[1.05]";
const nombreCarta = "font-titulo text-[clamp(1rem,0.9rem+0.5vw,1.4rem)] leading-[1.15]";

export default function ReadingFlowPage({
  params,
}: {
  params: Promise<{ spreadTypeId: string }>;
}) {
  const { spreadTypeId } = use(params);
  const t = useTranslations("reading");
  const tCommon = useTranslations("common");
  const tCarta = useTranslations("carta");
  const locale = useLocale();

  const [spreadType, setSpreadType] = useState<SpreadType | null>(null);
  const [step, setStep] = useState<Step>("intention");
  const [intention, setIntention] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  // The AI couldn't interpret (503) or declined (422): nothing was charged, the intention is kept
  const [aiError, setAiError] = useState<"unavailable" | "refused" | null>(null);
  const [readingResult, setReadingResult] = useState<ReadingResult | null>(null);
  const [revealedCards, setRevealedCards] = useState<number[]>([]);
  const [allRevealed, setAllRevealed] = useState(false);
  // «Voltear todas»: todas las cartas pasan a revelada (cada una avisa al terminar de quemarse)
  const [revealAll, setRevealAll] = useState(false);
  const [userCredits, setUserCredits] = useState<number>(0);
  const [freeReadings, setFreeReadings] = useState<number>(0);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [streakReward, setStreakReward] = useState<StreakRewardInfo | null>(null);
  const [showStreakRewardModal, setShowStreakRewardModal] = useState(false);
  const [discoveredCards, setDiscoveredCards] = useState<DiscoveredCardInfo[]>([]);
  const [showDiscoveredModal, setShowDiscoveredModal] = useState(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievementInfo[]>([]);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [levelUpInfo, setLevelUpInfo] = useState<LevelUpInfo | null>(null);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [completedChallenges, setCompletedChallenges] = useState<CompletedChallengeInfo[]>([]);
  const [showChallengesModal, setShowChallengesModal] = useState(false);
  const [goldenCards, setGoldenCards] = useState<GoldenCardInfo[]>([]);
  const [showGoldenModal, setShowGoldenModal] = useState(false);
  // Barajar: los grabados de la mesa y la vuelta (cada vuelta se reacomodan)
  const [shuffleSlugs, setShuffleSlugs] = useState<string[]>([]);
  const [shuffleTurn, setShuffleTurn] = useState(0);

  const narrow = useMedia("(max-width: 639.98px)");
  // Each step opens at the top with the focus on its title (not on the first render)
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stepRendered = useRef(false);
  useEffect(() => {
    if (!stepRendered.current) {
      stepRendered.current = true;
      return;
    }
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  // Fetch spread type and user credits on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [spreadRes, creditsRes] = await Promise.all([
          fetch(`/api/spread-types/${spreadTypeId}`),
          fetch("/api/user/credits"),
        ]);

        if (!spreadRes.ok) throw new Error("Spread type not found");
        const spreadData = await spreadRes.json();
        setSpreadType(spreadData);

        if (creditsRes.ok) {
          const creditsData = await creditsRes.json();
          setUserCredits(creditsData.credits);
          setFreeReadings(creditsData.freeReadingsLeft);
        }
      } catch {
        setError(t("loadError"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [spreadTypeId, t]);

  // While shuffling the engravings rearrange every 700 ms (not with reduced motion)
  useEffect(() => {
    if (step !== "shuffling") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    const id = window.setInterval(() => {
      setShuffleSlugs((prev) => revolver(prev));
      setShuffleTurn((n) => n + 1);
    }, 700);
    return () => window.clearInterval(id);
  }, [step]);

  // A card finished revealing (tap, keyboard or «voltear todas»)
  const handleRevealCard = (position: number) => {
    setRevealedCards((prev) => (prev.includes(position) ? prev : [...prev, position]));
  };

  // When every card is revealed, half a second later the reading is complete (starts the modal chain)
  useEffect(() => {
    if (!readingResult || allRevealed || revealedCards.length !== readingResult.cards.length) return;
    const timer = setTimeout(() => setAllRevealed(true), 500);
    return () => clearTimeout(timer);
  }, [revealedCards, readingResult, allRevealed]);

  // Show golden cards modal after all cards are revealed (first in chain - most exciting!)
  useEffect(() => {
    if (allRevealed && goldenCards.length > 0 && !showGoldenModal && !showDiscoveredModal && !showAchievementsModal && !showLevelUpModal && !showChallengesModal && !showStreakRewardModal) {
      const timer = setTimeout(() => {
        setShowGoldenModal(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [allRevealed, goldenCards, showGoldenModal, showDiscoveredModal, showAchievementsModal, showLevelUpModal, showChallengesModal, showStreakRewardModal]);

  // Show discovered cards modal after golden cards modal is closed (second in chain)
  useEffect(() => {
    if (allRevealed && discoveredCards.length > 0 && goldenCards.length === 0 && !showGoldenModal && !showDiscoveredModal && !showAchievementsModal && !showLevelUpModal && !showChallengesModal && !showStreakRewardModal) {
      const timer = setTimeout(() => {
        setShowDiscoveredModal(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [allRevealed, discoveredCards, goldenCards.length, showGoldenModal, showDiscoveredModal, showAchievementsModal, showLevelUpModal, showChallengesModal, showStreakRewardModal]);

  // Show achievements modal after discovered cards modal is closed (third in chain)
  useEffect(() => {
    if (allRevealed && unlockedAchievements.length > 0 && goldenCards.length === 0 && discoveredCards.length === 0 && !showGoldenModal && !showDiscoveredModal && !showAchievementsModal && !showLevelUpModal && !showChallengesModal && !showStreakRewardModal) {
      const timer = setTimeout(() => {
        setShowAchievementsModal(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [allRevealed, unlockedAchievements, goldenCards.length, discoveredCards.length, showGoldenModal, showDiscoveredModal, showAchievementsModal, showLevelUpModal, showChallengesModal, showStreakRewardModal]);

  // Show level up modal after achievements modal is closed (fourth in chain)
  useEffect(() => {
    if (allRevealed && levelUpInfo && goldenCards.length === 0 && discoveredCards.length === 0 && unlockedAchievements.length === 0 && !showGoldenModal && !showDiscoveredModal && !showAchievementsModal && !showLevelUpModal && !showChallengesModal && !showStreakRewardModal) {
      const timer = setTimeout(() => {
        setShowLevelUpModal(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [allRevealed, levelUpInfo, goldenCards.length, discoveredCards.length, unlockedAchievements.length, showGoldenModal, showDiscoveredModal, showAchievementsModal, showLevelUpModal, showChallengesModal, showStreakRewardModal]);

  // Show challenges modal after level up modal is closed (fifth in chain)
  useEffect(() => {
    if (allRevealed && completedChallenges.length > 0 && goldenCards.length === 0 && discoveredCards.length === 0 && unlockedAchievements.length === 0 && !levelUpInfo && !showGoldenModal && !showDiscoveredModal && !showAchievementsModal && !showLevelUpModal && !showChallengesModal && !showStreakRewardModal) {
      const timer = setTimeout(() => {
        setShowChallengesModal(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [allRevealed, completedChallenges, goldenCards.length, discoveredCards.length, unlockedAchievements.length, levelUpInfo, showGoldenModal, showDiscoveredModal, showAchievementsModal, showLevelUpModal, showChallengesModal, showStreakRewardModal]);

  // Show streak reward modal after challenges modal is closed (sixth in chain)
  useEffect(() => {
    if (allRevealed && streakReward && goldenCards.length === 0 && discoveredCards.length === 0 && unlockedAchievements.length === 0 && !levelUpInfo && completedChallenges.length === 0 && !showGoldenModal && !showDiscoveredModal && !showAchievementsModal && !showLevelUpModal && !showChallengesModal && !showStreakRewardModal) {
      const timer = setTimeout(() => {
        setShowStreakRewardModal(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [allRevealed, streakReward, goldenCards.length, discoveredCards.length, unlockedAchievements.length, levelUpInfo, completedChallenges.length, showGoldenModal, showDiscoveredModal, showAchievementsModal, showLevelUpModal, showChallengesModal, showStreakRewardModal]);

  // Check if user can afford the reading
  const canAffordReading = freeReadings > 0 || userCredits >= (spreadType?.creditCost || 0);

  const handleStartReading = async () => {
    if (intention.length < 10) {
      setError(t("intentionTooShort"));
      return;
    }

    // Check credits before starting
    if (!canAffordReading) {
      setShowCreditsModal(true);
      return;
    }

    setError("");
    setAiError(null);
    setIsSubmitting(true);
    setShuffleSlugs(revolver(CARTAS.map((c) => c.slug)).slice(0, GRABADOS_AL_BARAJAR));
    setStep("shuffling");

    // Simulate shuffling animation
    await new Promise((resolve) => setTimeout(resolve, 2500));

    try {
      const res = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadTypeId, intention, locale }),
      });

      // A 502/504 from Vercel comes as plain text, not JSON: never let parsing throw.
      const data = await res.json().catch(() => null);

      if (res.status === 503 || res.status === 422) {
        setAiError(res.status === 503 ? "unavailable" : "refused");
        setStep("intention");
        return;
      }

      if (res.status === 403) {
        // Lost the race for the last credits: offer to buy instead of showing a raw server string
        setShowCreditsModal(true);
        setStep("intention");
        return;
      }

      if (!res.ok || !data) {
        throw new Error(data?.error || t("createError"));
      }

      setReadingResult(data);
      setStep("revealing");

      // Check if there are newly discovered cards
      if (data.newlyDiscoveredCards?.length > 0) {
        setDiscoveredCards(data.newlyDiscoveredCards);
      }

      // Check if there are newly unlocked achievements
      if (data.unlockedAchievements?.length > 0) {
        setUnlockedAchievements(data.unlockedAchievements);
      }

      // Check if there's a streak reward to show
      if (data.streak?.reward) {
        setStreakReward(data.streak.reward);
      }

      // Check if user leveled up
      if (data.levelUp) {
        setLevelUpInfo(data.levelUp);
      }

      // Check if any challenges were completed
      if (data.completedChallenges?.length > 0) {
        setCompletedChallenges(data.completedChallenges);
      }

      // Check if any golden cards were found
      if (data.goldenCards?.length > 0) {
        setGoldenCards(data.goldenCards);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("createError"));
      setStep("intention");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLocalizedName = (item: { name: string; nameEs: string }) => {
    return locale === "en" ? item.name : item.nameEs;
  };

  const getLocalizedDescription = (item: { description: string; descriptionEs: string }) => {
    return locale === "en" ? item.description : item.descriptionEs;
  };

  if (isLoading) {
    return (
      <div role="status" aria-label={tCommon("loading")} className="grid max-w-[760px] gap-4">
        <div className="h-3 w-40 bg-papel-hondo motion-safe:animate-pulse" />
        <div className="h-12 w-2/3 bg-papel-hondo motion-safe:animate-pulse" />
        <div className="h-4 w-full max-w-md bg-papel-hondo motion-safe:animate-pulse" />
      </div>
    );
  }

  if (error && !spreadType) {
    return (
      <div className="grid max-w-[760px] justify-items-start gap-6">
        <Etiqueta>{t("selectSpread")}</Etiqueta>
        <h1 className="font-titulo text-[clamp(1.6rem,1.2rem+1.2vw,2.2rem)] leading-[1.1] text-letra-error">{error}</h1>
        <Link href="/reading/new" className={buttonClasses({ variant: "linea" })}>
          {t("backToSpreads")}
        </Link>
      </div>
    );
  }

  if (!spreadType) return null;

  const spreadName = getLocalizedName(spreadType);
  const cost = freeReadings > 0
    ? t("freeWithReading")
    : spreadType.creditCost !== 1
      ? t("costPlural", { count: spreadType.creditCost })
      : t("cost", { count: spreadType.creditCost });

  // The cards of the result in position order, with the name of each position
  const orderedCards = readingResult
    ? [...readingResult.cards].sort((a, b) => Number(a.position) - Number(b.position))
    : [];
  const spreadPositions: PosicionTirada[] = orderedCards.map((c) => ({
    numero: Number(c.position),
    nombre: c.positionInfo ? getLocalizedName(c.positionInfo) : t("position", { number: c.position }),
  }));
  // Small cards (short hint, smaller canvas) on phones and in the dense spreads
  const smallCards = narrow || orderedCards.length > 5;

  const nameUnder = (cardData: ReadingCard, visible: boolean) => (
    <p
      aria-hidden={!visible || undefined}
      className={cn("min-h-[2.3em]", nombreCarta, visible && "motion-safe:animate-entra")}
    >
      {visible && (
        <>
          {getLocalizedName(cardData.card)}
          {cardData.isReversed && (
            <span className="mt-1 block font-dato text-[0.625rem] leading-[1.4] tracking-[0.12em] text-letra-acento uppercase">
              {t("reversed")}
            </span>
          )}
        </>
      )}
    </p>
  );

  return (
    <div>
      {/* Step 1: Intention */}
      {step === "intention" && (
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          {/* The spread: what it is and its positions */}
          <div className="grid content-start gap-5">
            <Link
              href="/reading/new"
              className="inline-flex min-h-11 items-center gap-2 justify-self-start font-dato text-xs tracking-[0.1em] text-letra-suave uppercase hover:text-letra"
            >
              <span aria-hidden="true">←</span>
              {t("changeSpread")}
            </Link>
            <Etiqueta>
              {t("cards", { count: spreadType.cardCount })} · {cost}
            </Etiqueta>
            <h1 ref={headingRef} tabIndex={-1} className={cn(titulo1, "focus:outline-none")}>
              {spreadName}
            </h1>
            <p className="max-w-[46ch] text-letra-suave">{getLocalizedDescription(spreadType)}</p>
            <FiguraTirada total={spreadType.cardCount} nombreTirada={spreadType.name} className="text-letra" />
            <ol className="grid gap-1.5 border-t border-filete/20 pt-4 font-dato text-[0.6875rem] leading-[1.5] tracking-[0.1em] uppercase sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {[...spreadType.positions]
                .sort((a, b) => Number(a.position) - Number(b.position))
                .map((pos) => (
                  <li key={pos.position} className="break-words">
                    <span aria-hidden="true" className="text-letra-suave">
                      {numeroRomano(Number(pos.position))} ·{" "}
                    </span>
                    {getLocalizedName(pos)}
                  </li>
                ))}
            </ol>
          </div>

          {/* The intention, as a sheet */}
          <div className="grid content-start gap-4 border-t-[3px] border-rosa pt-6">
            <Pincel aria-hidden="true" className="text-[clamp(3.25rem,2rem+4vw,5.5rem)]">
              {t("ask")}
            </Pincel>
            <h2 className="font-titulo text-[clamp(1.6rem,1.2rem+1.2vw,2.2rem)] leading-[1.1]">
              <label htmlFor="intencion-lectura">{t("intentionTitle")}</label>
            </h2>
            <p id="intencion-ayuda" className="max-w-[60ch] text-letra-suave">
              {t("intentionSubtitle")}
            </p>

            <textarea
              id="intencion-lectura"
              aria-describedby="intencion-ayuda intencion-cuenta"
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              placeholder={t("intentionPlaceholder")}
              className="mt-2 block min-h-40 w-full resize-y rounded-none border-0 border-y border-filete/40 bg-transparent px-0 py-4 font-lectura text-[1.15rem] leading-[1.55] text-letra italic placeholder:text-letra-suave placeholder:not-italic focus:border-rosa focus:shadow-[0_1px_0_0_var(--color-rosa)] focus:outline-none sm:text-[1.25rem]"
            />

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <span id="intencion-cuenta" className="font-dato text-[0.6875rem] tracking-[0.06em] text-letra-suave">
                {t("intentionHint", { count: intention.length })}
              </span>
              {error && <span className="text-sm text-letra-error">{error}</span>}
            </div>

            {aiError && (
              <div role="alert" className="border-l-2 border-rosa bg-papel-hondo px-4 py-3">
                <p className="text-[0.9375rem] leading-[1.5]">
                  {aiError === "unavailable"
                    ? t("interpretationUnavailable")
                    : t("interpretationRefused")}
                </p>
              </div>
            )}

            <Button
              onClick={handleStartReading}
              disabled={intention.length < 10 || isSubmitting}
              isLoading={isSubmitting}
              className="mt-2 w-full"
              size="lg"
            >
              {aiError ? t("retry") : t("startReading")}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Shuffling — the engravings rearrange on a band of ink */}
      {step === "shuffling" && (
        <Escena suelo="tinta" as="div" className="barajar rounded-sm">
          <div key={shuffleTurn} className="barajar-mesa">
            <MesaDeGrabados slugs={shuffleSlugs} columnas={8} filas={2} />
          </div>
          <div role="status" className="barajar-texto grid max-w-[760px] gap-3 p-[clamp(20px,4vw,48px)]">
            <Etiqueta>{spreadName}</Etiqueta>
            <h1 ref={headingRef} tabIndex={-1} className={cn(titulo1, "focus:outline-none")}>
              {t("shuffling")}
            </h1>
            <p className="text-letra-suave">{t("shufflingSubtitle")}</p>
            <p className="mt-2 max-w-[46ch] border-l-2 border-rosa pl-4 font-lectura text-[1.1rem] leading-[1.45] break-words italic">
              {entreComillas(intention, locale)}
            </p>
          </div>
        </Escena>
      )}

      {/* Step 3: Revealing — the paper burns to show each card */}
      {step === "revealing" && readingResult && (
        <div className="grid gap-[clamp(28px,5vh,56px)]">
          <TransicionPincel />
          <header className="grid max-w-[760px] gap-3.5">
            <Etiqueta>
              {spreadName} · {t("cards", { count: orderedCards.length })}
            </Etiqueta>
            <h1 ref={headingRef} tabIndex={-1} className={cn(titulo1, "focus:outline-none")}>
              {t("revealing")}
            </h1>
            <p className="max-w-[46ch] border-l-2 border-rosa pl-[18px] font-lectura text-[clamp(1.15rem,1rem+0.5vw,1.4rem)] leading-[1.45] break-words italic">
              {entreComillas(readingResult.reading.intention, locale)}
            </p>
          </header>

          <Tirada
            posiciones={spreadPositions}
            nombreTirada={readingResult.reading.spreadType?.name ?? spreadType.name}
            etiqueta={t("cards", { count: orderedCards.length })}
            carta={(posicion, i) => {
              const cardData = orderedCards[i];
              const position = Number(cardData.position);
              return (
                <CartaQuemable
                  key={cardData.card.id}
                  carta={{ nombre: getLocalizedName(cardData.card), slug: slugCarta(cardData.card.name) }}
                  invertida={cardData.isReversed}
                  revelada={revealAll || revealedCards.includes(position)}
                  onRevelada={() => handleRevealCard(position)}
                  etiqueta={tCarta("voltearPosicion", { posicion: posicion.nombre })}
                  tamano={smallCards ? "chica" : "media"}
                  dorada={cardData.isGolden}
                  prioridad={i < 3}
                />
              );
            }}
            pie={(_, i) => nameUnder(orderedCards[i], revealedCards.includes(Number(orderedCards[i].position)))}
          />

          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            {/* One <button> (same key) that goes from «Voltear todas» to «Ver interpretación»: while the cards burn it
                is aria-disabled, not disabled (a disabled button drops the keyboard focus to <body>), so the focus
                stays on it and lands on «Ver interpretación» when the reading is complete. */}
            {allRevealed ? (
              <Button
                key="accion-tirada"
                onClick={() => setStep("interpretation")}
                size="lg"
                className="motion-safe:animate-entra"
              >
                {t("viewInterpretation")}
              </Button>
            ) : (
              <Button
                key="accion-tirada"
                variant="linea"
                aria-disabled={revealAll || undefined}
                onClick={() => {
                  if (!revealAll) setRevealAll(true);
                }}
                className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
              >
                {tCarta("voltearTodas")}
              </Button>
            )}
            <p className="grid gap-1 font-dato text-xs leading-[1.4] tracking-[0.06em]">
              <span aria-live="polite">
                {t("cardsRevealedCount", {
                  count: revealedCards.length,
                  total: orderedCards.length,
                })}
              </span>
              <span className="text-letra-suave">{allRevealed ? t("allCardsRevealed") : t("tapToReveal")}</span>
            </p>
          </div>
        </div>
      )}

      {/* Step 4: Interpretation */}
      {step === "interpretation" && readingResult && (
        <div className="grid gap-[clamp(32px,6vh,64px)]">
          <header className="grid max-w-[760px] gap-3.5">
            <Etiqueta>
              {getLocalizedName(readingResult.reading.spreadType ?? spreadType)} ·{" "}
              {new Date(readingResult.reading.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "es-MX", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Etiqueta>
            <h1 ref={headingRef} tabIndex={-1} className={cn(titulo1, "focus:outline-none")}>
              {t("yourReading")}
            </h1>
            <IntencionCita titulo={t("yourIntention")} intencion={readingResult.reading.intention} locale={locale} />
          </header>

          <Tirada
            compacta
            posiciones={spreadPositions}
            nombreTirada={readingResult.reading.spreadType?.name ?? spreadType.name}
            etiqueta={t("cardsRevealed")}
            carta={(_, i) => (
              <CartaFija
                carta={orderedCards[i].card}
                alt={getLocalizedName(orderedCards[i].card)}
                invertida={orderedCards[i].isReversed}
                dorada={orderedCards[i].isGolden}
              />
            )}
            pie={(_, i) => nameUnder(orderedCards[i], true)}
          />

          <Interpretacion titulo={t("interpretation")} texto={readingResult.reading.interpretation}>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href={`/reading/${readingResult.reading.id}`} className={buttonClasses({ variant: "linea" })}>
                {t("viewSaved")}
              </Link>
              <Link href="/reading/new" className={buttonClasses()}>
                {t("newReading")}
              </Link>
            </div>
          </Interpretacion>
        </div>
      )}

      {/* Credits Modal */}
      <Modal
        isOpen={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
      >
        <ModalHeader>
          <h2 className="font-titulo text-2xl leading-tight text-letra">{t("needCredits")}</h2>
        </ModalHeader>
        <ModalBody>
          <div className="grid gap-6">
            <div className="grid gap-2">
              <p className="font-lectura text-letra">
                {t("needCreditsMessage", { cost: spreadType?.creditCost })}
              </p>
              <p className="font-dato text-xs leading-[1.5] tracking-[0.06em] text-letra-suave">
                {t("currentCredits", { credits: userCredits })}
                {freeReadings > 0 && (
                  <> {t("andFreeReadings", { count: freeReadings })}</>
                )}
              </p>
            </div>

            <div className="grid gap-3">
              <Link href="/credits" className={buttonClasses({ size: "lg", className: "w-full" })}>
                {t("buyCredits")}
              </Link>
              <Button
                variant="fantasma"
                onClick={() => setShowCreditsModal(false)}
                className="w-full"
              >
                {tCommon("cancel")}
              </Button>
            </div>
          </div>
        </ModalBody>
      </Modal>

      {/* Golden Cards Modal */}
      {goldenCards.length > 0 && (
        <GoldenCardModal
          isOpen={showGoldenModal}
          onClose={() => {
            setShowGoldenModal(false);
            setGoldenCards([]);
            // Chain continues via useEffect
          }}
          cards={goldenCards}
        />
      )}

      {/* Discovered Cards Modal */}
      {discoveredCards.length > 0 && (
        <NewCardDiscoveredModal
          isOpen={showDiscoveredModal}
          onClose={() => {
            setShowDiscoveredModal(false);
            setDiscoveredCards([]);
            // Chain continues via useEffect
          }}
          cards={discoveredCards}
        />
      )}

      {/* Achievements Modal */}
      {unlockedAchievements.length > 0 && (
        <AchievementUnlockedModal
          isOpen={showAchievementsModal}
          onClose={() => {
            setShowAchievementsModal(false);
            setUnlockedAchievements([]);
            // Chain continues via useEffect
          }}
          achievements={unlockedAchievements}
        />
      )}

      {/* Level Up Modal */}
      {levelUpInfo && (
        <LevelUpModal
          isOpen={showLevelUpModal}
          onClose={() => {
            setShowLevelUpModal(false);
            setLevelUpInfo(null);
            // Chain continues via useEffect
          }}
          newLevel={levelUpInfo.newLevel}
          levelName={levelUpInfo.levelName}
          levelNameEs={levelUpInfo.levelNameEs}
          levelIcon={levelUpInfo.levelIcon}
          creditsAwarded={levelUpInfo.creditsAwarded}
        />
      )}

      {/* Challenges Completed Modal */}
      {completedChallenges.length > 0 && (
        <ChallengeCompletedModal
          isOpen={showChallengesModal}
          onClose={() => {
            setShowChallengesModal(false);
            setCompletedChallenges([]);
            // Chain continues via useEffect
          }}
          challenges={completedChallenges}
        />
      )}

      {/* Streak Reward Modal */}
      {streakReward && (
        <StreakRewardModal
          isOpen={showStreakRewardModal}
          onClose={() => {
            setShowStreakRewardModal(false);
            setStreakReward(null);
          }}
          milestone={streakReward.milestone}
          creditsAwarded={streakReward.creditsAwarded}
        />
      )}
    </div>
  );
}

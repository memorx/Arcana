"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Modal, ModalHeader, ModalBody, TarotCard, TarotCardStatic, CardBack } from "@/components/ui";
import { StreakRewardModal } from "@/components/dashboard/StreakRewardModal";

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
  imageUrl: string;
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
  card: CardData;
  positionInfo: PositionInfo;
}

interface StreakRewardInfo {
  milestone: number;
  creditsAwarded: number;
}

interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  reward: StreakRewardInfo | null;
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
}

type Step = "intention" | "shuffling" | "revealing" | "interpretation";

export default function ReadingFlowPage({
  params,
}: {
  params: Promise<{ spreadTypeId: string }>;
}) {
  const { spreadTypeId } = use(params);
  const router = useRouter();
  const t = useTranslations("reading");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [spreadType, setSpreadType] = useState<SpreadType | null>(null);
  const [step, setStep] = useState<Step>("intention");
  const [intention, setIntention] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [readingResult, setReadingResult] = useState<ReadingResult | null>(null);
  const [revealedCards, setRevealedCards] = useState<number[]>([]);
  const [allRevealed, setAllRevealed] = useState(false);
  const [userCredits, setUserCredits] = useState<number>(0);
  const [freeReadings, setFreeReadings] = useState<number>(0);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [streakReward, setStreakReward] = useState<StreakRewardInfo | null>(null);
  const [showStreakRewardModal, setShowStreakRewardModal] = useState(false);

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

  // Handle card revealing animation
  useEffect(() => {
    if (step === "revealing" && readingResult) {
      const positions = readingResult.cards.map((c) => c.position);
      let currentIndex = 0;

      // Reveal first card immediately
      if (positions.length > 0) {
        setRevealedCards([positions[0]]);
        currentIndex = 1;
      }

      // Reveal remaining cards with delay
      if (positions.length > 1) {
        const revealInterval = setInterval(() => {
          if (currentIndex < positions.length) {
            setRevealedCards((prev) => [...prev, positions[currentIndex]]);
            currentIndex++;
          } else {
            clearInterval(revealInterval);
            setTimeout(() => setAllRevealed(true), 500);
          }
        }, 800);

        return () => clearInterval(revealInterval);
      } else {
        setTimeout(() => setAllRevealed(true), 500);
      }
    }
  }, [step, readingResult]);

  // Show streak reward modal after all cards are revealed
  useEffect(() => {
    if (allRevealed && streakReward) {
      // Small delay for better UX
      const timer = setTimeout(() => {
        setShowStreakRewardModal(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [allRevealed, streakReward]);

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
    setIsSubmitting(true);
    setStep("shuffling");

    // Simulate shuffling animation
    await new Promise((resolve) => setTimeout(resolve, 2500));

    try {
      const res = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadTypeId, intention, locale }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("createError"));
      }

      setReadingResult(data);
      setStep("revealing");

      // Check if there's a streak reward to show
      if (data.streak?.reward) {
        setStreakReward(data.streak.reward);
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
      <div className="max-w-4xl mx-auto py-12 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-800 rounded w-1/3 mx-auto" />
          <div className="h-4 bg-slate-800 rounded w-2/3 mx-auto" />
        </div>
      </div>
    );
  }

  if (error && !spreadType) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <Link href="/reading/new">
          <Button variant="secondary">{t("backToSpreads")}</Button>
        </Link>
      </div>
    );
  }

  if (!spreadType) return null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step 1: Intention */}
      {step === "intention" && (
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center">
            <Link
              href="/reading/new"
              className="text-slate-400 hover:text-slate-300 text-sm mb-4 inline-flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t("changeSpread")}
            </Link>
            <h1 className="text-3xl font-bold text-slate-100 mt-2">
              {getLocalizedName(spreadType)}
            </h1>
            <p className="text-slate-400 mt-2">{t("cards", { count: spreadType.cardCount })}</p>
          </div>

          {/* Spread Info */}
          <Card>
            <CardContent className="p-6">
              <p className="text-slate-300 mb-4">{getLocalizedDescription(spreadType)}</p>
              <div className="flex flex-wrap gap-2">
                {spreadType.positions.map((pos) => (
                  <span
                    key={pos.position}
                    className="text-xs bg-slate-800 text-slate-400 px-3 py-1.5 rounded-full"
                  >
                    {pos.position}. {getLocalizedName(pos)}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Intention Form */}
          <Card variant="highlighted">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-amber-400">&#128161;</span>
                {t("intentionTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 text-sm mb-4">
                {t("intentionSubtitle")}
              </p>

              <textarea
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                placeholder={t("intentionPlaceholder")}
                className="w-full h-32 px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none"
              />

              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-slate-500">
                  {t("intentionHint", { count: intention.length })}
                </span>
                {error && <span className="text-xs text-red-400">{error}</span>}
              </div>

              <Button
                onClick={handleStartReading}
                disabled={intention.length < 10 || isSubmitting}
                isLoading={isSubmitting}
                className="w-full mt-4"
                size="lg"
              >
                {t("startReading")}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Shuffling */}
      {step === "shuffling" && (
        <div className="py-20 text-center space-y-8">
          <h2 className="text-2xl font-bold text-slate-100">
            {t("shuffling")}
          </h2>
          <p className="text-slate-400">
            {t("shufflingSubtitle")}
          </p>

          {/* Shuffling animation */}
          <div className="flex justify-center items-center gap-2 py-12">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-16 h-24 bg-gradient-to-br from-purple-800/50 to-purple-900/50 rounded-lg border border-purple-500/30 animate-bounce"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: "0.6s",
                }}
              >
                <div className="h-full flex items-center justify-center text-2xl text-purple-400/50">
                  &#10022;
                </div>
              </div>
            ))}
          </div>

          <p className="text-slate-500 text-sm italic">
            &quot;{intention}&quot;
          </p>
        </div>
      )}

      {/* Step 3: Revealing */}
      {step === "revealing" && readingResult && (
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-100 mb-2">
              {t("revealing")}
            </h2>
            <p className="text-slate-400">
              {allRevealed
                ? t("allRevealed")
                : t("revealingSubtitle")}
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {readingResult.cards.map((cardData) => {
              const isRevealed = revealedCards.includes(Number(cardData.position));

              return (
                <div
                  key={cardData.position}
                  className={`transition-all duration-500 ${
                    isRevealed ? "opacity-100 scale-100" : "opacity-0 scale-95"
                  }`}
                >
                  <Card className="overflow-hidden h-full">
                    <div className="bg-gradient-to-r from-purple-900/30 to-amber-900/20 px-4 py-2 border-b border-slate-800">
                      <p className="text-xs text-slate-400">
                        {t("position", { number: cardData.position })}
                      </p>
                      <p className="text-sm font-medium text-slate-200">
                        {cardData.positionInfo && getLocalizedName(cardData.positionInfo)}
                      </p>
                    </div>
                    <CardContent className="p-4 flex flex-col items-center">
                      {isRevealed ? (
                        <>
                          <TarotCardStatic
                            card={{
                              name: cardData.card.name,
                              nameEs: cardData.card.nameEs,
                              arcana: cardData.card.arcana as "MAJOR" | "MINOR",
                              suit: cardData.card.suit as "WANDS" | "CUPS" | "SWORDS" | "PENTACLES" | null,
                              number: parseInt(cardData.card.id.split("_").pop() || "0") || 0,
                              imageUrl: cardData.card.imageUrl,
                            }}
                            isReversed={cardData.isReversed}
                            showReversedBadge={false}
                            size="md"
                            locale={locale}
                            className="mb-3"
                          />
                          <div className="text-center">
                            <h3 className="font-semibold text-slate-100">
                              {getLocalizedName(cardData.card)}
                            </h3>
                            {cardData.isReversed && (
                              <Badge variant="warning" className="mt-1">
                                {t("reversed")}
                              </Badge>
                            )}
                          </div>
                        </>
                      ) : (
                        <CardBack className="w-20 h-[120px]" />
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>

          {allRevealed && (
            <div className="text-center pt-4">
              <Button onClick={() => setStep("interpretation")} size="lg">
                {t("viewInterpretation")}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Interpretation */}
      {step === "interpretation" && readingResult && (
        <div className="space-y-8">
          <div className="text-center">
            <Badge variant="primary" className="mb-2">
              {getLocalizedName(readingResult.reading.spreadType)}
            </Badge>
            <h1 className="text-3xl font-bold text-slate-100">
              {t("yourReading")}
            </h1>
          </div>

          {/* Intention */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-amber-400">&#10022;</span>
                {t("yourIntention")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 italic">
                &quot;{readingResult.reading.intention}&quot;
              </p>
            </CardContent>
          </Card>

          {/* Cards Summary */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {readingResult.cards.map((cardData) => (
                <Card key={cardData.position} className="overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-900/30 to-amber-900/20 px-4 py-2 border-b border-slate-800">
                    <p className="text-xs text-slate-400">
                      {cardData.positionInfo && getLocalizedName(cardData.positionInfo)}
                    </p>
                  </div>
                  <CardContent className="p-4 flex flex-col items-center">
                    <TarotCardStatic
                      card={{
                        name: cardData.card.name,
                        nameEs: cardData.card.nameEs,
                        arcana: cardData.card.arcana as "MAJOR" | "MINOR",
                        suit: cardData.card.suit as "WANDS" | "CUPS" | "SWORDS" | "PENTACLES" | null,
                        number: parseInt(cardData.card.id.split("_").pop() || "0") || 0,
                        imageUrl: cardData.card.imageUrl,
                      }}
                      isReversed={cardData.isReversed}
                      showReversedBadge={false}
                      size="sm"
                      locale={locale}
                      className="mb-2"
                    />
                    <div className="text-center">
                      <h3 className="font-medium text-slate-100 text-sm">
                        {getLocalizedName(cardData.card)}
                      </h3>
                      {cardData.isReversed && (
                        <span className="text-xs text-orange-400">{t("reversed")}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
            ))}
          </div>

          {/* Interpretation */}
          <Card variant="highlighted">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-amber-400">&#9788;</span>
                {t("interpretation")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-invert prose-slate max-w-none">
                {readingResult.reading.interpretation
                  .split("\n")
                  .map((paragraph, i) => (
                    <p key={i} className="text-slate-300 mb-4 last:mb-0 whitespace-pre-wrap">
                      {paragraph}
                    </p>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-center gap-4">
            <Link href={`/reading/${readingResult.reading.id}`}>
              <Button variant="secondary">{t("viewSaved")}</Button>
            </Link>
            <Link href="/reading/new">
              <Button>{t("newReading")}</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Credits Modal */}
      <Modal
        isOpen={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
      >
        <ModalHeader>
          <h2 className="text-xl font-bold text-slate-100">{t("needCredits")}</h2>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-amber-500/20 rounded-full flex items-center justify-center">
                <span className="text-3xl">&#128176;</span>
              </div>
              <p className="text-slate-300 mb-2">
                {t("needCreditsMessage", { cost: spreadType?.creditCost })}
              </p>
              <p className="text-slate-400 text-sm">
                {t("currentCredits", { credits: userCredits })}
                {freeReadings > 0 && (
                  <> {t("andFreeReadings", { count: freeReadings })}</>
                )}
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <Link href="/credits" className="w-full">
                <Button className="w-full" size="lg">
                  {t("buyCredits")}
                </Button>
              </Link>
              <Button
                variant="ghost"
                onClick={() => setShowCreditsModal(false)}
                className="w-full"
              >
                {tCommon("cancel")}
              </Button>
            </div>
          </div>
        </ModalBody>
      </Modal>

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

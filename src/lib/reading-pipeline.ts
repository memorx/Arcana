import type { Card, Prisma, Reading, SpreadType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { InsufficientCreditsError, spendCredits } from "@/lib/credits";
import { updateStreak, type StreakUpdateResult } from "@/lib/streak";
import { discoverCardsFromReading, type DiscoveredCard } from "@/lib/collection";
import { checkAndUnlockAchievements, type UnlockedAchievement } from "@/lib/achievements";
import { addXP } from "@/lib/xp";
import { getXPForReading, XP_REWARDS } from "@/lib/levels";
import { updateChallengeProgress, type CompletedChallenge } from "@/lib/challenges";
import { rollForGoldenCard, processGoldenCards, type GoldenCardInfo } from "@/lib/golden-cards";

/**
 * The reading flow shared by every route that creates a reading:
 * draw → (interpret) → chargeAndCreateReading → finalizeReading → buildReadingResponse.
 * The AI call happens between drawing and charging, so a failed interpretation
 * never costs the user anything.
 */

export interface ReadingCardDraw {
  position: number;
  cardId: string;
  isReversed: boolean;
  isGolden: boolean;
}

/** Chance that a drawn card comes out reversed. */
export const REVERSED_PROBABILITY = 0.3;

/**
 * Draws `count` distinct cards. Positions are 1..count in draw order; each card is
 * reversed with REVERSED_PROBABILITY and golden with the golden-card odds
 * (rolled server-side) unless `allowGolden` is false.
 */
export function drawCards(
  allCards: { id: string }[],
  count: number,
  opts: { allowGolden?: boolean } = {}
): ReadingCardDraw[] {
  const allowGolden = opts.allowGolden ?? true;

  if (!Number.isInteger(count) || count < 0 || count > allCards.length) {
    throw new RangeError(`Cannot draw ${count} cards from a deck of ${allCards.length}`);
  }

  // Partial Fisher–Yates: uniform and without repeats.
  const deck = [...allCards];
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(Math.random() * (deck.length - i));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck.slice(0, count).map((card, index) => ({
    position: index + 1,
    cardId: card.id,
    isReversed: Math.random() < REVERSED_PROBABILITY,
    isGolden: allowGolden ? rollForGoldenCard() : false,
  }));
}

/**
 * One transaction: creates the reading and charges for it.
 * A free reading is used first if one is left (conditional decrement); otherwise the
 * spread's cost is debited with spendCredits. If neither goes through it throws
 * InsufficientCreditsError and the transaction (including the reading) rolls back.
 */
export async function chargeAndCreateReading(opts: {
  userId: string;
  spreadType: SpreadType;
  intention: string;
  readingCards: ReadingCardDraw[];
  interpretation: string;
  source?: "app" | "manual";
}): Promise<{ reading: Reading & { spreadType: SpreadType }; usedFreeReading: boolean }> {
  const { userId, spreadType, intention, readingCards, interpretation, source = "app" } = opts;

  return prisma.$transaction(async (tx) => {
    const free = await tx.user.updateMany({
      where: { id: userId, freeReadingsLeft: { gt: 0 } },
      data: { freeReadingsLeft: { decrement: 1 } },
    });
    const usedFreeReading = free.count > 0;

    const reading = await tx.reading.create({
      data: {
        userId,
        spreadTypeId: spreadType.id,
        intention,
        cards: readingCards as unknown as Prisma.InputJsonValue,
        interpretation,
        source,
      },
      include: { spreadType: true },
    });

    if (!usedFreeReading) {
      const paid = await spendCredits(tx, userId, spreadType.creditCost, "READING", {
        readingId: reading.id,
      });
      if (!paid) throw new InsufficientCreditsError();
    }

    return { reading, usedFreeReading };
  });
}

export interface ReadingLevelUp {
  newLevel: number;
  levelName: string;
  levelNameEs: string;
  levelIcon: string;
  creditsAwarded: number;
}

export interface ReadingExtras {
  streak: StreakUpdateResult | null;
  goldenCards: GoldenCardInfo[];
  newlyDiscoveredCards: Array<DiscoveredCard & { isReversed: boolean }>;
  unlockedAchievements: UnlockedAchievement[];
  levelUp: ReadingLevelUp | null;
  completedChallenges: CompletedChallenge[];
}

/**
 * Everything that happens after a reading is saved: streak, golden cards, collection,
 * achievements, XP and challenges. Each step is isolated; a failure is logged and the
 * reading still succeeds.
 */
export async function finalizeReading(opts: {
  userId: string;
  readingId: string;
  readingCards: ReadingCardDraw[];
  spreadType: SpreadType;
}): Promise<ReadingExtras> {
  const { userId, readingId, readingCards, spreadType } = opts;

  // The previous reading date, read BEFORE updateStreak moves it to now: it decides
  // whether this reading opens a new streak day (XP bonus below). undefined = unknown.
  let lastReadingDateBefore: Date | null | undefined;
  try {
    const userBefore = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastReadingDate: true },
    });
    lastReadingDateBefore = userBefore ? userBefore.lastReadingDate : undefined;
  } catch (error) {
    console.error("Error reading the last reading date:", error);
  }

  // Update user streak
  let streak: StreakUpdateResult | null = null;
  try {
    streak = await updateStreak(userId);
  } catch (error) {
    console.error("Error updating streak:", error);
  }

  // Process golden cards
  let goldenCards: GoldenCardInfo[] = [];
  try {
    const goldenCardIds = readingCards.filter((rc) => rc.isGolden).map((rc) => rc.cardId);
    if (goldenCardIds.length > 0) {
      goldenCards = await processGoldenCards(userId, goldenCardIds, readingId);
    }
  } catch (error) {
    console.error("Error processing golden cards:", error);
  }

  // Discover new cards for the collection
  let newlyDiscoveredCards: Array<DiscoveredCard & { isReversed: boolean }> = [];
  try {
    const cardIds = readingCards.map((rc) => rc.cardId);
    const discoveredCards = await discoverCardsFromReading(userId, cardIds);
    newlyDiscoveredCards = discoveredCards.map((card) => {
      const readingCard = readingCards.find((rc) => rc.cardId === card.id);
      return { ...card, isReversed: readingCard?.isReversed ?? false };
    });
  } catch (error) {
    console.error("Error discovering cards:", error);
  }

  // Newly unlocked achievements
  let unlockedAchievements: UnlockedAchievement[] = [];
  try {
    unlockedAchievements = await checkAndUnlockAchievements(userId);
  } catch (error) {
    console.error("Error checking achievements:", error);
  }

  // XP and level up
  let levelUp: ReadingLevelUp | null = null;
  try {
    let totalXP = getXPForReading(spreadType.cardCount);
    totalXP += newlyDiscoveredCards.length * XP_REWARDS.NEW_CARD;
    totalXP += unlockedAchievements.length * XP_REWARDS.ACHIEVEMENT;

    // XP for streak continuation, only on a new streak day (same local-day rule as updateStreak).
    // If the previous date couldn't be read, no bonus rather than a possible double one.
    if (streak && streak.currentStreak > 1 && lastReadingDateBefore !== undefined) {
      const isNewStreakDay =
        !lastReadingDateBefore ||
        new Date(lastReadingDateBefore).toDateString() !== new Date().toDateString();

      if (isNewStreakDay) {
        totalXP += XP_REWARDS.STREAK_DAY;
      }
    }

    const xpResult = await addXP(userId, totalXP, "reading_completion");
    if (xpResult.levelUp) {
      levelUp = {
        newLevel: xpResult.levelUp.newLevel,
        levelName: xpResult.levelUp.levelDefinition.name,
        levelNameEs: xpResult.levelUp.levelDefinition.nameEs,
        levelIcon: xpResult.levelUp.levelDefinition.icon,
        creditsAwarded: xpResult.levelUp.creditsAwarded,
      };
    }
  } catch (error) {
    console.error("Error awarding XP:", error);
  }

  // Challenge progress
  let completedChallenges: CompletedChallenge[] = [];
  try {
    completedChallenges.push(...(await updateChallengeProgress(userId, "reading_completed")));

    completedChallenges.push(
      ...(await updateChallengeProgress(userId, "spread_used", {
        spreadTypeId: spreadType.id,
        spreadName: spreadType.name,
      }))
    );

    if (newlyDiscoveredCards.length > 0) {
      completedChallenges.push(
        ...(await updateChallengeProgress(userId, "cards_discovered", {
          cardsDiscovered: newlyDiscoveredCards.length,
        }))
      );
    }

    if (streak) {
      completedChallenges.push(
        ...(await updateChallengeProgress(userId, "streak_updated", {
          currentStreak: streak.currentStreak,
        }))
      );
    }

    // Remove duplicates (same challenge completed by more than one action)
    completedChallenges = completedChallenges.filter(
      (c, i, arr) => arr.findIndex((x) => x.id === c.id) === i
    );
  } catch (error) {
    console.error("Error updating challenges:", error);
  }

  return {
    streak,
    goldenCards,
    newlyDiscoveredCards,
    unlockedAchievements,
    levelUp,
    completedChallenges,
  };
}

export interface SpreadPosition {
  position: number;
  name: string;
  nameEs: string;
  description: string;
}

type CardDetails = Pick<
  Card,
  "id" | "name" | "nameEs" | "arcana" | "suit" | "keywords" | "meaningUpright" | "meaningReversed" | "imageUrl"
>;

/**
 * JSON body returned by POST /api/reading (and any route that creates a reading
 * the same way). The reading page depends on this exact shape.
 */
export function buildReadingResponse(opts: {
  reading: Reading & { spreadType: SpreadType };
  readingCards: ReadingCardDraw[];
  cards: CardDetails[];
  positions: SpreadPosition[];
  usedFreeReading: boolean;
  extras: ReadingExtras;
}) {
  const { reading, readingCards, cards, positions, usedFreeReading, extras } = opts;

  const cardsWithDetails = readingCards.map((rc) => {
    const card = cards.find((c) => c.id === rc.cardId)!;
    const positionInfo = positions.find((p) => p.position === rc.position)!;

    return {
      ...rc,
      card: {
        id: card.id,
        name: card.name,
        nameEs: card.nameEs,
        arcana: card.arcana,
        suit: card.suit,
        keywords: card.keywords,
        meaningUpright: card.meaningUpright,
        meaningReversed: card.meaningReversed,
        imageUrl: card.imageUrl,
      },
      positionInfo,
    };
  });

  return {
    reading: {
      id: reading.id,
      intention: reading.intention,
      interpretation: reading.interpretation,
      createdAt: reading.createdAt,
      spreadType: reading.spreadType,
    },
    cards: cardsWithDetails,
    usedFreeReading,
    streak: extras.streak,
    newlyDiscoveredCards: extras.newlyDiscoveredCards,
    goldenCards: extras.goldenCards, // Golden cards found in this reading
    unlockedAchievements: extras.unlockedAchievements,
    levelUp: extras.levelUp,
    completedChallenges: extras.completedChallenges,
  };
}

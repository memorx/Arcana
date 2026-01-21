import { prisma } from "@/lib/prisma";

// Golden card probability (1%)
export const GOLDEN_CARD_PROBABILITY = 0.01;

// Credits awarded for getting a golden card
export const GOLDEN_CARD_CREDITS_REWARD = 3;

export interface GoldenCardInfo {
  id: string;
  name: string;
  nameEs: string;
  imageUrl: string;
  arcana: string;
  suit: string | null;
  isNew: boolean; // Whether this is the first time user gets this card as golden
  creditsAwarded: number;
}

/**
 * Check if a card should be golden (1% probability)
 * Must be called server-side to prevent manipulation
 */
export function rollForGoldenCard(): boolean {
  return Math.random() < GOLDEN_CARD_PROBABILITY;
}

/**
 * Process golden cards from a reading
 * - Discovers new golden cards for collection
 * - Awards credits
 * - Updates user's golden card count
 * Returns info about golden cards found
 */
export async function processGoldenCards(
  userId: string,
  goldenCardIds: string[],
  readingId: string
): Promise<GoldenCardInfo[]> {
  if (goldenCardIds.length === 0) {
    return [];
  }

  // Get existing golden card collection
  const existingGoldenCards = await prisma.userGoldenCardCollection.findMany({
    where: {
      userId,
      cardId: { in: goldenCardIds },
    },
    select: { cardId: true },
  });

  const existingGoldenCardIds = new Set(existingGoldenCards.map((c) => c.cardId));
  const newGoldenCardIds = goldenCardIds.filter((id) => !existingGoldenCardIds.has(id));

  // Get card details
  const goldenCards = await prisma.card.findMany({
    where: { id: { in: goldenCardIds } },
    select: {
      id: true,
      name: true,
      nameEs: true,
      imageUrl: true,
      arcana: true,
      suit: true,
    },
  });

  // Calculate total credits to award (3 per golden card)
  const totalCredits = goldenCardIds.length * GOLDEN_CARD_CREDITS_REWARD;

  // Update database in a transaction
  await prisma.$transaction(async (tx) => {
    // Add new golden cards to collection
    if (newGoldenCardIds.length > 0) {
      await tx.userGoldenCardCollection.createMany({
        data: newGoldenCardIds.map((cardId) => ({
          userId,
          cardId,
          readingId,
        })),
        skipDuplicates: true,
      });
    }

    // Award credits
    await tx.user.update({
      where: { id: userId },
      data: {
        credits: { increment: totalCredits },
        goldenCardsCount: { increment: goldenCardIds.length },
      },
    });

    // Create credit transactions for the bonus
    await tx.creditTransaction.create({
      data: {
        userId,
        amount: totalCredits,
        type: "BONUS",
      },
    });
  });

  // Return golden card info
  return goldenCards.map((card) => ({
    ...card,
    isNew: newGoldenCardIds.includes(card.id),
    creditsAwarded: GOLDEN_CARD_CREDITS_REWARD,
  }));
}

/**
 * Get user's golden card collection stats
 */
export async function getGoldenCollectionStats(userId: string): Promise<{
  discovered: number;
  total: number;
  percentage: number;
  totalGoldenCardsFound: number;
}> {
  const [user, uniqueGoldenCards, totalCards] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { goldenCardsCount: true },
    }),
    prisma.userGoldenCardCollection.count({ where: { userId } }),
    prisma.card.count(),
  ]);

  return {
    discovered: uniqueGoldenCards,
    total: totalCards,
    percentage: totalCards > 0 ? Math.round((uniqueGoldenCards / totalCards) * 100) : 0,
    totalGoldenCardsFound: user?.goldenCardsCount ?? 0,
  };
}

/**
 * Get user's golden card collection with card details
 */
export async function getUserGoldenCollection(userId: string): Promise<{
  goldenCardIds: Set<string>;
  totalGoldenCardsFound: number;
}> {
  const [collection, user] = await Promise.all([
    prisma.userGoldenCardCollection.findMany({
      where: { userId },
      select: { cardId: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { goldenCardsCount: true },
    }),
  ]);

  return {
    goldenCardIds: new Set(collection.map((c) => c.cardId)),
    totalGoldenCardsFound: user?.goldenCardsCount ?? 0,
  };
}

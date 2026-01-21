import { prisma } from "@/lib/prisma";

export interface DiscoveredCard {
  id: string;
  name: string;
  nameEs: string;
  imageUrl: string;
  arcana: string;
  suit: string | null;
  keywords: string[];
  meaningUpright: string;
  meaningReversed: string;
  meaningUprightEn: string | null;
  meaningReversedEn: string | null;
}

/**
 * Process cards from a reading and discover new ones for the user's collection
 * Returns list of newly discovered cards
 */
export async function discoverCardsFromReading(
  userId: string,
  cardIds: string[]
): Promise<DiscoveredCard[]> {
  // Get user's existing collection
  const existingCollection = await prisma.userCardCollection.findMany({
    where: {
      userId,
      cardId: { in: cardIds },
    },
    select: { cardId: true },
  });

  const existingCardIds = new Set(existingCollection.map((c) => c.cardId));
  const newCardIds = cardIds.filter((id) => !existingCardIds.has(id));

  if (newCardIds.length === 0) {
    return [];
  }

  // Get card details for newly discovered cards
  const newCards = await prisma.card.findMany({
    where: { id: { in: newCardIds } },
    select: {
      id: true,
      name: true,
      nameEs: true,
      imageUrl: true,
      arcana: true,
      suit: true,
      keywords: true,
      meaningUpright: true,
      meaningReversed: true,
      meaningUprightEn: true,
      meaningReversedEn: true,
    },
  });

  // Add new cards to collection
  await prisma.userCardCollection.createMany({
    data: newCardIds.map((cardId) => ({
      userId,
      cardId,
    })),
    skipDuplicates: true, // Safety in case of race conditions
  });

  return newCards;
}

/**
 * Get user's collection stats
 */
export async function getCollectionStats(userId: string): Promise<{
  discovered: number;
  total: number;
  percentage: number;
}> {
  const [discovered, total] = await Promise.all([
    prisma.userCardCollection.count({ where: { userId } }),
    prisma.card.count(),
  ]);

  return {
    discovered,
    total,
    percentage: total > 0 ? Math.round((discovered / total) * 100) : 0,
  };
}

export interface RecentlyDiscoveredCard {
  id: string;
  name: string;
  nameEs: string;
  imageUrl: string;
  arcana: string;
  suit: string | null;
}

/**
 * Get user's recently discovered cards
 */
export async function getRecentlyDiscovered(
  userId: string,
  limit: number = 3
): Promise<RecentlyDiscoveredCard[]> {
  const recent = await prisma.userCardCollection.findMany({
    where: { userId },
    orderBy: { discoveredAt: "desc" },
    take: limit,
    include: {
      card: {
        select: {
          id: true,
          name: true,
          nameEs: true,
          imageUrl: true,
          arcana: true,
          suit: true,
        },
      },
    },
  });

  return recent.map((r) => r.card);
}

/**
 * Get user's full collection with card details
 */
export async function getUserCollection(userId: string): Promise<{
  discoveredCardIds: Set<string>;
  allCards: Array<{
    id: string;
    name: string;
    nameEs: string;
    slug: string | null;
    imageUrl: string;
    arcana: string;
    suit: string | null;
    number: number;
  }>;
}> {
  const [collection, allCards] = await Promise.all([
    prisma.userCardCollection.findMany({
      where: { userId },
      select: { cardId: true },
    }),
    prisma.card.findMany({
      select: {
        id: true,
        name: true,
        nameEs: true,
        slug: true,
        imageUrl: true,
        arcana: true,
        suit: true,
        number: true,
      },
      orderBy: [
        { arcana: "desc" }, // MAJOR first
        { suit: "asc" },
        { number: "asc" },
      ],
    }),
  ]);

  return {
    discoveredCardIds: new Set(collection.map((c) => c.cardId)),
    allCards,
  };
}

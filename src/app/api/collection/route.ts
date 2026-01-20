import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserCollection, getCollectionStats, getRecentlyDiscovered } from "@/lib/collection";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [{ discoveredCardIds, allCards }, stats, recentlyDiscovered] = await Promise.all([
      getUserCollection(session.user.id),
      getCollectionStats(session.user.id),
      getRecentlyDiscovered(session.user.id, 3),
    ]);

    return NextResponse.json({
      cards: allCards.map((card) => ({
        ...card,
        isDiscovered: discoveredCardIds.has(card.id),
      })),
      stats,
      recentlyDiscovered,
    });
  } catch (error) {
    console.error("Error fetching collection:", error);
    return NextResponse.json(
      { error: "Error fetching collection" },
      { status: 500 }
    );
  }
}

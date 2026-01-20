import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTarotInterpretation } from "@/lib/anthropic";
import { updateStreak } from "@/lib/streak";
import { discoverCardsFromReading } from "@/lib/collection";
import { checkAndUnlockAchievements } from "@/lib/achievements";
import { addXP, type LevelUpResult } from "@/lib/xp";
import { getXPForReading, XP_REWARDS } from "@/lib/levels";
import { updateChallengeProgress, type CompletedChallenge } from "@/lib/challenges";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Rate limit: 5 readings per minute per user
  const { success, resetIn } = rateLimit(req, 5, 60000);
  if (!success) {
    return rateLimitResponse(resetIn);
  }

  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { spreadTypeId, intention, locale = "es" } = await req.json();

    // Validate input
    if (!spreadTypeId || !intention) {
      return NextResponse.json(
        { error: "spreadTypeId and intention are required" },
        { status: 400 }
      );
    }

    if (intention.length < 10) {
      return NextResponse.json(
        { error: "Intention must be at least 10 characters" },
        { status: 400 }
      );
    }

    // Get user and spread type
    const [user, spreadType] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, freeReadingsLeft: true, credits: true },
      }),
      prisma.spreadType.findUnique({
        where: { id: spreadTypeId },
      }),
    ]);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!spreadType) {
      return NextResponse.json(
        { error: "Spread type not found" },
        { status: 404 }
      );
    }

    // Check if user can afford the reading
    const useFreeReading = user.freeReadingsLeft > 0;
    const canAfford = useFreeReading || user.credits >= spreadType.creditCost;

    if (!canAfford) {
      return NextResponse.json(
        { error: "Not enough credits for this reading" },
        { status: 403 }
      );
    }

    // Get all cards from database
    const allCards = await prisma.card.findMany();

    // Randomly select cards for the spread
    const shuffled = [...allCards].sort(() => Math.random() - 0.5);
    const selectedCards = shuffled.slice(0, spreadType.cardCount);

    // Determine reversed status for each card (30% probability)
    const readingCards = selectedCards.map((card, index) => ({
      position: index + 1,
      cardId: card.id,
      isReversed: Math.random() < 0.3,
    }));

    // Get position information
    const positions = spreadType.positions as Array<{
      position: number;
      name: string;
      nameEs: string;
      description: string;
    }>;

    // Prepare cards for interpretation (simplified - Claude knows tarot deeply)
    const cardsForInterpretation = readingCards.map((rc) => {
      const card = selectedCards.find((c) => c.id === rc.cardId)!;
      const position = positions.find((p) => p.position === rc.position)!;

      return {
        position: rc.position,
        positionName: locale === "en" ? position.name : position.nameEs,
        positionDescription: position.description,
        cardName: locale === "en" ? card.name : card.nameEs,
        isReversed: rc.isReversed,
      };
    });

    // Generate interpretation using Claude
    let interpretation: string;
    try {
      interpretation = await generateTarotInterpretation({
        spreadName: locale === "en" ? spreadType.name : spreadType.nameEs,
        intention,
        cards: cardsForInterpretation,
        locale,
      });
    } catch (error) {
      console.error("Error generating interpretation:", error);
      // Fallback interpretation if API fails
      const spreadDisplayName = locale === "en" ? spreadType.name : spreadType.nameEs;
      interpretation = locale === "en"
        ? `Your ${spreadDisplayName} reading has been completed.\n\nCards revealed:\n${cardsForInterpretation
            .map(
              (c) =>
                `- Position ${c.position} (${c.positionName}): ${c.cardName}${c.isReversed ? " (Reversed)" : ""}`
            )
            .join("\n")}\n\nDetailed interpretation is not available at this time. Please reflect on the meaning of each card in relation to your question: "${intention}"`
        : `Tu lectura de ${spreadDisplayName} ha sido completada.\n\nCartas reveladas:\n${cardsForInterpretation
            .map(
              (c) =>
                `- Posicion ${c.position} (${c.positionName}): ${c.cardName}${c.isReversed ? " (Invertida)" : ""}`
            )
            .join("\n")}\n\nLa interpretacion detallada no esta disponible en este momento. Por favor, reflexiona sobre el significado de cada carta en relacion a tu pregunta: "${intention}"`;
    }

    // Create reading and update user in a transaction
    const reading = await prisma.$transaction(async (tx) => {
      // Create the reading
      const newReading = await tx.reading.create({
        data: {
          userId: user.id,
          spreadTypeId: spreadType.id,
          intention,
          cards: readingCards,
          interpretation,
        },
        include: {
          spreadType: true,
        },
      });

      // Update user credits/free readings
      if (useFreeReading) {
        await tx.user.update({
          where: { id: user.id },
          data: { freeReadingsLeft: { decrement: 1 } },
        });
      } else {
        await tx.user.update({
          where: { id: user.id },
          data: { credits: { decrement: spreadType.creditCost } },
        });

        // Create credit transaction
        await tx.creditTransaction.create({
          data: {
            userId: user.id,
            amount: -spreadType.creditCost,
            type: "READING",
            readingId: newReading.id,
          },
        });
      }

      return newReading;
    });

    // Update user streak (non-blocking, don't fail if this errors)
    let streakInfo: {
      currentStreak: number;
      longestStreak: number;
      reward: { milestone: number; creditsAwarded: number } | null;
    } | null = null;
    try {
      streakInfo = await updateStreak(user.id);
    } catch (error) {
      console.error("Error updating streak:", error);
    }

    // Discover new cards for collection (non-blocking)
    let newlyDiscoveredCards: Array<{
      id: string;
      name: string;
      nameEs: string;
      imageUrl: string;
      arcana: string;
      suit: string | null;
    }> = [];
    try {
      const cardIds = readingCards.map((rc) => rc.cardId);
      newlyDiscoveredCards = await discoverCardsFromReading(user.id, cardIds);
    } catch (error) {
      console.error("Error discovering cards:", error);
    }

    // Check for newly unlocked achievements (non-blocking)
    let unlockedAchievements: Array<{
      id: string;
      key: string;
      name: string;
      nameEs: string;
      description: string;
      descriptionEs: string;
      icon: string;
      category: string;
      creditReward: number;
    }> = [];
    try {
      unlockedAchievements = await checkAndUnlockAchievements(user.id);
    } catch (error) {
      console.error("Error checking achievements:", error);
    }

    // Calculate and award XP (non-blocking)
    let levelUp: LevelUpResult | null = null;
    try {
      // Calculate total XP from this reading
      let totalXP = getXPForReading(spreadType.cardCount);

      // Add XP for newly discovered cards
      totalXP += newlyDiscoveredCards.length * XP_REWARDS.NEW_CARD;

      // Add XP for unlocked achievements
      totalXP += unlockedAchievements.length * XP_REWARDS.ACHIEVEMENT;

      // Add XP for streak continuation (only if streak increased)
      if (streakInfo && streakInfo.currentStreak > 1) {
        // Check if this is a new streak day (not same day reading)
        const userBefore = await prisma.user.findUnique({
          where: { id: user.id },
          select: { lastReadingDate: true },
        });
        const lastDate = userBefore?.lastReadingDate;
        const today = new Date();
        const isNewStreakDay = !lastDate ||
          new Date(lastDate).toDateString() !== today.toDateString();

        if (isNewStreakDay && streakInfo.currentStreak > 1) {
          totalXP += XP_REWARDS.STREAK_DAY;
        }
      }

      // Award XP and check for level up
      const xpResult = await addXP(user.id, totalXP, "reading_completion");
      levelUp = xpResult.levelUp;
    } catch (error) {
      console.error("Error awarding XP:", error);
    }

    // Update challenge progress (non-blocking)
    let completedChallenges: CompletedChallenge[] = [];
    try {
      // Update for reading completed
      const readingChallenges = await updateChallengeProgress(user.id, "reading_completed");
      completedChallenges.push(...readingChallenges);

      // Update for spread type used
      const spreadChallenges = await updateChallengeProgress(user.id, "spread_used", {
        spreadTypeId: spreadType.id,
        spreadName: spreadType.name,
      });
      completedChallenges.push(...spreadChallenges);

      // Update for cards discovered
      if (newlyDiscoveredCards.length > 0) {
        const cardChallenges = await updateChallengeProgress(user.id, "cards_discovered", {
          cardsDiscovered: newlyDiscoveredCards.length,
        });
        completedChallenges.push(...cardChallenges);
      }

      // Update for streak
      if (streakInfo) {
        const streakChallenges = await updateChallengeProgress(user.id, "streak_updated", {
          currentStreak: streakInfo.currentStreak,
        });
        completedChallenges.push(...streakChallenges);
      }

      // Remove duplicates (in case same challenge completed by multiple actions)
      completedChallenges = completedChallenges.filter(
        (c, i, arr) => arr.findIndex((x) => x.id === c.id) === i
      );
    } catch (error) {
      console.error("Error updating challenges:", error);
    }

    // Prepare response with full card details
    const cardsWithDetails = readingCards.map((rc) => {
      const card = selectedCards.find((c) => c.id === rc.cardId)!;
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

    return NextResponse.json({
      reading: {
        id: reading.id,
        intention: reading.intention,
        interpretation: reading.interpretation,
        createdAt: reading.createdAt,
        spreadType: reading.spreadType,
      },
      cards: cardsWithDetails,
      usedFreeReading: useFreeReading,
      streak: streakInfo,
      newlyDiscoveredCards,
      unlockedAchievements,
      levelUp: levelUp ? {
        newLevel: levelUp.newLevel,
        levelName: levelUp.levelDefinition.name,
        levelNameEs: levelUp.levelDefinition.nameEs,
        levelIcon: levelUp.levelDefinition.icon,
        creditsAwarded: levelUp.creditsAwarded,
      } : null,
      completedChallenges,
    });
  } catch (error) {
    console.error("Error creating reading:", error);
    return NextResponse.json(
      { error: "Error creating reading" },
      { status: 500 }
    );
  }
}

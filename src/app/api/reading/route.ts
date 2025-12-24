import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTarotInterpretation } from "@/lib/anthropic";

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const { spreadTypeId, intention } = await req.json();

    // Validate input
    if (!spreadTypeId || !intention) {
      return NextResponse.json(
        { error: "spreadTypeId e intention son requeridos" },
        { status: 400 }
      );
    }

    if (intention.length < 10) {
      return NextResponse.json(
        { error: "La intencion debe tener al menos 10 caracteres" },
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
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    if (!spreadType) {
      return NextResponse.json(
        { error: "Tipo de tirada no encontrado" },
        { status: 404 }
      );
    }

    // Check if user can afford the reading
    const useFreeReading = user.freeReadingsLeft > 0;
    const canAfford = useFreeReading || user.credits >= spreadType.creditCost;

    if (!canAfford) {
      return NextResponse.json(
        { error: "No tienes suficientes creditos para esta lectura" },
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
        positionName: position.nameEs,
        positionDescription: position.description,
        cardNameEs: card.nameEs,
        isReversed: rc.isReversed,
      };
    });

    // Generate interpretation using Claude
    let interpretation: string;
    try {
      interpretation = await generateTarotInterpretation({
        spreadNameEs: spreadType.nameEs,
        intention,
        cards: cardsForInterpretation,
      });
    } catch (error) {
      console.error("Error generating interpretation:", error);
      // Fallback interpretation if API fails
      interpretation = `Tu lectura de ${spreadType.nameEs} ha sido completada.\n\nCartas reveladas:\n${cardsForInterpretation
        .map(
          (c) =>
            `- Posicion ${c.position} (${c.positionName}): ${c.cardNameEs}${c.isReversed ? " (Invertida)" : ""}`
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
    });
  } catch (error) {
    console.error("Error creating reading:", error);
    return NextResponse.json(
      { error: "Error al crear la lectura" },
      { status: 500 }
    );
  }
}

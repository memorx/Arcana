import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const cards = await prisma.card.findMany({
      orderBy: [
        { arcana: "asc" },
        { suit: "asc" },
        { number: "asc" },
      ],
    });

    return NextResponse.json(cards);
  } catch (error) {
    console.error("Error fetching cards:", error);
    return NextResponse.json([], { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const readingCount = await prisma.reading.count();

    return NextResponse.json({
      readingCount,
      // Round to nearest 10 for display (feels more natural)
      displayCount: Math.floor(readingCount / 10) * 10 + 10
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ readingCount: 0, displayCount: 0 });
  }
}

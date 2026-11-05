import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserInsights } from "@/lib/insights";

/**
 * GET /api/insights → "Mi historia" for the signed-in person:
 * { totalReadings, byMonth, topCards, suits, reversedRate, resonance, cardOfTheMonth }
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const insights = await getUserInsights(session.user.id);
    return NextResponse.json(insights, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Error computing insights:", error);
    return NextResponse.json({ error: "Error computing insights" }, { status: 500 });
  }
}

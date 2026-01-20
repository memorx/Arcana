import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getActiveChallenges,
  getClosestChallenges,
  getChallengeStats,
  getTimeUntilReset,
} from "@/lib/challenges";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [challenges, closest, stats] = await Promise.all([
      getActiveChallenges(session.user.id),
      getClosestChallenges(session.user.id, 3),
      getChallengeStats(session.user.id),
    ]);

    const weeklyReset = getTimeUntilReset("weekly");
    const monthlyReset = getTimeUntilReset("monthly");

    // Separate weekly and monthly challenges
    const weekly = challenges.filter((c) => c.type === "weekly");
    const monthly = challenges.filter((c) => c.type === "monthly");

    return NextResponse.json({
      challenges,
      weekly,
      monthly,
      closest,
      stats,
      resets: {
        weekly: weeklyReset,
        monthly: monthlyReset,
      },
    });
  } catch (error) {
    console.error("Error fetching challenges:", error);
    return NextResponse.json(
      { error: "Error fetching challenges" },
      { status: 500 }
    );
  }
}

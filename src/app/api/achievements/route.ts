import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserAchievements,
  getAchievementStats,
  getRecentAchievements,
  getClosestAchievement,
} from "@/lib/achievements";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [achievements, stats, recent, closest] = await Promise.all([
      getUserAchievements(session.user.id),
      getAchievementStats(session.user.id),
      getRecentAchievements(session.user.id, 3),
      getClosestAchievement(session.user.id),
    ]);

    // Group achievements by category
    const byCategory = achievements.reduce((acc, achievement) => {
      if (!acc[achievement.category]) {
        acc[achievement.category] = [];
      }
      acc[achievement.category].push(achievement);
      return acc;
    }, {} as Record<string, typeof achievements>);

    return NextResponse.json({
      achievements,
      byCategory,
      stats,
      recent,
      closest,
    });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    return NextResponse.json(
      { error: "Error fetching achievements" },
      { status: 500 }
    );
  }
}

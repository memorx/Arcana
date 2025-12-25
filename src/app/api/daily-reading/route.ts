import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get today's date at midnight UTC
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Get today's reading
    const todayReading = await prisma.dailyReading.findUnique({
      where: {
        userId_date: {
          userId: session.user.id,
          date: today,
        },
      },
      include: {
        card: {
          select: {
            id: true,
            name: true,
            nameEs: true,
            arcana: true,
            suit: true,
            imageUrl: true,
          },
        },
      },
    });

    // Get recent readings (last 7 days, excluding today)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentReadings = await prisma.dailyReading.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: sevenDaysAgo,
          lt: today,
        },
      },
      include: {
        card: {
          select: {
            id: true,
            name: true,
            nameEs: true,
            arcana: true,
            suit: true,
            imageUrl: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json({
      today: todayReading,
      recent: recentReadings,
    });
  } catch (error) {
    console.error("Error fetching daily reading:", error);
    return NextResponse.json(
      { error: "Error fetching daily reading" },
      { status: 500 }
    );
  }
}

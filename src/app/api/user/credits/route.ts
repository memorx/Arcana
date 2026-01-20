import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true, freeReadingsLeft: true, level: true, xp: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      credits: user.credits,
      freeReadingsLeft: user.freeReadingsLeft,
      level: user.level,
      xp: user.xp,
    });
  } catch (error) {
    console.error("Error fetching user credits:", error);
    return NextResponse.json(
      { error: "Error fetching credits" },
      { status: 500 }
    );
  }
}

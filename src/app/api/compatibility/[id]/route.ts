import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toIsoDay } from "@/lib/compatibility";

/** One reading for two. Only its owner can see it. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const reading = await prisma.compatibilityReading.findUnique({ where: { id } });

    if (!reading) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (reading.userId !== session.user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      reading: {
        id: reading.id,
        partnerName: reading.partnerName,
        partnerBirthDate: toIsoDay(reading.partnerBirthDate),
        locale: reading.locale,
        content: reading.content,
        summary: reading.summary,
        createdAt: reading.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching compatibility reading:", error);
    return NextResponse.json({ error: "Error fetching reading" }, { status: 500 });
  }
}

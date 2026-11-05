import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const sharePath = (shareId: string) => `/share/blueprint/${shareId}`;

/**
 * POST /api/blueprint/share → { shareId, sharePath }.
 * Creates the public link once (nanoid 10); later calls return the same id.
 * Needs a saved synthesis (an ArcanaProfile row): 409 synthesis_required.
 */
export async function POST(req: NextRequest) {
  const { success, resetIn } = rateLimit(req, 3, 60000);
  if (!success) {
    return rateLimitResponse(resetIn);
  }

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const arcana = await prisma.arcanaProfile.findUnique({
      where: { userId },
      select: { shareId: true },
    });
    if (!arcana) {
      return NextResponse.json({ error: "synthesis_required" }, { status: 409 });
    }
    if (arcana.shareId) {
      return NextResponse.json({ shareId: arcana.shareId, sharePath: sharePath(arcana.shareId) });
    }

    // Only sets the id if there still is none, so two concurrent requests end with one link.
    const shareId = nanoid(10);
    const { count } = await prisma.arcanaProfile.updateMany({
      where: { userId, shareId: null },
      data: { shareId },
    });
    if (count === 0) {
      const current = await prisma.arcanaProfile.findUnique({
        where: { userId },
        select: { shareId: true },
      });
      if (!current?.shareId) {
        return NextResponse.json({ error: "Failed to share blueprint" }, { status: 500 });
      }
      return NextResponse.json({ shareId: current.shareId, sharePath: sharePath(current.shareId) });
    }

    return NextResponse.json({ shareId, sharePath: sharePath(shareId) });
  } catch (error) {
    console.error("Blueprint share error:", error);
    return NextResponse.json({ error: "Failed to share blueprint" }, { status: 500 });
  }
}

/** DELETE /api/blueprint/share → { shareId: null }. The old link stops working. */
export async function DELETE(req: NextRequest) {
  const { success, resetIn } = rateLimit(req, 3, 60000);
  if (!success) {
    return rateLimitResponse(resetIn);
  }

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.arcanaProfile.updateMany({
      where: { userId: session.user.id },
      data: { shareId: null },
    });

    return NextResponse.json({ shareId: null });
  } catch (error) {
    console.error("Blueprint unshare error:", error);
    return NextResponse.json({ error: "Failed to stop sharing" }, { status: 500 });
  }
}

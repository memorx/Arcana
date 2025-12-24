import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { isPublic } = await request.json();

    // Find the reading and verify ownership
    const reading = await prisma.reading.findUnique({
      where: { id },
    });

    if (!reading) {
      return NextResponse.json({ error: "Reading not found" }, { status: 404 });
    }

    if (reading.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Generate shareId if making public and doesn't have one
    const shareId = isPublic && !reading.shareId ? nanoid(10) : reading.shareId;

    // Update the reading
    const updatedReading = await prisma.reading.update({
      where: { id },
      data: {
        isPublic,
        shareId: isPublic ? shareId : reading.shareId, // Keep shareId even when private
      },
    });

    return NextResponse.json({
      isPublic: updatedReading.isPublic,
      shareId: updatedReading.shareId,
      shareUrl: updatedReading.shareId
        ? `${process.env.NEXTAUTH_URL}/share/${updatedReading.shareId}`
        : null,
    });
  } catch (error) {
    console.error("Share reading error:", error);
    return NextResponse.json(
      { error: "Failed to update sharing settings" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Find the reading and verify ownership
    const reading = await prisma.reading.findUnique({
      where: { id },
      select: {
        id: true,
        isPublic: true,
        shareId: true,
        userId: true,
      },
    });

    if (!reading) {
      return NextResponse.json({ error: "Reading not found" }, { status: 404 });
    }

    if (reading.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({
      isPublic: reading.isPublic,
      shareId: reading.shareId,
      shareUrl: reading.shareId
        ? `${process.env.NEXTAUTH_URL}/share/${reading.shareId}`
        : null,
    });
  } catch (error) {
    console.error("Get share status error:", error);
    return NextResponse.json(
      { error: "Failed to get sharing settings" },
      { status: 500 }
    );
  }
}

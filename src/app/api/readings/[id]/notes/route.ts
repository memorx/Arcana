import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { personalNotes } = await req.json();

  // Verify user owns this reading
  const reading = await prisma.reading.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!reading) {
    return NextResponse.json({ error: "Reading not found" }, { status: 404 });
  }

  if (reading.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Update notes
  const updated = await prisma.reading.update({
    where: { id },
    data: { personalNotes },
    select: {
      id: true,
      personalNotes: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(updated);
}

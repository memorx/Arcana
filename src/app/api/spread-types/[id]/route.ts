import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const spreadType = await prisma.spreadType.findUnique({
      where: { id },
    });

    if (!spreadType) {
      return NextResponse.json(
        { error: "Spread type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(spreadType);
  } catch (error) {
    console.error("Error fetching spread type:", error);
    return NextResponse.json(
      { error: "Error fetching spread type" },
      { status: 500 }
    );
  }
}

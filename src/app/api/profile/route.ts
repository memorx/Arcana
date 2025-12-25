import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getZodiacSign } from "@/lib/zodiac";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Error fetching profile" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { fullName, birthDate, birthTime, focusArea, emailTime, locale } = body;

    // Validate required fields
    if (!fullName || !birthDate) {
      return NextResponse.json(
        { error: "Full name and birth date are required" },
        { status: 400 }
      );
    }

    // Calculate zodiac sign
    const birthDateObj = new Date(birthDate);
    const zodiacSign = getZodiacSign(birthDateObj);

    // Upsert profile
    const profile = await prisma.userProfile.upsert({
      where: { userId: session.user.id },
      update: {
        fullName,
        birthDate: birthDateObj,
        birthTime: birthTime || null,
        zodiacSign,
        focusArea: focusArea || "general",
        emailTime: emailTime || "08:00",
        locale: locale || "es",
      },
      create: {
        userId: session.user.id,
        fullName,
        birthDate: birthDateObj,
        birthTime: birthTime || null,
        zodiacSign,
        focusArea: focusArea || "general",
        emailTime: emailTime || "08:00",
        locale: locale || "es",
      },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error saving profile:", error);
    return NextResponse.json(
      { error: "Error saving profile" },
      { status: 500 }
    );
  }
}

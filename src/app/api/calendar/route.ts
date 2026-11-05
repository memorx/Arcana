import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PRIVATE = { "Cache-Control": "private, no-store" };

/**
 * The calendar computes every day in the browser with `@/lib/systems`; the
 * only thing it needs from the server is the birth date for the personal day.
 * Public: guests get `{ authenticated: false, birthDate: null }`.
 */
export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ authenticated: false, birthDate: null }, { headers: PRIVATE });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { birthDate: true },
    });

    // Birth dates are stored at 00:00 UTC: send only the UTC day.
    const birthDate = profile?.birthDate ? profile.birthDate.toISOString().slice(0, 10) : null;

    return NextResponse.json({ authenticated: true, birthDate }, { headers: PRIVATE });
  } catch (error) {
    console.error("[calendar] Could not load the birth date:", error);
    return NextResponse.json({ error: "calendar_unavailable" }, { status: 500, headers: PRIVATE });
  }
}

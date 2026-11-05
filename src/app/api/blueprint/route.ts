import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getArcanaBlueprint } from "@/lib/systems";
import { blueprintInputsHash, toBlueprintLocale } from "@/lib/ai/blueprint-synthesis";

/**
 * GET /api/blueprint → { blueprint, synthesis, shareId }.
 * `synthesis` is null unless the cached one was written for the current
 * birth date, name and locale.
 */
export async function GET(req: NextRequest) {
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

    const [profile, arcana] = await Promise.all([
      prisma.userProfile.findUnique({
        where: { userId },
        select: { birthDate: true, fullName: true, locale: true },
      }),
      prisma.arcanaProfile.findUnique({
        where: { userId },
        select: { synthesis: true, inputsHash: true, shareId: true },
      }),
    ]);

    if (!profile) {
      return NextResponse.json({ error: "profile_required" }, { status: 404 });
    }

    const locale = toBlueprintLocale(profile.locale);
    const hash = blueprintInputsHash(profile.birthDate, profile.fullName, locale);
    const blueprint = getArcanaBlueprint(profile.birthDate, profile.fullName);

    return NextResponse.json({
      blueprint,
      synthesis: arcana && arcana.inputsHash === hash ? arcana.synthesis : null,
      shareId: arcana?.shareId ?? null,
    });
  } catch (error) {
    console.error("Blueprint error:", error);
    return NextResponse.json({ error: "Failed to load blueprint" }, { status: 500 });
  }
}

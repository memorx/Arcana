import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { AIRefusalError } from "@/lib/ai/config";
import { getArcanaBlueprint } from "@/lib/systems";
import {
  BLUEPRINT_SYNTHESIS_VERSION,
  blueprintInputsHash,
  generateBlueprintSynthesis,
  toBlueprintLocale,
} from "@/lib/ai/blueprint-synthesis";

export const maxDuration = 60;

/**
 * POST /api/blueprint/synthesis → { synthesis, shareId, cached }.
 * Free. If a synthesis for the current inputs exists it is returned without
 * calling the AI; otherwise it is generated and upserted with the new hash.
 * AI down → 503 (retry), refusal → 422; nothing is saved in either case.
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

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { birthDate: true, fullName: true, locale: true },
    });
    if (!profile) {
      return NextResponse.json({ error: "profile_required" }, { status: 404 });
    }

    const locale = toBlueprintLocale(profile.locale);
    const hash = blueprintInputsHash(profile.birthDate, profile.fullName, locale);

    const existing = await prisma.arcanaProfile.findUnique({
      where: { userId },
      select: { synthesis: true, inputsHash: true, shareId: true },
    });
    if (existing && existing.inputsHash === hash && existing.synthesis.trim()) {
      return NextResponse.json({
        synthesis: existing.synthesis,
        shareId: existing.shareId,
        cached: true,
      });
    }

    const blueprint = getArcanaBlueprint(profile.birthDate, profile.fullName);

    let synthesis: string;
    try {
      synthesis = await generateBlueprintSynthesis(blueprint, locale);
    } catch (error) {
      if (error instanceof AIRefusalError) {
        console.warn("Blueprint synthesis refused:", error.category);
        return NextResponse.json({ error: "synthesis_refused" }, { status: 422 });
      }
      console.error("Blueprint synthesis unavailable:", error);
      return NextResponse.json({ error: "synthesis_unavailable", retry: true }, { status: 503 });
    }

    const saved = await prisma.arcanaProfile.upsert({
      where: { userId },
      create: {
        userId,
        locale,
        synthesis,
        inputsHash: hash,
        version: BLUEPRINT_SYNTHESIS_VERSION,
      },
      update: {
        locale,
        synthesis,
        inputsHash: hash,
        version: BLUEPRINT_SYNTHESIS_VERSION,
      },
      select: { synthesis: true, shareId: true },
    });

    return NextResponse.json({ synthesis: saved.synthesis, shareId: saved.shareId, cached: false });
  } catch (error) {
    console.error("Blueprint synthesis error:", error);
    return NextResponse.json({ error: "Failed to create synthesis" }, { status: 500 });
  }
}

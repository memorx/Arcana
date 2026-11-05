import { NextResponse } from "next/server";
import { getCollectivePulse } from "@/lib/pulse";

// Public and anonymous: only card counts, cached 10 minutes on the CDN.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pulse = await getCollectivePulse();
    return NextResponse.json(pulse, {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("[pulse] Could not compute the collective pulse:", error);
    return NextResponse.json(
      { error: "pulse_unavailable" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addXP, type LevelUpResult } from "@/lib/xp";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

// Route files may only export handlers and route config, so these stay local.
/** XP for closing the loop on a reading. */
const RESONANCE_XP = 5;
const RESONANCE_NOTE_MAX = 500;
/** The question only makes sense once the reading has had time to land (same rule as ResonanceCheck). */
const RESONANCE_MIN_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * POST /api/readings/[id]/resonance  { score: 1..5, note?: string ≤ 500 }
 * Only the owner, only once per reading. +5 XP.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { success, resetIn } = rateLimit(req, 10, 60000);
  if (!success) {
    return rateLimitResponse(resetIn);
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { score, note } = (body ?? {}) as { score?: unknown; note?: unknown };

  if (typeof score !== "number" || !Number.isInteger(score) || score < 1 || score > 5) {
    return NextResponse.json({ error: "invalid_score" }, { status: 400 });
  }

  if (note !== undefined && note !== null && typeof note !== "string") {
    return NextResponse.json({ error: "invalid_note" }, { status: 400 });
  }
  const cleanNote = typeof note === "string" ? note.trim() : "";
  if (cleanNote.length > RESONANCE_NOTE_MAX) {
    return NextResponse.json({ error: "note_too_long", max: RESONANCE_NOTE_MAX }, { status: 400 });
  }

  const { id } = await params;
  const reading = await prisma.reading.findUnique({
    where: { id },
    select: { userId: true, createdAt: true, resonance: true },
  });

  if (!reading) {
    return NextResponse.json({ error: "Reading not found" }, { status: 404 });
  }
  if (reading.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (reading.resonance !== null) {
    return NextResponse.json({ error: "already_rated" }, { status: 409 });
  }
  if (Date.now() - new Date(reading.createdAt).getTime() < RESONANCE_MIN_AGE_MS) {
    return NextResponse.json({ error: "too_soon" }, { status: 400 });
  }

  // Conditional write: two simultaneous requests can't both rate (or both earn XP).
  const resonanceAt = new Date();
  const resonanceNote = cleanNote || null;
  const updated = await prisma.reading.updateMany({
    where: { id, userId, resonance: null },
    data: { resonance: score, resonanceNote, resonanceAt },
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: "already_rated" }, { status: 409 });
  }

  // XP is a bonus: if it fails, the rating is still saved.
  let xpAdded = 0;
  let levelUp: LevelUpResult | null = null;
  try {
    const xp = await addXP(userId, RESONANCE_XP, "resonance");
    xpAdded = xp.xpAdded;
    levelUp = xp.levelUp;
  } catch (error) {
    console.error("Error adding resonance XP:", error);
  }

  return NextResponse.json({
    resonance: score,
    resonanceNote,
    resonanceAt: resonanceAt.toISOString(),
    xpAdded,
    levelUp,
  });
}

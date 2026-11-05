import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Guards a Vercel Cron route. Returns null when the request carries
 * `Authorization: Bearer <CRON_SECRET>`, otherwise the response to send:
 * - 500 when CRON_SECRET isn't configured (never compare against "Bearer undefined")
 * - 401 when the header is missing or wrong
 *
 * Both values are hashed before comparing so timingSafeEqual always gets
 * buffers of the same length and the comparison leaks neither content nor length.
 */
export function verifyCronRequest(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret || !secret.trim()) {
    console.error("[CRON] CRON_SECRET is not configured");
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const received = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;

  const receivedDigest = createHash("sha256").update(received).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();

  if (!timingSafeEqual(receivedDigest, expectedDigest)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

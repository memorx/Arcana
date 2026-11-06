/**
 * @jest-environment node
 *
 * The daily email's card image, end to end through the cron: the card comes from /cartas (self-hosted) and is
 * proxied by /_next/image with an absolute URL. The database `imageUrl` (Wikimedia) is never used: without
 * `images.remotePatterns` the optimizer answers 400 to that host, and The Lovers' stored URL is a 404 anyway.
 * Resend is mocked: nothing is sent.
 */
import { NextRequest } from "next/server";

const mockSend = jest.fn();
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockSend } })),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: { findMany: jest.fn() },
    card: { findMany: jest.fn() },
    dailyReading: { findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn() },
  },
}));
jest.mock("@/lib/anthropic", () => ({ generateDailyInterpretation: jest.fn() }));
jest.mock("@/lib/birthday", () => ({
  ...jest.requireActual("@/lib/birthday"),
  claimBirthdayGift: jest.fn(),
}));

import { GET } from "@/app/api/cron/daily-readings/route";
import { prisma } from "@/lib/prisma";
import { generateDailyInterpretation } from "@/lib/anthropic";
import { existsSync } from "node:fs";
import path from "node:path";

const db = prisma as unknown as {
  subscription: { findMany: jest.Mock };
  card: { findMany: jest.Mock };
  dailyReading: { findUnique: jest.Mock; findMany: jest.Mock; upsert: jest.Mock };
};

const SECRET = "cron-test-secret";
const request = () =>
  new NextRequest("http://localhost:3000/api/cron/daily-readings", { headers: { authorization: `Bearer ${SECRET}` } });

const subscriber = {
  id: "sub-1",
  status: "active",
  user: {
    id: "user-1",
    email: "ana@example.com",
    profile: { fullName: "Ana López", zodiacSign: "Leo", focusArea: "love", emailTime: "08:00", locale: "es" },
  },
};

/** The `src` of the card <img> in the email that was handed to Resend. */
function cardSrc(): string {
  expect(mockSend).toHaveBeenCalledTimes(1);
  const { html } = mockSend.mock.calls[0][0] as { html: string };
  const card = html.slice(html.indexOf("<!-- Card -->"));
  const src = /<img\s+src="([^"]+)"/.exec(card)?.[1];
  expect(src).toBeDefined();
  return src!;
}

describe("daily email · card image", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    db.subscription.findMany.mockResolvedValue([subscriber]);
    db.dailyReading.findUnique.mockResolvedValue(null);
    db.dailyReading.findMany.mockResolvedValue([]);
    db.dailyReading.upsert.mockResolvedValue({ id: "daily-1" });
    (generateDailyInterpretation as jest.Mock).mockResolvedValue("Buenos días, Ana.");
    mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  it.each([
    // The Lovers: the production row still points to a Wikimedia file that answers 404.
    ["The Lovers", "Los Enamorados", "https://upload.wikimedia.org/wikipedia/commons/d/db/RWS_Tarot_06_Lovers.jpg", "rws-tarot-06-lovers"],
    ["The Sun", "El Sol", "https://upload.wikimedia.org/wikipedia/commons/1/17/RWS_Tarot_19_Sun.jpg", "rws-tarot-19-sun"],
    ["Ace of Cups", "As de Copas", "https://upload.wikimedia.org/wikipedia/commons/3/36/Cups01.jpg", "cups01"],
    ["King of Pentacles", "Rey de Oros", "https://upload.wikimedia.org/wikipedia/commons/1/1c/Pents14.jpg", "pents14"],
  ])("%s → /cartas/%s via /_next/image, absolute", async (name, nameEs, imageUrl, slug) => {
    db.card.findMany.mockResolvedValue([{ id: `card-${slug}`, name, nameEs, imageUrl, keywords: ["a", "b"] }]);

    const response = await GET(request());
    expect(await response.json()).toMatchObject({ sent: 1, errors: 0 });

    const src = cardSrc();
    expect(src).toBe(`https://www.readarcana.com/_next/image?url=%2Fcartas%2F${slug}-color.webp&w=384&q=80`);
    expect(src).not.toMatch(/wikimedia/i);
    // The proxied file exists in public/ (what /_next/image will read).
    const local = decodeURIComponent(new URL(src).searchParams.get("url")!);
    expect(existsSync(path.join(process.cwd(), "public", local))).toBe(true);
  });
});

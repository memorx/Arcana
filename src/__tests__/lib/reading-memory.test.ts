/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    reading: { findMany: jest.fn() },
    card: { findMany: jest.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  buildHistoryContext,
  truncateText,
  HISTORY_MAX_CHARS,
  HISTORY_INTENTION_MAX,
} from "@/lib/reading-memory";

const findReadings = prisma.reading.findMany as jest.Mock;
const findCards = prisma.card.findMany as jest.Mock;

const NOW = new Date("2026-11-04T12:00:00Z");

const threeCards = {
  name: "Three Cards",
  nameEs: "Tres Cartas",
  positions: [
    { position: 1, name: "Past", nameEs: "Pasado", description: "" },
    { position: 2, name: "Present", nameEs: "Presente", description: "" },
    { position: 3, name: "Future", nameEs: "Futuro", description: "" },
  ],
};

const catalog = [
  { id: "c1", name: "The Fool", nameEs: "El Loco" },
  { id: "c2", name: "The Tower", nameEs: "La Torre" },
  { id: "c3", name: "The Sun", nameEs: "El Sol" },
  { id: "c4", name: "Six of Cups", nameEs: "Seis de Copas" },
];

const longIntention =
  "¿Debería dejar mi trabajo actual para dedicarme por completo al proyecto que llevo años imaginando con mi hermana en Oaxaca?";

const readings = [
  {
    id: "r1",
    createdAt: new Date("2026-10-12T15:00:00Z"),
    intention: longIntention,
    cards: [
      { position: 2, cardId: "c2", isReversed: true, isGolden: false },
      { position: 1, cardId: "c1", isReversed: false, isGolden: false },
      { position: 3, cardId: "c3", isReversed: false, isGolden: false },
    ],
    resonance: 5,
    spreadType: threeCards,
  },
  {
    id: "r2",
    createdAt: new Date("2026-10-03T09:00:00Z"),
    intention: "¿Qué necesito ver de mi relación?",
    cards: [
      { position: 1, cardId: "c2", isReversed: false, isGolden: false },
      { position: 2, cardId: "c4", isReversed: false, isGolden: false },
      { position: 3, cardId: "c1", isReversed: true, isGolden: false },
    ],
    resonance: null,
    spreadType: threeCards,
  },
];

/** The recent query uses `take`; the 90-day query doesn't. */
function givenReadings(recent: unknown[], window: unknown[] = recent) {
  findReadings.mockImplementation(async (args: { take?: number }) => (args.take ? recent : window));
  findCards.mockImplementation(async (args: { where: { id: { in: string[] } } }) =>
    catalog.filter((card) => args.where.id.in.includes(card.id))
  );
}

describe("truncateText", () => {
  it("leaves short text alone and collapses whitespace", () => {
    expect(truncateText("  hola \n  mundo ", 80)).toBe("hola mundo");
  });

  it("cuts to the limit including the ellipsis", () => {
    const cut = truncateText("a".repeat(200), 80);
    expect(Array.from(cut)).toHaveLength(80);
    expect(cut.endsWith("…")).toBe(true);
  });

  it("never splits an emoji in half", () => {
    const cut = truncateText("🌙".repeat(100), 10);
    expect(cut).toBe("🌙".repeat(9) + "…");
  });
});

describe("buildHistoryContext (F-50)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns undefined when the person has no readings", async () => {
    givenReadings([], []);

    await expect(buildHistoryContext("user-1", "es", NOW)).resolves.toBeUndefined();
    expect(findCards).not.toHaveBeenCalled();
  });

  it("only looks at the person's own readings, the last 8 and the last 90 days", async () => {
    givenReadings(readings);

    await buildHistoryContext("user-1", "es", NOW);

    expect(findReadings).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" }, take: 8, orderBy: { createdAt: "desc" } })
    );
    const windowCall = findReadings.mock.calls.find(([args]) => !args.take)![0];
    expect(windowCall.where.userId).toBe("user-1");
    expect(windowCall.where.createdAt.gte).toEqual(new Date("2026-08-06T12:00:00Z"));
  });

  it("formats each reading with short date, spread, intention and cards by position", async () => {
    givenReadings(readings);

    const context = (await buildHistoryContext("user-1", "es", NOW))!;
    const lines = context.split("\n");

    expect(lines[0]).toBe("Lecturas recientes (de la más nueva a la más antigua):");
    expect(lines[1]).toMatch(/^- 12 oct · Tres Cartas · «/);
    expect(lines[1]).toContain("· Pasado: El Loco; Presente: La Torre (inv.); Futuro: El Sol");
    expect(lines[2]).toBe(
      "- 3 oct · Tres Cartas · «¿Qué necesito ver de mi relación?» · Pasado: La Torre; Presente: Seis de Copas; Futuro: El Loco (inv.)"
    );
  });

  it("truncates the intention to 80 characters", async () => {
    givenReadings(readings);

    const context = (await buildHistoryContext("user-1", "es", NOW))!;
    const intention = context.match(/«([^»]+)»/)![1];

    expect(Array.from(intention)).toHaveLength(HISTORY_INTENTION_MAX);
    expect(intention.endsWith("…")).toBe(true);
    expect(longIntention.startsWith(intention.slice(0, -1))).toBe(true);
  });

  it("lists the recurring cards of the last 90 days with their count, and the resonance", async () => {
    givenReadings(readings);

    const context = (await buildHistoryContext("user-1", "es", NOW))!;

    // c1 and c2 came up twice; c3 and c4 once (not recurring)
    expect(context).toContain("Cartas recurrentes en los últimos 90 días: El Loco ×2, La Torre ×2.");
    expect(context).not.toContain("El Sol ×");
    expect(context).toContain("Resonancia que la persona reportó: la lectura del 12 oct resonó 5/5.");
  });

  it("leaves out the recurring and resonance lines when there are none", async () => {
    givenReadings([{ ...readings[1], resonance: null }]);

    const context = (await buildHistoryContext("user-1", "es", NOW))!;

    expect(context).not.toContain("recurrentes");
    expect(context).not.toContain("Resonancia");
    expect(context.split("\n")).toHaveLength(2);
  });

  it("writes in English for locale en", async () => {
    givenReadings(readings);

    const context = (await buildHistoryContext("user-1", "en", NOW))!;

    expect(context).toContain("Recent readings (newest first):");
    expect(context).toContain("- Oct 12 · Three Cards · «");
    expect(context).toContain("Past: The Fool; Present: The Tower (rev.); Future: The Sun");
    expect(context).toContain("Recurring cards in the last 90 days: The Fool ×2, The Tower ×2.");
    expect(context).toContain("the reading from Oct 12 resonated 5/5");
  });

  it("never goes over 1500 characters: drops the oldest readings and keeps the newest", async () => {
    const celtic = {
      name: "Celtic Cross",
      nameEs: "Cruz Celta",
      positions: Array.from({ length: 10 }, (_, i) => ({
        position: i + 1,
        name: `Long position name number ${i + 1}`,
        nameEs: `Nombre de posición bastante largo ${i + 1}`,
        description: "",
      })),
    };
    const heavy = Array.from({ length: 8 }, (_, i) => ({
      id: `h${i}`,
      createdAt: new Date(Date.UTC(2026, 9, 30 - i, 12)),
      intention: `Lectura ${i} ` + "x".repeat(300),
      cards: Array.from({ length: 10 }, (_, p) => ({
        position: p + 1,
        cardId: catalog[p % 4].id,
        isReversed: p % 2 === 0,
        isGolden: false,
      })),
      resonance: i === 7 ? 3 : null,
      spreadType: celtic,
    }));
    givenReadings(heavy);

    const context = (await buildHistoryContext("user-1", "es", NOW))!;

    expect(context.length).toBeLessThanOrEqual(HISTORY_MAX_CHARS);
    expect(context).toContain("«Lectura 0 ");
    expect(context).not.toContain("«Lectura 7 ");
    // The summary lines survive even when readings are dropped
    expect(context).toContain("Cartas recurrentes");
    expect(context).toContain("resonó 3/5");
    expect(context).not.toContain("undefined");
  });
});

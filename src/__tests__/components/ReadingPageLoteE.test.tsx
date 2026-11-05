import { render, screen } from "@testing-library/react";
import ReadingPage from "@/app/(main)/reading/[id]/page";

jest.mock("@/lib/auth", () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: "user-1" } }),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    reading: { findUnique: jest.fn() },
    card: { findMany: jest.fn() },
    readingFollowUp: { findMany: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}));

jest.mock("next-intl/server", () => ({
  getTranslations: jest.fn(async (namespace: string) => (key: string) => `${namespace}.${key}`),
  getLocale: jest.fn(async () => "es"),
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  reading: { findUnique: jest.Mock };
  card: { findMany: jest.Mock };
  readingFollowUp: { findMany: jest.Mock };
  user: { findUnique: jest.Mock };
};

const baseReading = {
  id: "reading-1",
  userId: "user-1",
  intention: "¿Qué necesito ver?",
  interpretation: "Primer párrafo.\nSegundo párrafo.",
  personalNotes: null,
  // A fresh, unrated reading (what Prisma returns): ResonanceCheck (F-83) stays hidden for 24 h,
  // so it never competes with these assertions whatever day the suite runs.
  createdAt: new Date(),
  resonance: null,
  resonanceNote: null,
  cards: [{ position: 1, cardId: "major_16", isReversed: false }],
  spreadType: {
    name: "One Card",
    nameEs: "Una Carta",
    positions: [{ position: 1, name: "Now", nameEs: "Ahora", description: "" }],
  },
};

const renderPage = async (source: "app" | "manual") => {
  mockPrisma.reading.findUnique.mockResolvedValue({ ...baseReading, source });
  mockPrisma.card.findMany.mockResolvedValue([
    {
      id: "major_16",
      name: "The Tower",
      nameEs: "La Torre",
      arcana: "MAJOR",
      suit: null,
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/5/53/RWS_Tarot_16_Tower.jpg",
      meaningUpright: "",
      meaningReversed: "",
      meaningUprightEn: null,
      meaningReversedEn: null,
      keywords: [],
    },
  ]);
  mockPrisma.readingFollowUp.findMany.mockResolvedValue([
    {
      id: "fu-1",
      question: "¿Y en el trabajo?",
      answer: "Mira lo que ya terminó.",
      creditsCharged: 0,
      createdAt: new Date("2026-11-05T13:00:00Z"),
    },
  ]);
  mockPrisma.user.findUnique.mockResolvedValue({ credits: 2 });

  return render(await ReadingPage({ params: Promise.resolve({ id: "reading-1" }) }));
};

describe("reading page additions from Lote E (F-66)", () => {
  beforeEach(() => {
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        speak: jest.fn(),
        cancel: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        getVoices: jest.fn(() => []),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: function () {}, configurable: true, writable: true });
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).speechSynthesis;
    delete (window as unknown as Record<string, unknown>).SpeechSynthesisUtterance;
  });

  it("shows the \"With your deck\" badge only for manual readings", async () => {
    const { unmount } = await renderPage("manual");
    expect(screen.getByText("manual.badge")).toBeInTheDocument();
    unmount();

    await renderPage("app");
    expect(screen.queryByText("manual.badge")).not.toBeInTheDocument();
  });

  it("puts ReadAloud next to the interpretation title", async () => {
    await renderPage("app");

    const title = screen.getByText("reading.interpretation");
    const header = title.closest("h3")!.parentElement!;
    // The global next-intl mock returns the key
    expect(header).toContainElement(screen.getByRole("button", { name: "play" }));
  });

  it("loads the follow-ups oldest first and shows the chat below the personal notes", async () => {
    await renderPage("app");

    expect(mockPrisma.readingFollowUp.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { readingId: "reading-1" }, orderBy: { createdAt: "asc" } })
    );
    expect(screen.getByText("¿Y en el trabajo?")).toBeInTheDocument();
    expect(screen.getByText("Mira lo que ya terminó.")).toBeInTheDocument();

    const notes = screen.getByText("notes.title");
    const chat = screen.getByText("title");
    expect(notes.compareDocumentPosition(chat) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("ResonanceCheck on the reading page (F-83)", () => {
  beforeEach(() => {
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        speak: jest.fn(),
        cancel: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        getVoices: jest.fn(() => []),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: function () {}, configurable: true, writable: true });
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).speechSynthesis;
    delete (window as unknown as Record<string, unknown>).SpeechSynthesisUtterance;
  });

  it("shows a saved rating and its note between the interpretation and the personal notes", async () => {
    mockPrisma.reading.findUnique.mockResolvedValue({
      ...baseReading,
      source: "app",
      resonance: 4,
      resonanceNote: "Se cumplió en el trabajo.",
    });
    mockPrisma.card.findMany.mockResolvedValue([]);
    mockPrisma.readingFollowUp.findMany.mockResolvedValue([]);
    mockPrisma.user.findUnique.mockResolvedValue({ credits: 0 });

    render(await ReadingPage({ params: Promise.resolve({ id: "reading-1" }) }));

    const note = screen.getByText(/Se cumplió en el trabajo\./);
    expect(screen.getAllByText("result").length).toBeGreaterThan(0);
    const interpretation = screen.getByText("reading.interpretation");
    const notes = screen.getByText("notes.title");
    expect(interpretation.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(note.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("asks how it resonated when an unrated reading is older than 24 h", async () => {
    mockPrisma.reading.findUnique.mockResolvedValue({
      ...baseReading,
      source: "app",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    });
    mockPrisma.card.findMany.mockResolvedValue([]);
    mockPrisma.readingFollowUp.findMany.mockResolvedValue([]);
    mockPrisma.user.findUnique.mockResolvedValue({ credits: 0 });

    render(await ReadingPage({ params: Promise.resolve({ id: "reading-1" }) }));

    expect(await screen.findByRole("group", { name: "starsGroup" })).toBeInTheDocument();
    expect(screen.getByText("question")).toBeInTheDocument();
  });
});

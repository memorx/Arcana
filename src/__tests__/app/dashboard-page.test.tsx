import { render, screen, within } from "@testing-library/react";
import DashboardPage from "@/app/(main)/dashboard/page";
import { prisma } from "@/lib/prisma";
import { MAX_GRABADOS_MESA, MESA_FIJA } from "@/components/dashboard/mesa";

jest.mock("@/lib/auth", () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: "user-1", email: "ana@example.com" } }),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    reading: { findMany: jest.fn(), count: jest.fn() },
    card: { findMany: jest.fn() },
    spreadType: { findMany: jest.fn().mockResolvedValue([]) },
    userProfile: { findUnique: jest.fn() },
    subscription: { findUnique: jest.fn().mockResolvedValue(null) },
  },
}));

jest.mock("next-intl/server", () => ({
  getTranslations: jest.fn(async (namespace: string) => (key: string) => `${namespace}.${key}`),
  getLocale: jest.fn(async () => "es"),
}));

// Widgets are async server components with their own tests; here they are markers carrying their props.
function mockMarker(name: string) {
  return function Marker({ userId }: { userId: string }) {
    return <div data-testid={name} data-user={userId} />;
  };
}
jest.mock("@/components/dashboard/StreakDisplay", () => ({ StreakDisplay: () => <div data-testid="StreakDisplay" /> }));
jest.mock("@/components/dashboard/LevelWidget", () => ({ LevelWidget: mockMarker("LevelWidget") }));
jest.mock("@/components/dashboard/CollectionWidget", () => ({ CollectionWidget: mockMarker("CollectionWidget") }));
jest.mock("@/components/dashboard/AchievementsWidget", () => ({ AchievementsWidget: mockMarker("AchievementsWidget") }));
jest.mock("@/components/dashboard/ChallengesWidget", () => ({ ChallengesWidget: mockMarker("ChallengesWidget") }));
jest.mock("@/components/dashboard/BirthdayBanner", () => ({ BirthdayBanner: mockMarker("BirthdayBanner") }));
jest.mock("@/components/dashboard/TodayEnergiesWidget", () => ({ TodayEnergiesWidget: mockMarker("TodayEnergiesWidget") }));
jest.mock("@/components/dashboard/BlueprintWidget", () => ({ BlueprintWidget: mockMarker("BlueprintWidget") }));
jest.mock("@/components/dashboard/InsightsWidget", () => ({ InsightsWidget: mockMarker("InsightsWidget") }));

const db = prisma as unknown as {
  user: { findUnique: jest.Mock };
  reading: { findMany: jest.Mock; count: jest.Mock };
  card: { findMany: jest.Mock };
  userProfile: { findUnique: jest.Mock };
};

const follows = (a: HTMLElement, b: HTMLElement) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

/** The cell of the editorial grid that holds a widget marker. */
const cellOf = (el: HTMLElement) => el.closest<HTMLElement>("[data-reticula] > *")!;

/** Engravings of the ink band (MesaDeGrabados renders them as <img> inside .mdg). */
const grabados = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLImageElement>(".mdg img")).map((img) => img.getAttribute("src"));

const SPREAD = { id: "spread-3", name: "Three Card Spread", nameEs: "Tirada de Tres Cartas", cardCount: 3 };

function reading(id: string, cardIds: string[]) {
  return {
    id,
    intention: `Pregunta ${id}`,
    createdAt: new Date("2026-11-05T12:00:00Z"),
    spreadType: SPREAD,
    cards: cardIds.map((cardId, position) => ({ position, cardId, isReversed: false })),
  };
}

function withAna({ streak = 2 } = {}) {
  db.user.findUnique.mockResolvedValue({
    freeReadingsLeft: 0,
    credits: 4,
    name: "Ana",
    currentStreak: streak,
    longestStreak: 5,
  });
  db.userProfile.findUnique.mockResolvedValue({ userId: "user-1" });
}

describe("Dashboard wiring (F-82)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    withAna();
    db.reading.findMany.mockResolvedValue([]);
    db.reading.count.mockResolvedValue(0);
    db.card.findMany.mockResolvedValue([]);
  });

  it("mounts the birthday banner first, above the welcome heading", async () => {
    const { container } = render(await DashboardPage());

    const banner = screen.getByTestId("BirthdayBanner");
    expect(banner).toHaveAttribute("data-user", "user-1");
    expect(container.querySelector("[data-testid]")).toBe(banner);
    expect(follows(banner, screen.getByRole("heading", { level: 1 }))).toBe(true);
  });

  it("opens the editorial grid with today's energies and the Arcana Map side by side", async () => {
    render(await DashboardPage());

    const energies = cellOf(screen.getByTestId("TodayEnergiesWidget"));
    const blueprint = cellOf(screen.getByTestId("BlueprintWidget"));
    const grid = energies.parentElement!;
    expect(grid).toBe(blueprint.parentElement);
    expect(grid.firstElementChild).toBe(energies);
    expect(energies.nextElementSibling).toBe(blueprint);
    expect(screen.getByTestId("TodayEnergiesWidget")).toHaveAttribute("data-user", "user-1");
    expect(screen.getByTestId("BlueprintWidget")).toHaveAttribute("data-user", "user-1");
    // Then the recent readings, the streak and the level, in that order
    const recientes = screen.getByRole("region", { name: "dashboard.recentReadings" });
    expect(follows(blueprint, recientes)).toBe(true);
    expect(follows(recientes, screen.getByTestId("StreakDisplay"))).toBe(true);
    expect(follows(screen.getByTestId("StreakDisplay"), screen.getByTestId("LevelWidget"))).toBe(true);
  });

  it("shows My story next to the challenges, in the same grid", async () => {
    render(await DashboardPage());

    const challenges = cellOf(screen.getByTestId("ChallengesWidget"));
    const insights = cellOf(screen.getByTestId("InsightsWidget"));
    expect(insights.parentElement).toBe(challenges.parentElement);
    expect(challenges.nextElementSibling).toBe(insights);
    expect(screen.getByTestId("InsightsWidget")).toHaveAttribute("data-user", "user-1");
  });

  it("has an Explore section with the four new places, reusing the landing texts", async () => {
    render(await DashboardPage());

    const section = screen.getByRole("region", { name: "dashboard.explore.title" });
    const links = within(section).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/calendar",
      "/compatibility",
      "/reading/manual",
      "/blueprint",
    ]);
    expect(links[0]).toHaveTextContent("pulse.moreThanTarot.calendar.title");
    expect(links[1]).toHaveTextContent("pulse.moreThanTarot.compatibility.description");
    expect(links[3]).toHaveTextContent("pulse.moreThanTarot.cta");
  });
});

describe("Dashboard · the table of engravings (ink band)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    withAna();
    db.reading.count.mockResolvedValue(0);
  });

  it("puts the greeting (the only h1) on the ink band, with at most 16 engravings of the latest cards", async () => {
    // 6 readings × 3 cards = 18 different cards: the band keeps the first 16, most recent first
    const ids = Array.from({ length: 18 }, (_, i) => `card-${i}`);
    const NAMES = [
      "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor", "The Hierophant",
      "The Lovers", "The Chariot", "Strength", "The Hermit", "Wheel of Fortune", "Justice",
      "The Hanged Man", "Death", "Temperance", "The Devil", "The Tower", "The Star",
    ];
    db.reading.findMany.mockResolvedValue(
      Array.from({ length: 6 }, (_, r) => reading(`r${r}`, ids.slice(r * 3, r * 3 + 3)))
    );
    db.card.findMany.mockResolvedValue(ids.map((id, i) => ({ id, name: NAMES[i] })));
    db.reading.count.mockResolvedValue(6);

    const { container } = render(await DashboardPage());

    const h1 = screen.getByRole("heading", { level: 1 });
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(h1).toHaveTextContent("dashboard.welcome");
    const banda = h1.closest("[data-suelo]");
    expect(banda).toHaveAttribute("data-suelo", "tinta");
    expect(banda?.querySelector(".mdg")).toHaveAttribute("aria-hidden", "true");

    const srcs = grabados(container);
    expect(srcs).toHaveLength(MAX_GRABADOS_MESA);
    expect(srcs[0]).toBe("/cartas/rws-tarot-00-fool-mesa.webp");
    expect(srcs).not.toContain("/cartas/rws-tarot-17-star-mesa.webp"); // the 18th card is left out
    expect(srcs.every((src) => /^\/cartas\/[a-z0-9-]+-mesa\.webp$/.test(src ?? ""))).toBe(true);
    // One query for the names, only for the cards of those readings
    expect(db.card.findMany).toHaveBeenCalledWith({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    expect(screen.getByText("dashboard.mesa.notaRecientes")).toBeInTheDocument();
    // The list shows only the three most recent readings, each with its small engravings
    const lista = within(screen.getByRole("region", { name: "dashboard.recentReadings" })).getAllByRole("link");
    expect(lista.map((a) => a.getAttribute("href"))).toEqual(["/history", "/reading/r0", "/reading/r1", "/reading/r2"]);
    expect(lista[1].querySelectorAll("img")).toHaveLength(3);
  });

  it("falls back to the fixed table for a new account and shows the empty states", async () => {
    withAna({ streak: 0 });
    db.reading.findMany.mockResolvedValue([]);

    const { container } = render(await DashboardPage());

    expect(db.card.findMany).not.toHaveBeenCalled();
    expect(grabados(container)).toEqual(MESA_FIJA.map((slug) => `/cartas/${slug}-mesa.webp`));
    expect(screen.getByText("dashboard.mesa.notaFijas")).toBeInTheDocument();

    // No readings: an invitation to the first one instead of a list
    const recientes = screen.getByRole("region", { name: "dashboard.recentReadings" });
    expect(within(recientes).getByText("dashboard.noReadings")).toBeInTheDocument();
    expect(within(recientes).getByRole("link", { name: "dashboard.firstReading" })).toHaveAttribute("href", "/reading/new");
    expect(within(recientes).queryByRole("list")).not.toBeInTheDocument();

    // No streak yet: the streak cell says how it starts (no empty hole in the grid)
    const racha = screen.getByRole("region", { name: "dashboard.streak.title" });
    expect(within(racha).getByText("dashboard.streak.empty")).toBeInTheDocument();
    expect(screen.queryByTestId("StreakDisplay")).not.toBeInTheDocument();
  });

  it("still renders the band with the fixed table if the card names can't be read", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    db.reading.findMany.mockResolvedValue([reading("r0", ["a", "b", "c"])]);
    db.card.findMany.mockRejectedValue(new Error("db down"));

    const { container } = render(await DashboardPage());

    expect(grabados(container)).toHaveLength(MAX_GRABADOS_MESA);
    expect(grabados(container)[0]).toBe(`/cartas/${MESA_FIJA[0]}-mesa.webp`);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    (console.error as jest.Mock).mockRestore();
  });
});

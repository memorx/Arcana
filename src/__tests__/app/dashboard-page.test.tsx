import { render, screen, within } from "@testing-library/react";
import DashboardPage from "@/app/(main)/dashboard/page";

jest.mock("@/lib/auth", () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: "user-1", email: "ana@example.com" } }),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        freeReadingsLeft: 0,
        credits: 4,
        name: "Ana",
        currentStreak: 2,
        longestStreak: 5,
      }),
    },
    reading: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    spreadType: { findMany: jest.fn().mockResolvedValue([]) },
    userProfile: { findUnique: jest.fn().mockResolvedValue({ userId: "user-1" }) },
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

const follows = (a: HTMLElement, b: HTMLElement) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe("Dashboard wiring (F-82)", () => {
  it("mounts the birthday banner first, above the welcome heading", async () => {
    const { container } = render(await DashboardPage());

    const banner = screen.getByTestId("BirthdayBanner");
    expect(banner).toHaveAttribute("data-user", "user-1");
    expect(container.querySelector("[data-testid]")).toBe(banner);
    expect(follows(banner, screen.getByRole("heading", { level: 1 }))).toBe(true);
  });

  it("puts today's energies and the Arcana Map in a two-column row right under the streak", async () => {
    render(await DashboardPage());

    const energies = screen.getByTestId("TodayEnergiesWidget");
    const blueprint = screen.getByTestId("BlueprintWidget");
    const row = energies.parentElement!;
    expect(row).toBe(blueprint.parentElement);
    expect(row).toHaveClass("grid", "gap-4", "md:grid-cols-2");
    expect(energies).toHaveAttribute("data-user", "user-1");
    expect(blueprint).toHaveAttribute("data-user", "user-1");
    expect(follows(screen.getByTestId("StreakDisplay"), row)).toBe(true);
    expect(follows(row, screen.getByTestId("LevelWidget"))).toBe(true);
  });

  it("shows My story next to the challenges", async () => {
    render(await DashboardPage());

    const insights = screen.getByTestId("InsightsWidget");
    expect(insights.parentElement).toBe(screen.getByTestId("ChallengesWidget").parentElement);
    expect(insights).toHaveAttribute("data-user", "user-1");
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

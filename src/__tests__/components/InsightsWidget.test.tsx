import { render, screen } from "@testing-library/react";

// Server translations: "key" or "key {json of values}", so the tests can see the values.
jest.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => (key: string, values?: Record<string, unknown>) =>
    values ? `${namespace}.${key} ${JSON.stringify(values)}` : `${namespace}.${key}`,
  getLocale: async () => "es",
}));
jest.mock("@/lib/prisma", () => ({
  prisma: { reading: { count: jest.fn() } },
}));
jest.mock("@/lib/insights", () => ({
  ...jest.requireActual("@/lib/insights"),
  getCardOfTheMonth: jest.fn(),
}));

import { InsightsWidget } from "@/components/dashboard/InsightsWidget";
import { SuitBars } from "@/components/insights/SuitBars";
import { MonthBars } from "@/components/insights/MonthBars";
import { prisma } from "@/lib/prisma";
import { getCardOfTheMonth } from "@/lib/insights";

const mockCardOfTheMonth = getCardOfTheMonth as jest.Mock;
const mockCount = prisma.reading.count as jest.Mock;

const tower = {
  cardId: "major_16",
  name: "The Tower",
  nameEs: "La Torre",
  imageUrl: "/cards/tower.jpg",
  arcana: "MAJOR" as const,
  suit: null,
  number: 16,
  count: 3,
  reversedCount: 1,
};

describe("InsightsWidget (F-56)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows the card of the month with its count and a link to My story", async () => {
    mockCardOfTheMonth.mockResolvedValue({ card: tower, monthReadings: 4 });

    render(await InsightsWidget({ userId: "user-1" }));

    expect(screen.getByText("La Torre")).toBeInTheDocument();
    expect(screen.getByText('insights.widget.count {"count":3}')).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /insights.widget.viewStory/ })).toHaveAttribute(
      "href",
      "/history/insights"
    );
    expect(mockCount).not.toHaveBeenCalled();
  });

  it("invites a first reading when there are no readings at all", async () => {
    mockCardOfTheMonth.mockResolvedValue({ card: null, monthReadings: 0 });
    mockCount.mockResolvedValue(0);

    render(await InsightsWidget({ userId: "user-1" }));

    expect(screen.getByText("insights.widget.emptyTitle")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/reading/new");
  });

  it("says there are no readings this month yet when the month is empty", async () => {
    mockCardOfTheMonth.mockResolvedValue({ card: null, monthReadings: 0 });
    mockCount.mockResolvedValue(12);

    render(await InsightsWidget({ userId: "user-1" }));

    expect(screen.getByText("insights.widget.noReadingsMonth")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/history/insights");
  });

  it("renders nothing instead of breaking the dashboard when the query fails", async () => {
    mockCardOfTheMonth.mockRejectedValue(new Error("db down"));
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(await InsightsWidget({ userId: "user-1" })).toBeNull();
    consoleError.mockRestore();
  });
});

describe("SuitBars", () => {
  it("draws one labelled bar per suit and describes the values for screen readers", async () => {
    const { container } = render(
      await SuitBars({ suits: { MAJOR: 40, WANDS: 25, CUPS: 20, SWORDS: 10, PENTACLES: 5 } })
    );

    const chart = screen.getByRole("img");
    expect(chart.getAttribute("aria-label")).toContain("insights.suits.names.MAJOR 40%");
    expect(chart.getAttribute("aria-label")).toContain("insights.suits.names.PENTACLES 5%");
    expect(screen.getByText("40%")).toBeInTheDocument();
    const widths = Array.from(container.querySelectorAll<HTMLElement>("[style]")).map((el) => el.style.width);
    expect(widths).toEqual(["40%", "25%", "20%", "10%", "5%"]);
  });

  it("shows a short message when there are no cards", async () => {
    render(await SuitBars({ suits: { MAJOR: 0, WANDS: 0, CUPS: 0, SWORDS: 0, PENTACLES: 0 } }));

    // The window comes from INSIGHTS_WINDOW_DAYS, not from the text (N-4)
    expect(screen.getByText('insights.suits.empty {"days":90}')).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

describe("MonthBars", () => {
  it("draws 12 bars scaled to the busiest month, with the values in the label", async () => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      year: i < 1 ? 2025 : 2026,
      month: i < 1 ? 12 : i,
      count: i === 11 ? 4 : i === 5 ? 2 : 0,
    }));

    const { container } = render(await MonthBars({ months }));

    const label = screen.getByRole("img").getAttribute("aria-label")!;
    expect(label).toContain("diciembre de 2025: 0");
    expect(label).toContain(": 4");
    const heights = Array.from(container.querySelectorAll<HTMLElement>("[style]")).map((el) => el.style.height);
    expect(heights).toHaveLength(12);
    expect(heights[11]).toBe("100%");
    expect(heights[5]).toBe("50%");
    expect(heights[0]).toBe("3px");
  });
});

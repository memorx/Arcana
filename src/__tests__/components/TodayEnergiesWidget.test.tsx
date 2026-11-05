import { render, screen } from "@testing-library/react";

jest.mock("next-intl/server", () => ({
  getLocale: jest.fn(async () => "es"),
  getTranslations: jest.fn(async () => (key: string) => key),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: { userProfile: { findUnique: jest.fn() } },
}));

// Pin "today" to 2026-11-04 (13 Miquiztli)
jest.mock("@/lib/systems", () => ({
  ...jest.requireActual("@/lib/systems"),
  todayUtc: () => new Date(Date.UTC(2026, 10, 4)),
}));

import { TodayEnergiesWidget } from "@/components/dashboard/TodayEnergiesWidget";
import { prisma } from "@/lib/prisma";

const mockFindProfile = prisma.userProfile.findUnique as jest.Mock;

describe("TodayEnergiesWidget", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows tonalli, moon and personal day in one row with a link to the calendar", async () => {
    mockFindProfile.mockResolvedValue({ birthDate: new Date(Date.UTC(1990, 6, 15)) });

    render(await TodayEnergiesWidget({ userId: "user-1" }));

    expect(mockFindProfile).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { birthDate: true },
    });
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("13 Muerte")).toBeInTheDocument();
    expect(screen.getByText("Luna menguante")).toBeInTheDocument();
    expect(screen.getByText("La alianza")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "calendarLink" })).toHaveAttribute("href", "/calendar");
  });

  it("invites to add the birth date without a profile", async () => {
    mockFindProfile.mockResolvedValue(null);

    render(await TodayEnergiesWidget({ userId: "user-1" }));

    expect(screen.getByRole("link", { name: "addBirthDate" })).toHaveAttribute("href", "/profile/setup");
    expect(screen.getByText("13 Muerte")).toBeInTheDocument();
  });

  it("still renders the day if the profile can't be read", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockFindProfile.mockRejectedValue(new Error("db down"));

    render(await TodayEnergiesWidget({ userId: "user-1" }));

    expect(screen.getByText("13 Muerte")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "addBirthDate" })).toBeInTheDocument();
  });
});

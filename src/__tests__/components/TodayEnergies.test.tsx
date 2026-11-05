import { render, screen } from "@testing-library/react";
import { TodayEnergies } from "@/components/energies/TodayEnergies";
import { describeDayEnergies, getDayEnergies } from "@/lib/systems";

// next-intl is mocked in jest.setup.ts: t(key) returns the key, locale "es".

const TODAY = new Date(Date.UTC(2026, 10, 4)); // 13 Miquiztli
const BIRTH = new Date(Date.UTC(1990, 6, 15)); // personal day 2 on that date

describe("TodayEnergies", () => {
  it("shows the tonalli, the moon and the personal day with the day's summary", () => {
    render(<TodayEnergies date={TODAY} birthDate={BIRTH} />);

    expect(screen.getByRole("heading", { name: "title" })).toBeInTheDocument();
    expect(screen.getByText("13 Miquiztli · 13 Muerte")).toBeInTheDocument();
    // t() returns the key in tests, so the illumination shows as "illumination"
    expect(screen.getByText("Luna menguante · illumination")).toBeInTheDocument();
    expect(screen.getByText("personalDayValue")).toBeInTheDocument();

    // The same text the AI gets for the daily card
    for (const line of describeDayEnergies(getDayEnergies(TODAY, BIRTH), "es").split("\n")) {
      expect(screen.getByText(line)).toBeInTheDocument();
    }
    expect(screen.getByText(/^Día personal 2:/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /calendarLink/ })).toHaveAttribute("href", "/calendar");
  });

  it("invites to add the birth date when there is none", () => {
    render(<TodayEnergies date={TODAY} />);

    expect(screen.getByRole("link", { name: "addBirthDate" })).toHaveAttribute("href", "/profile/setup");
    expect(screen.queryByText(/^Día personal/)).not.toBeInTheDocument();
    expect(screen.getByText("13 Miquiztli · 13 Muerte")).toBeInTheDocument();
  });
});

import { render, screen, within } from "@testing-library/react";

jest.mock("@/lib/auth", () => ({ auth: jest.fn(async () => null) }));

jest.mock("next-intl/server", () => ({
  getLocale: jest.fn(async () => "es"),
  getTranslations: jest.fn(async () => (key: string) => key),
}));

// Parts of the page that fetch or need a session are not under test here
jest.mock("@/components/layout", () => ({ Header: () => null, Footer: () => null }));
jest.mock("@/components/landing", () => ({
  ReadingCounter: () => null,
  DailyCardPreview: () => null,
  Testimonials: () => null,
}));
jest.mock("@/components/landing/CollectivePulse", () => ({ CollectivePulse: () => null }));

import Home from "@/app/page";

describe("Landing: More than tarot", () => {
  it("links the four new experiences", async () => {
    render(await Home());

    const section = screen.getByRole("region", { name: "moreThanTarot.title" });
    const hrefs = within(section)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));

    expect(hrefs).toEqual(["/blueprint", "/calendar", "/reading/manual", "/compatibility"]);
    expect(within(section).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "moreThanTarot.blueprint.title",
      "moreThanTarot.calendar.title",
      "moreThanTarot.manual.title",
      "moreThanTarot.compatibility.title",
    ]);
  });
});

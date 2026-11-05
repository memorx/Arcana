import { render, screen } from "@testing-library/react";
import NewReadingPage from "@/app/(main)/reading/new/page";

jest.mock("@/lib/auth", () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: "user-1" } }),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn().mockResolvedValue({ freeReadingsLeft: 0, credits: 3 }) },
    spreadType: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "s1",
          name: "Three Cards",
          nameEs: "Tres Cartas",
          description: "",
          descriptionEs: "",
          cardCount: 3,
          creditCost: 1,
          category: "classic",
          positions: [],
        },
      ]),
    },
  },
}));

jest.mock("next-intl/server", () => ({
  getTranslations: jest.fn(async (namespace: string) => (key: string) => `${namespace}.${key}`),
  getLocale: jest.fn(async () => "es"),
}));

describe("/reading/new entry to the own-deck flow (F-60)", () => {
  it("shows a card that links to /reading/manual", async () => {
    render(await NewReadingPage());

    const title = screen.getByText("manual.entryTitle");
    const link = title.closest("a");
    expect(link).toHaveAttribute("href", "/reading/manual");
    expect(link).toHaveTextContent("manual.entryDescription");
    expect(link).toHaveTextContent("manual.entryCta");
  });

  it("keeps the regular spreads", async () => {
    render(await NewReadingPage());

    expect(screen.getByText("Tres Cartas").closest("a")).toHaveAttribute("href", "/reading/new/s1");
  });
});

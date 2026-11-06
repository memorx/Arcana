import { render, screen } from "@testing-library/react";

jest.mock("@/lib/pulse", () => ({
  getCollectivePulse: jest.fn(),
}));

jest.mock("next-intl/server", () => ({
  getLocale: jest.fn(async () => "es"),
  getTranslations: jest.fn(async () =>
    Object.assign(
      (key: string, values?: Record<string, unknown>) =>
        values ? `${key}(${Object.values(values).join(",")})` : key,
      {
        rich: (_key: string, values: { card: string; hl: (chunks: string) => unknown }) =>
          values.hl(values.card),
      }
    )
  ),
}));

import { CollectivePulse } from "@/components/landing/CollectivePulse";
import { getCollectivePulse } from "@/lib/pulse";

const mockPulse = getCollectivePulse as jest.Mock;

const pulse = {
  enough: true,
  date: "2026-11-04",
  cards: [
    { name: "The Sun", nameEs: "El Sol", percent: 40 },
    { name: "The Moon", nameEs: "La Luna", percent: 30 },
    { name: "The Star", nameEs: "La Estrella", percent: 20 },
  ],
};

describe("CollectivePulse", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when there are too few readings", async () => {
    mockPulse.mockResolvedValue({ enough: false });

    expect(await CollectivePulse()).toBeNull();
  });

  it("renders nothing when the pulse fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockPulse.mockRejectedValue(new Error("db down"));

    expect(await CollectivePulse()).toBeNull();
    jest.restoreAllMocks();
  });

  it("shows the most drawn card with its image and share, and the runners-up", async () => {
    mockPulse.mockResolvedValue(pulse);

    render((await CollectivePulse())!);

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("El Sol");
    // La imagen sale de las cartas autohospedadas (cartaImagen), nunca de la URL guardada en la base.
    expect(screen.getByAltText("El Sol")).toHaveAttribute("src", "/cartas/rws-tarot-19-sun-color.webp");
    expect(screen.getByText("share(40)")).toBeInTheDocument();
    expect(screen.getByText("La Luna · 30%")).toBeInTheDocument();
    expect(screen.getByText("La Estrella · 20%")).toBeInTheDocument();
    expect(screen.getByText("anonymous")).toBeInTheDocument();
  });

  it("is a band on ink, named by its heading", async () => {
    mockPulse.mockResolvedValue(pulse);

    render((await CollectivePulse())!);

    const banda = screen.getByRole("region", { name: "El Sol" });
    expect(banda).toHaveClass("suelo-tinta");
    expect(banda.querySelector("h2")).toHaveAttribute("id", "collective-pulse-title");
    expect(banda.querySelector("ul")).toHaveClass("flex-wrap");
  });

  it("leaves the runners-up list out when only one card is known", async () => {
    mockPulse.mockResolvedValue({ ...pulse, cards: [pulse.cards[0]] });

    render((await CollectivePulse())!);

    expect(screen.queryByText("also")).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});

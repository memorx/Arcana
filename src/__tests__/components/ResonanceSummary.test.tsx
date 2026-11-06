/**
 * ResonanceSummary: el promedio de resonancia (1–5) con decimal mexicano («4.5», no «4,5» de es-ES), la cifra en
 * Martian Mono y la barra con su nombre accesible. Sin calificaciones: el aviso.
 */
import { render, screen } from "@testing-library/react";
import { ResonanceSummary } from "@/components/insights/ResonanceSummary";

let mockLocale: "es" | "en" = "es";

jest.mock("next-intl/server", () => ({
  getLocale: jest.fn(async () => mockLocale),
  getTranslations: jest.fn(async (ns: string) => (key: string, values?: Record<string, unknown>) =>
    values ? `${ns}.${key}:${Object.values(values).join(",")}` : `${ns}.${key}`
  ),
}));

describe("ResonanceSummary", () => {
  beforeEach(() => {
    mockLocale = "es";
  });

  it("en español, el decimal con punto (es-MX): 4.5 y 4.0", async () => {
    const { container, unmount } = render(await ResonanceSummary({ resonance: { count: 3, average: 4.5 } }));
    const cifra = container.querySelector("p")!;
    expect(cifra.firstChild?.textContent).toBe("4.5");
    expect(cifra).toHaveTextContent(/^4\.5\/5$/);
    expect(cifra).toHaveClass("font-dato");
    expect(cifra).not.toHaveClass("font-titulo");
    expect(screen.getByRole("img")).toHaveAccessibleName("insights.resonance.chartLabel:4.5");
    expect(container.textContent).not.toContain("4,5");
    unmount();

    const { container: otro } = render(await ResonanceSummary({ resonance: { count: 1, average: 4 } }));
    expect(otro.querySelector("p")!.firstChild?.textContent).toBe("4.0");
  });

  it("en inglés también con punto", async () => {
    mockLocale = "en";
    const { container } = render(await ResonanceSummary({ resonance: { count: 2, average: 3.25 } }));
    expect(container.querySelector("p")!.firstChild?.textContent).toBe("3.3");
  });

  it("sin lecturas calificadas: el aviso, sin cifra", async () => {
    render(await ResonanceSummary({ resonance: { count: 0, average: null } }));
    expect(screen.getByText("insights.resonance.empty")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });
});

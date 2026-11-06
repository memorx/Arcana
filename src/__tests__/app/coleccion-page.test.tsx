/**
 * /collection en «Dos tintas» (L5): índice de los 78 grabados por palo. Las descubiertas a color y enlazadas a su
 * ficha; las no descubiertas en tinta tenue y sin enlace; la dorada es la única con brasa rosa; contador «N de 78»
 * y barra de progreso accesible; filtros como botones de alternar. Textos reales de messages/.
 */
import { render, screen, within, fireEvent } from "@testing-library/react";
import CollectionPage from "@/app/(main)/collection/page";
import { CARTAS } from "@/lib/cartas";

let mockLocale: "es" | "en" = "es";
const mockMensajes: Record<string, unknown> = {
  es: jest.requireActual("../../../messages/es.json"),
  en: jest.requireActual("../../../messages/en.json"),
};

jest.mock("next-intl", () => ({
  useLocale: () => mockLocale,
  useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) => {
    const msg = `${ns}.${key}`
      .split(".")
      .reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), mockMensajes[mockLocale]);
    if (typeof msg !== "string") throw new Error(`falta ${ns}.${key}`);
    return msg.replace(/\{(\w+)\}/g, (_, k: string) => String(values?.[k] ?? `{${k}}`));
  },
}));

const PALOS_DB = ["WANDS", "CUPS", "SWORDS", "PENTACLES"] as const;

/** Las 78 como las devuelve /api/collection (orden del seed). */
function coleccion(descubiertas: string[], doradas: string[]) {
  return CARTAS.map((c, i) => {
    const mayor = i < 22;
    const palo = mayor ? null : PALOS_DB[Math.floor((i - 22) / 14)];
    return {
      id: `c${i}`,
      name: c.name,
      nameEs: c.name === "The Star" ? "La Estrella" : c.name === "The Fool" ? "El Loco" : `es ${c.name}`,
      slug: c.name.toLowerCase().replace(/ /g, "-"),
      arcana: mayor ? "MAJOR" : "MINOR",
      suit: palo,
      number: mayor ? i : ((i - 22) % 14) + 1,
      isDiscovered: descubiertas.includes(c.name) || doradas.includes(c.name),
      isGolden: doradas.includes(c.name),
    };
  });
}

function responder(datos: unknown) {
  global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve(datos) }) as unknown as typeof fetch;
}

const HISTORIA = {
  cards: coleccion(["The Fool", "Two of Cups"], ["The Star"]),
  stats: { discovered: 3, total: 78, percentage: 4 },
  goldenStats: { discovered: 1, total: 78, percentage: 1, totalGoldenCardsFound: 1 },
};

describe("/collection", () => {
  beforeEach(() => {
    mockLocale = "es";
  });

  it("contador «3 de 78» en mono y barra de progreso con sus valores", async () => {
    responder(HISTORIA);
    const { container } = render(<CollectionPage />);
    await screen.findByRole("heading", { level: 2, name: "Arcanos Mayores" });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^tu colección$/i);
    expect(container.querySelector("[data-contador]")?.textContent?.replace(/\s+/g, " ").trim()).toBe("3 de 78");

    const barra = screen.getByRole("progressbar", { name: "3 de 78 cartas descubiertas" });
    expect(barra).toHaveAttribute("aria-valuenow", "3");
    expect(barra).toHaveAttribute("aria-valuemin", "0");
    expect(barra).toHaveAttribute("aria-valuemax", "78");
    expect(barra).toHaveAttribute("aria-valuetext", "3 de 78");

    const dorada = screen.getByRole("progressbar", { name: "1 de 78 cartas doradas" });
    expect(dorada).toHaveAttribute("aria-valuenow", "1");
  });

  it("las descubiertas a color y enlazadas; las no descubiertas en tinta tenue y sin enlace", async () => {
    responder(HISTORIA);
    const { container } = render(<CollectionPage />);
    await screen.findByRole("heading", { level: 2, name: "Arcanos Mayores" });

    const descubiertas = container.querySelectorAll("li[data-carta='descubierta'], li[data-carta='dorada']");
    expect(descubiertas).toHaveLength(3);
    for (const li of descubiertas) {
      expect(li.querySelector("a")?.getAttribute("href")).toMatch(/^\/cards\/[a-z-]+$/);
      expect(li.querySelector("img")?.getAttribute("src")).toMatch(/^\/cartas\/[a-z0-9-]+-color\.webp$/);
    }
    expect(screen.getByRole("link", { name: /El Loco/ })).toHaveAttribute("href", "/cards/the-fool");

    const porDescubrir = container.querySelectorAll("li[data-carta='por-descubrir']");
    expect(porDescubrir).toHaveLength(75);
    for (const li of porDescubrir) {
      expect(li.querySelector("a")).toBeNull();
      const img = li.querySelector("img")!;
      expect(img.getAttribute("src")).toMatch(/-tinta\.webp$/);
      expect(img.getAttribute("alt")).toBe("");
      expect(img.className).toMatch(/opacity-\[0\.22\]/);
      expect(within(li as HTMLElement).getByText("Por descubrir")).toHaveClass("sr-only");
    }

    // Ninguna imagen sale de Wikimedia ni de imageUrl.
    for (const img of container.querySelectorAll("img")) expect(img.getAttribute("src")).toMatch(/^\/cartas\//);
  });

  it("las cortes no llevan número romano, descubiertas o no (el Rey de Bastos no es XIV)", async () => {
    responder({ ...HISTORIA, cards: coleccion(["King of Wands", "Temperance"], []) });
    const { container } = render(<CollectionPage />);
    await screen.findByRole("heading", { level: 2, name: "Arcanos Mayores" });

    const numeral = (li: Element) => li.querySelector("span[aria-hidden='true'].font-dato, span.font-dato > span[aria-hidden='true']")?.textContent;
    expect(numeral(screen.getByRole("link", { name: /es King of Wands/ }).closest("li")!)).toBe(" ");
    expect(numeral(screen.getByRole("link", { name: /es Temperance/ }).closest("li")!)).toBe("XIV");
    // Sin descubrir: las otras 15 cortes tampoco llevan número (ningún XIV queda: La Templanza está descubierta).
    const porDescubrir = [...container.querySelectorAll("li[data-carta='por-descubrir']")].map(numeral);
    expect(porDescubrir.filter((n) => n === "XIV")).toHaveLength(0);
    expect(porDescubrir.filter((n) => n === " ")).toHaveLength(15);
    expect(porDescubrir.filter((n) => n === "X")).toHaveLength(5); // la Rueda y los cuatro Dieces
  });

  it("la dorada es la única con brasa rosa persistente", async () => {
    responder(HISTORIA);
    const { container } = render(<CollectionPage />);
    await screen.findByRole("heading", { level: 2, name: "Arcanos Mayores" });

    const brasas = container.querySelectorAll(".golden-card-glow");
    expect(brasas).toHaveLength(1);
    expect(brasas[0].closest("li")).toHaveAttribute("data-carta", "dorada");
    expect(brasas[0].closest("a")).toHaveAttribute("href", "/cards/the-star");
    expect(container.querySelectorAll(".golden-card-border")).toHaveLength(1);
    expect(container.querySelectorAll(".golden-shimmer-effect")).toHaveLength(1);
    expect(screen.getByRole("link", { name: /La Estrella/ })).toHaveTextContent("Dorada");
  });

  it("un índice por palo con su cuenta, y filtros que alternan", async () => {
    responder(HISTORIA);
    const { container } = render(<CollectionPage />);
    await screen.findByRole("heading", { level: 2, name: "Arcanos Mayores" });

    const secciones = ["Arcanos Mayores", "Bastos", "Copas", "Espadas", "Oros"];
    for (const nombre of secciones) expect(screen.getByRole("heading", { level: 2, name: nombre })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Copas" }).nextElementSibling).toHaveTextContent("1 de 14");

    const grupo = screen.getByRole("group", { name: "Filtrar la colección" });
    const todas = within(grupo).getByRole("button", { name: "Todas" });
    const copas = within(grupo).getByRole("button", { name: /Copas/ });
    expect(todas).toHaveAttribute("aria-pressed", "true");
    expect(copas).toHaveAttribute("aria-pressed", "false");
    expect(copas).toHaveTextContent("1/14");

    fireEvent.click(copas);
    expect(copas).toHaveAttribute("aria-pressed", "true");
    expect(todas).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("heading", { level: 2, name: "Bastos" })).toBeNull();
    expect(container.querySelectorAll("li[data-carta]")).toHaveLength(14);

    fireEvent.click(within(grupo).getByRole("button", { name: /cartas doradas/i }));
    expect(container.querySelectorAll("li[data-carta]")).toHaveLength(1);
    expect(container.querySelector("li[data-carta]")).toHaveAttribute("data-carta", "dorada");
  });

  it("vacío: 0 de 78, todas en tinta tenue y la invitación a leer", async () => {
    responder({
      cards: coleccion([], []),
      stats: { discovered: 0, total: 78, percentage: 0 },
      goldenStats: { discovered: 0, total: 78, percentage: 0, totalGoldenCardsFound: 0 },
    });
    const { container } = render(<CollectionPage />);
    await screen.findByRole("heading", { level: 2, name: "Arcanos Mayores" });

    expect(container.querySelector("[data-contador]")?.textContent?.replace(/\s+/g, " ").trim()).toBe("0 de 78");
    expect(container.querySelectorAll("li[data-carta='por-descubrir']")).toHaveLength(78);
    expect(container.querySelectorAll(".golden-card-glow")).toHaveLength(0);
    expect(screen.getByRole("link", { name: /^iniciar lectura$/i })).toHaveAttribute("href", "/reading/new");

    fireEvent.click(screen.getByRole("button", { name: /cartas doradas/i }));
    expect(screen.getByText("1% de probabilidad por carta")).toBeInTheDocument();
  });

  it("un solo h1, encabezados en orden y nada de la paleta vieja", async () => {
    responder(HISTORIA);
    const { container } = render(<CollectionPage />);
    await screen.findByRole("heading", { level: 2, name: "Arcanos Mayores" });

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(
      /(slate|purple|violet|indigo|fuchsia|pink|amber|yellow|orange|red|rose|emerald|green|teal|blue|sky|cyan)-\d{2,3}|text-white/
    );
  });

  it("si la API falla, no se rompe", async () => {
    responder({ error: "Unauthorized" });
    render(<CollectionPage />);
    expect(await screen.findByRole("link", { name: /^iniciar lectura$/i })).toBeInTheDocument();
  });
});

/**
 * /cards y /cards/[slug] en «Dos tintas» (L5), páginas públicas que se pintan completas en el servidor:
 * índice de los 78 grabados por palo con filtros que funcionan sin JS (enlaces y GET) y al instante con JS;
 * la ficha como lámina (grabado a color, número romano, palabras clave, significados) y su metadata intacta.
 */
import { render, screen, within, fireEvent } from "@testing-library/react";
import CardsPage from "@/app/(main)/cards/page";
import CardDetailPage, { generateMetadata } from "@/app/(main)/cards/[slug]/page";
import { CARTAS } from "@/lib/cartas";
import { numeroRomano } from "@/app/(main)/cards/indice";

let mockLocale: "es" | "en" = "es";
const mockMensajes: Record<string, unknown> = {
  es: jest.requireActual("../../../messages/es.json"),
  en: jest.requireActual("../../../messages/en.json"),
};
function mockTraducir(ns: string) {
  return (key: string, values?: Record<string, unknown>) => {
    const msg = `${ns}.${key}`
      .split(".")
      .reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), mockMensajes[mockLocale]);
    if (typeof msg !== "string") throw new Error(`falta ${ns}.${key}`);
    return msg.replace(/\{(\w+)\}/g, (_, k: string) => String(values?.[k] ?? `{${k}}`));
  };
}

jest.mock("next-intl", () => ({
  useLocale: () => mockLocale,
  useTranslations: (ns: string) => mockTraducir(ns),
}));
jest.mock("next-intl/server", () => ({
  getTranslations: async (ns: string) => mockTraducir(ns),
  getLocale: async () => mockLocale,
}));
jest.mock("@/lib/prisma", () => ({
  prisma: { card: { findMany: jest.fn(), findUnique: jest.fn() } },
}));
jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => "/cards",
  useSearchParams: () => new URLSearchParams(),
}));

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

const findMany = prisma.card.findMany as unknown as jest.Mock;
const findUnique = prisma.card.findUnique as unknown as jest.Mock;

const PALOS_DB = ["WANDS", "CUPS", "SWORDS", "PENTACLES"] as const;
const NOMBRES_ES: Record<string, string> = { "The Star": "La Estrella", "The Fool": "El Loco", "Two of Cups": "Dos de Copas" };

const BARAJA = CARTAS.map((c, i) => {
  const mayor = i < 22;
  return {
    id: `c${i}`,
    name: c.name,
    nameEs: NOMBRES_ES[c.name] ?? `es ${c.name}`,
    slug: c.name.toLowerCase().replace(/ /g, "-"),
    arcana: mayor ? "MAJOR" : "MINOR",
    suit: mayor ? null : PALOS_DB[Math.floor((i - 22) / 14)],
    number: mayor ? i : ((i - 22) % 14) + 1,
    keywords: c.name === "The Star" ? ["esperanza", "renovacion"] : ["clave"],
  };
});

const pagina = async (searchParams: Record<string, string> = {}) =>
  render(await CardsPage({ searchParams: Promise.resolve(searchParams) }));

describe("numeroRomano", () => {
  it("0 se queda 0 (El Loco); 17 → XVII; 14 → XIV; 21 → XXI", () => {
    expect([0, 1, 4, 9, 14, 17, 21].map(numeroRomano)).toEqual(["0", "I", "IV", "IX", "XIV", "XVII", "XXI"]);
  });
});

describe("/cards", () => {
  beforeEach(() => {
    mockLocale = "es";
    findMany.mockReset().mockResolvedValue(BARAJA);
    jest.spyOn(window.history, "replaceState").mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it("pide las cartas como /api/cards y pinta las 78 por palo, en tinta, enlazadas a su ficha", async () => {
    const { container } = await pagina();

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ arcana: "asc" }, { suit: "asc" }, { number: "asc" }] })
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^explora el tarot$/i);
    for (const nombre of ["Arcanos Mayores", "Bastos", "Copas", "Espadas", "Oros"]) {
      expect(screen.getByRole("heading", { level: 2, name: nombre })).toBeInTheDocument();
    }
    expect(screen.getByText("Mostrando 78 cartas")).toBeInTheDocument();

    const fichas = container.querySelectorAll("section li a");
    expect(fichas).toHaveLength(78);
    expect(screen.getByRole("link", { name: "La Estrella" })).toHaveAttribute("href", "/cards/the-star");
    for (const img of container.querySelectorAll("section li img")) {
      expect(img.getAttribute("src")).toMatch(/^\/cartas\/[a-z0-9-]+-tinta\.webp$/);
    }
    expect(screen.getByRole("link", { name: /^comenzar lectura$/i })).toHaveAttribute("href", "/reading/new");
  });

  it("los filtros son enlaces (sirven sin JS) con aria-current; ?palo=cups pinta sólo Copas", async () => {
    const { container } = await pagina({ palo: "cups" });

    const nav = screen.getByRole("navigation", { name: "Filtrar por palo" });
    const copas = within(nav).getByRole("link", { name: "Copas" });
    expect(copas).toHaveAttribute("href", "/cards?palo=cups");
    expect(copas).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Todas" })).toHaveAttribute("href", "/cards");
    expect(within(nav).getByRole("link", { name: "Todas" })).not.toHaveAttribute("aria-current");

    expect(screen.queryByRole("heading", { level: 2, name: "Bastos" })).toBeNull();
    expect(container.querySelectorAll("section li a")).toHaveLength(14);
    expect(screen.getByText("Mostrando 14 cartas")).toBeInTheDocument();
  });

  it("la búsqueda es un GET (?q=) y filtra por nombre o palabra clave; un palo inválido se ignora", async () => {
    const { container } = await pagina({ q: "esperanza", palo: "nada" });

    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("action", "/cards");
    expect(form).toHaveAttribute("method", "get");
    const campo = screen.getByLabelText("Buscar una carta");
    expect(campo).toHaveAttribute("id", "buscar-cartas");
    expect(campo).toHaveAttribute("name", "q");
    expect(campo).toHaveValue("esperanza");

    expect(container.querySelectorAll("section li a")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "La Estrella" })).toBeInTheDocument();
  });

  it("con JS filtra al instante y deja la URL al día", async () => {
    const { container } = await pagina();
    const nav = screen.getByRole("navigation", { name: "Filtrar por palo" });

    fireEvent.click(within(nav).getByRole("link", { name: "Bastos" }));
    expect(window.history.replaceState).toHaveBeenLastCalledWith(null, "", "/cards?palo=wands");
    expect(within(nav).getByRole("link", { name: "Bastos" })).toHaveAttribute("aria-current", "page");
    expect(container.querySelectorAll("section li a")).toHaveLength(14);

    fireEvent.change(screen.getByLabelText("Buscar una carta"), { target: { value: "zzz" } });
    expect(screen.getByText("No se encontraron cartas")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Limpiar filtros" }));
    expect(container.querySelectorAll("section li a")).toHaveLength(78);
    expect(window.history.replaceState).toHaveBeenLastCalledWith(null, "", "/cards");
  });

  it("en inglés, los nombres en inglés", async () => {
    mockLocale = "en";
    await pagina({ palo: "major" });
    expect(screen.getByRole("link", { name: "The Star" })).toHaveAttribute("href", "/cards/the-star");
  });
});

const ESTRELLA = {
  id: "c17",
  name: "The Star",
  nameEs: "La Estrella",
  slug: "the-star",
  arcana: "MAJOR",
  suit: null,
  number: 17,
  keywords: ["esperanza", "renovacion", "espiritualidad"],
  meaningUpright: "Esperanza tras la tormenta. ".repeat(10),
  meaningReversed: "Desaliento pasajero.",
  meaningUprightEn: "Hope after the storm.",
  meaningReversedEn: "Passing discouragement.",
  imageUrl: "https://upload.wikimedia.org/no-se-usa.jpg",
};

describe("/cards/[slug]", () => {
  const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

  beforeEach(() => {
    mockLocale = "es";
    findUnique.mockReset();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it("la lámina: grabado a color propio, número romano, nombre, palabras clave y los dos significados", async () => {
    findUnique.mockResolvedValue(ESTRELLA);
    const { container } = render(await CardDetailPage(params("the-star")));

    expect(findUnique).toHaveBeenCalledWith({ where: { slug: "the-star" } });
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("La Estrella");
    expect(screen.getByText("XVII")).toBeInTheDocument();
    expect(screen.getByText("The Star")).toBeInTheDocument();

    const img = screen.getByRole("img", { name: "La Estrella" });
    expect(img).toHaveAttribute("src", "/cartas/rws-tarot-17-star-color.webp");
    expect(container.innerHTML).not.toMatch(/wikimedia/);

    const claves = screen.getByRole("heading", { level: 2, name: /^palabras clave$/i }).closest("section")!;
    expect(within(claves).getAllByRole("listitem").map((li) => li.textContent)).toEqual(ESTRELLA.keywords);

    expect(screen.getByRole("heading", { level: 2, name: /^significado al derecho$/i }).closest("section")).toHaveTextContent(
      "Esperanza tras la tormenta."
    );
    expect(screen.getByRole("heading", { level: 2, name: /^significado invertido$/i }).closest("section")).toHaveTextContent(
      "Desaliento pasajero."
    );
    expect(screen.getByRole("link", { name: /Volver a las cartas/ })).toHaveAttribute("href", "/cards");
    expect(screen.getByRole("link", { name: /^comenzar lectura$/i })).toHaveAttribute("href", "/reading/new");
    expect(container.innerHTML).not.toMatch(/(slate|purple|amber|red)-\d{2,3}|text-white|prose/);
  });

  it("en inglés usa los significados en inglés", async () => {
    mockLocale = "en";
    findUnique.mockResolvedValue(ESTRELLA);
    render(await CardDetailPage(params("the-star")));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("The Star");
    expect(screen.getByText("Hope after the storm.")).toBeInTheDocument();
  });

  it("una carta que no existe → notFound()", async () => {
    findUnique.mockResolvedValue(null);
    await expect(CardDetailPage(params("no-existe"))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("metadata intacta", async () => {
    findUnique.mockResolvedValue(ESTRELLA);
    await expect(generateMetadata(params("the-star"))).resolves.toEqual({
      title: "The Star - La Estrella",
      description: ESTRELLA.meaningUpright.slice(0, 160),
    });
    findUnique.mockResolvedValue(null);
    await expect(generateMetadata(params("x"))).resolves.toEqual({ title: "Card Not Found" });
  });
});

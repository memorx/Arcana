/**
 * L6 · textos (rediseño «Dos tintas»): blog (índice y artículo: el «# » del Markdown baja a h2, nada de
 * clases prose), legales como documento con un h1, el 404 «carta perdida» con enlace a inicio y la página
 * de error en tinta. Los componentes de servidor se renderizan con next-intl/server y prisma simulados.
 */
import { fireEvent, render, screen, within } from "@testing-library/react";

jest.mock("@/lib/prisma", () => ({
  prisma: { blogPost: { findMany: jest.fn(), findUnique: jest.fn() } },
}));

jest.mock("next-intl/server", () => ({
  getTranslations: jest.fn(async (namespace: string) => (key: string) => `${namespace}.${key}`),
  getLocale: jest.fn(async () => "es"),
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// La cabecera y el pie son de F1-A (con sesión y fetch): aquí sólo importa que el 404 los traiga.
jest.mock("@/components/layout", () => ({
  Header: () => <header data-testid="cabecera" />,
  Footer: () => <footer data-testid="pie" />,
}));

import { prisma } from "@/lib/prisma";
import BlogPage from "@/app/(main)/blog/page";
import BlogPostPage from "@/app/(main)/blog/[slug]/page";
import { bloquesDelArticulo, grabadoDelArticulo } from "@/app/(main)/blog/contenido";
import AboutPage from "@/app/(legal)/about/page";
import PrivacyPage from "@/app/(legal)/privacy/page";
import TermsPage from "@/app/(legal)/terms/page";
import NotFound from "@/app/not-found";
import ErrorPage from "@/app/error";

const findMany = (prisma.blogPost as unknown as { findMany: jest.Mock }).findMany;
const findUnique = (prisma.blogPost as unknown as { findUnique: jest.Mock }).findUnique;

const POST = {
  id: "p1",
  slug: "beginners-guide-tarot-interpretation",
  title: "Beginner's Guide: How to Interpret Tarot Cards",
  titleEs: "Guía para principiantes: Cómo interpretar el tarot",
  excerpt: "Learn the basics.",
  excerptEs: "Aprende lo básico.",
  content: "# Beginner's Guide",
  contentEs: [
    "# Guía para principiantes: cómo interpretar el tarot",
    "",
    "La lectura del tarot es un arte antiguo.",
    "",
    "## Entendiendo el Mazo",
    "### Los Arcanos Mayores (22 cartas)",
    "- **Bastos**: Pasión",
    "- **Copas**: Emociones",
    "",
    "1. **Crea un ambiente tranquilo**: sin ruido",
    "2. **Despeja tu mente**: respira",
    "# Otro título de primer nivel",
  ].join("\n"),
  coverImage: null,
  published: true,
  publishedAt: new Date("2024-01-15T00:00:00Z"),
};

const SIN_PALETA_VIEJA =
  /\b(?:bg|text|border|from|to|via|ring|shadow)-(?:slate|purple|violet|indigo|fuchsia|pink|amber|yellow|orange|red|rose|emerald|green|teal|blue|sky|cyan|lime)-\d|text-white|\bprose\b|prose-/;

function unSoloH1(texto?: string) {
  const h1 = screen.getAllByRole("heading", { level: 1 });
  expect(h1).toHaveLength(1);
  if (texto) expect(h1[0]).toHaveTextContent(texto);
  return h1[0];
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Markdown del blog", () => {
  it("el «# » que repite el título se omite; cualquier otro «# » baja a h2", () => {
    const bloques = bloquesDelArticulo(POST.contentEs, POST.titleEs);
    expect(bloques[0]).toEqual({ tipo: "p", texto: "La lectura del tarot es un arte antiguo." });
    expect(bloques).toContainEqual({ tipo: "h2", texto: "Otro título de primer nivel" });
    expect(bloques.some((b) => (b as { tipo: string }).tipo === "h1")).toBe(false);
  });

  it("sin título que comparar, el «# » inicial también es h2", () => {
    expect(bloquesDelArticulo("# Hola\ntexto")[0]).toEqual({ tipo: "h2", texto: "Hola" });
  });

  it("agrupa viñetas y números seguidos en listas reales", () => {
    const bloques = bloquesDelArticulo(POST.contentEs, POST.titleEs);
    expect(bloques).toContainEqual({ tipo: "ul", items: ["**Bastos**: Pasión", "**Copas**: Emociones"] });
    expect(bloques).toContainEqual({
      tipo: "ol",
      items: ["**Crea un ambiente tranquilo**: sin ruido", "**Despeja tu mente**: respira"],
    });
  });

  it("el grabado de cada artículo es fijo por slug y es una WebP propia en tinta", () => {
    const a = grabadoDelArticulo(POST.slug);
    expect(a).toBe(grabadoDelArticulo(POST.slug));
    expect(a).toMatch(/^\/cartas\/rws-tarot-\d{2}-[a-z-]+-tinta\.webp$/);
    // Los tres posts del seed llevan láminas distintas
    const tres = ["beginners-guide-tarot-interpretation", "major-arcana-meaning-symbolism", "5-tarot-spreads-different-situations"];
    expect(new Set(tres.map(grabadoDelArticulo)).size).toBe(3);
  });
});

describe("/blog/[slug]", () => {
  it("un solo h1 (el título); el contenido se rebaja: h2/h3, listas reales y negritas", async () => {
    findUnique.mockResolvedValue(POST);
    const { container } = render(await BlogPostPage({ params: Promise.resolve({ slug: POST.slug }) }));

    unSoloH1(POST.titleEs);
    const h2 = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(h2).toEqual(expect.arrayContaining(["Entendiendo el Mazo", "Otro título de primer nivel", "blog.ctaTitle"]));
    expect(h2).not.toContain("Guía para principiantes: cómo interpretar el tarot");
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Los Arcanos Mayores (22 cartas)");

    expect(container.querySelectorAll("ul > li")).toHaveLength(2);
    expect(container.querySelectorAll("ol > li")).toHaveLength(2);
    expect(screen.getByText("Bastos").tagName).toBe("STRONG");
    // Newsreader sólo se carga en 400: la negrita del blog es un rótulo en Gloock, sin peso sintético
    expect(screen.getByText("Bastos")).toHaveClass("font-titulo", "font-normal");
    expect(screen.getByText("Bastos")).not.toHaveClass("font-semibold");
    expect(container.innerHTML).not.toMatch(/\*\*/);
    expect(container.innerHTML).not.toMatch(SIN_PALETA_VIEJA);
  });

  it("vuelve al blog y llama a registrarse con un enlace con aspecto de botón (sin <button> dentro)", async () => {
    findUnique.mockResolvedValue(POST);
    render(await BlogPostPage({ params: Promise.resolve({ slug: POST.slug }) }));
    expect(screen.getByRole("link", { name: /blog\.backToBlog/ })).toHaveAttribute("href", "/blog");
    const cta = screen.getByRole("link", { name: "blog.ctaButton" });
    expect(cta).toHaveAttribute("href", "/register");
    expect(cta.querySelector("button")).toBeNull();
    expect(cta.className).toMatch(/rounded-full/);
  });

  it("si el post no existe, notFound()", async () => {
    findUnique.mockResolvedValue(null);
    await expect(BlogPostPage({ params: Promise.resolve({ slug: "nada" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("/blog", () => {
  it("un h1, cada post con su h2 enlazado (el nombre del enlace es el título) y su grabado decorativo", async () => {
    findMany.mockResolvedValue([POST, { ...POST, id: "p2", slug: "major-arcana-meaning-symbolism", titleEs: "Arcanos Mayores" }]);
    const { container } = render(await BlogPage());
    unSoloH1("blog.title");
    const enlaces = screen.getAllByRole("link");
    expect(enlaces.map((a) => a.textContent)).toEqual([POST.titleEs, "Arcanos Mayores"]);
    expect(enlaces[1]).toHaveAttribute("href", "/blog/major-arcana-meaning-symbolism");
    for (const img of container.querySelectorAll("img")) expect(img).toHaveAttribute("alt", "");
    expect(container.innerHTML).not.toMatch(SIN_PALETA_VIEJA);
  });

  it("sin posts, el aviso", async () => {
    findMany.mockResolvedValue([]);
    render(await BlogPage());
    expect(screen.getByText("blog.noPosts")).toBeInTheDocument();
  });
});

describe("legales como documento", () => {
  it.each([
    ["about", AboutPage, "legal.about.title", 3],
    ["privacy", PrivacyPage, "legal.privacy.title", 7],
    ["terms", TermsPage, "legal.terms.title", 6],
  ] as const)("/%s: un h1, un h2 por apartado y «volver» a inicio", async (_ruta, Pagina, titulo, apartados) => {
    const { container } = render(await Pagina());
    unSoloH1(titulo);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(apartados);
    expect(screen.getAllByRole("region")).toHaveLength(apartados);
    expect(screen.getByRole("link", { name: /legal\.back/ })).toHaveAttribute("href", "/");
    expect(container.innerHTML).not.toMatch(SIN_PALETA_VIEJA);
  });

  it("el aviso legal de /about va destacado", async () => {
    render(await AboutPage());
    const aviso = screen.getByRole("region", { name: "legal.about.disclaimer.title" });
    expect(aviso).toHaveClass("border-rosa");
  });
});

describe("404 · la carta perdida", () => {
  it("trae cabecera y pie, un solo h1, el «404» y un enlace a inicio", async () => {
    const { container } = render(await NotFound());
    expect(screen.getByTestId("cabecera")).toBeInTheDocument();
    expect(screen.getByTestId("pie")).toBeInTheDocument();
    unSoloH1("common.notFound.message");
    expect(screen.getByText("common.notFound.title")).toBeInTheDocument();
    const inicio = screen.getByRole("link", { name: "common.notFound.goHome" });
    expect(inicio).toHaveAttribute("href", "/");
    expect(inicio.querySelector("button")).toBeNull();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    // El reverso es decorativo
    const reverso = container.querySelector("svg");
    expect(reverso?.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(container.innerHTML).not.toMatch(SIN_PALETA_VIEJA);
  });
});

describe("error.tsx en dos tintas", () => {
  it("suelo de tinta, un solo h1, reintentar llama a reset y hay enlace a inicio", () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const reset = jest.fn();
    const { container } = render(<ErrorPage error={new Error("x")} reset={reset} />);
    expect(screen.getByRole("main")).toHaveClass("suelo-tinta");
    unSoloH1("errorPage.title");
    fireEvent.click(screen.getByRole("button", { name: "errorPage.tryAgain" }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(within(screen.getByRole("main")).getByRole("link", { name: "errorPage.goHome" })).toHaveAttribute("href", "/");
    expect(container.innerHTML).not.toMatch(SIN_PALETA_VIEJA);
  });
});

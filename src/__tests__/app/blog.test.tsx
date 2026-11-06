/**
 * Blog: la imagen de cada artículo sigue la misma regla en el índice y en su página (portada si existe; si no, el
 * grabado), una portada externa va sin optimizar (no hay `images.remotePatterns`: `/_next/image` daría 400), y el
 * Markdown de listas: un renglón en blanco separa listas y una numerada continúa con `start` tras un párrafo.
 */
import { render, screen } from "@testing-library/react";

jest.mock("@/lib/prisma", () => ({
  prisma: { blogPost: { findMany: jest.fn(), findUnique: jest.fn() } },
}));

jest.mock("next-intl/server", () => ({
  getTranslations: jest.fn(async (namespace: string) => (key: string) => `${namespace}.${key}`),
  getLocale: jest.fn(async () => "es"),
}));

import { prisma } from "@/lib/prisma";
import BlogPage from "@/app/(main)/blog/page";
import BlogPostPage from "@/app/(main)/blog/[slug]/page";
import { bloquesDelArticulo, ContenidoArticulo, grabadoDelArticulo, portadaExterna } from "@/app/(main)/blog/contenido";

const findMany = (prisma.blogPost as unknown as { findMany: jest.Mock }).findMany;
const findUnique = (prisma.blogPost as unknown as { findUnique: jest.Mock }).findUnique;

const POST = {
  id: "p1",
  slug: "major-arcana-meaning-symbolism",
  title: "Major Arcana",
  titleEs: "Arcanos Mayores",
  excerpt: "e",
  excerptEs: "e",
  content: "texto",
  contentEs: "texto",
  coverImage: null as string | null,
  published: true,
  publishedAt: new Date("2024-01-15T00:00:00Z"),
};

const EXTERNA = "https://upload.wikimedia.org/wikipedia/commons/9/90/RWS_Tarot_00_Fool.jpg";
const LOCAL = "/blog/portada-arcanos.jpg";

/** El post que devuelve la base simulada en cada prueba de imagen. */
let POST_ACTUAL = { ...POST };

/** Las imágenes decorativas del artículo/índice (fuera del texto). */
const imagenes = (container: HTMLElement) => Array.from(container.querySelectorAll("img"));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("portadaExterna", () => {
  it("http, https y // son externas; una ruta del sitio no", () => {
    expect(portadaExterna(EXTERNA)).toBe(true);
    expect(portadaExterna("http://ejemplo.mx/a.png")).toBe(true);
    expect(portadaExterna("//cdn.ejemplo.mx/a.png")).toBe(true);
    expect(portadaExterna(LOCAL)).toBe(false);
    expect(portadaExterna("/cartas/rws-tarot-00-fool-color.webp")).toBe(false);
  });
});

describe.each([
  ["el índice (/blog)", async () => {
    findMany.mockResolvedValue([POST_ACTUAL]);
    return render(await BlogPage());
  }],
  ["el artículo (/blog/[slug])", async () => {
    findUnique.mockResolvedValue(POST_ACTUAL);
    return render(await BlogPostPage({ params: Promise.resolve({ slug: POST_ACTUAL.slug }) }));
  }],
])("la imagen en %s", (_, pintar) => {
  it("sin portada: el grabado en tinta del artículo", async () => {
    POST_ACTUAL = { ...POST, coverImage: null };
    const { container } = await pintar();
    const [img] = imagenes(container);
    expect(img).toHaveAttribute("src", grabadoDelArticulo(POST.slug));
    expect(img).toHaveAttribute("alt", "");
  });

  it("con portada externa: la portada, sin pasar por /_next/image", async () => {
    POST_ACTUAL = { ...POST, coverImage: EXTERNA };
    const { container } = await pintar();
    const srcs = imagenes(container).map((i) => i.getAttribute("src"));
    expect(srcs).toEqual([EXTERNA]);
    expect(srcs.join()).not.toMatch(/_next\/image/);
    expect(srcs).not.toContain(grabadoDelArticulo(POST.slug));
  });

  it("con portada del sitio: la portada, optimizada por /_next/image", async () => {
    POST_ACTUAL = { ...POST, coverImage: LOCAL };
    const { container } = await pintar();
    const srcs = imagenes(container).map((i) => i.getAttribute("src") ?? "");
    expect(srcs).toHaveLength(1);
    expect(srcs[0]).toMatch(/^\/_next\/image\?url=%2Fblog%2Fportada-arcanos\.jpg/);
    expect(imagenes(container)[0]).toHaveAttribute("alt", "");
  });
});

describe("Markdown del blog · listas", () => {
  it("dos listas separadas por un renglón en blanco son dos listas", () => {
    expect(bloquesDelArticulo(["- uno", "- dos", "", "- tres"].join("\n"))).toEqual([
      { tipo: "ul", items: ["uno", "dos"] },
      { tipo: "ul", items: ["tres"] },
    ]);
    expect(bloquesDelArticulo(["1. uno", "", "1. otra"].join("\n"))).toEqual([
      { tipo: "ol", items: ["uno"] },
      { tipo: "ol", items: ["otra"] },
    ]);
  });

  it("renglones seguidos siguen siendo una sola lista (también con fin de línea de Windows)", () => {
    expect(bloquesDelArticulo("- a\r\n- b\r\n* c")).toEqual([{ tipo: "ul", items: ["a", "b", "c"] }]);
    expect(bloquesDelArticulo("1. a\n2. b\n3. c")).toEqual([{ tipo: "ol", items: ["a", "b", "c"] }]);
  });

  it("una numerada partida por un párrafo continúa con start", () => {
    const bloques = bloquesDelArticulo(["1. uno", "2. dos", "", "Un párrafo en medio.", "", "3. tres", "4. cuatro"].join("\n"));
    expect(bloques).toEqual([
      { tipo: "ol", items: ["uno", "dos"] },
      { tipo: "p", texto: "Un párrafo en medio." },
      { tipo: "ol", items: ["tres", "cuatro"], start: 3 },
    ]);
  });

  it("el start llega al <ol> (y una que empieza en 1 no lo lleva)", () => {
    const { container } = render(<ContenidoArticulo texto={["1. uno", "Párrafo.", "3. tres"].join("\n")} />);
    const listas = container.querySelectorAll("ol");
    expect(listas).toHaveLength(2);
    expect(listas[0]).not.toHaveAttribute("start");
    expect(listas[1]).toHaveAttribute("start", "3");
    expect(screen.getByText("tres").closest("ol")).toBe(listas[1]);
  });
});

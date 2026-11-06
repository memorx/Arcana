/**
 * La portada «Dos tintas» (src/app/page.tsx) con los textos reales de messages/ en es y en:
 * las seis escenas, el CTA según la sesión, la carta del día determinista por día UTC, la marquesina de los
 * 20 signos con el de hoy marcado y nada de «destino» ni testimonios inventados.
 */
import { act, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";

let mockLocale: "es" | "en" = "es";
let mockSesion: { user: { id: string } } | null = null;

/** Traductor mínimo sobre messages/*.json: llaves anidadas y {variables} (sin ICU: la portada no usa plural/select). */
function mockTraductor(ns: string) {
  const mensajes: Record<string, unknown> = jest.requireActual(`../../../messages/${mockLocale}.json`);
  return (clave: string, valores: Record<string, string | number> = {}) => {
    const texto = `${ns}.${clave}`
      .split(".")
      .reduce<unknown>((nodo, parte) => (nodo as Record<string, unknown> | undefined)?.[parte], mensajes);
    if (typeof texto !== "string") throw new Error(`Falta la llave ${ns}.${clave} en ${mockLocale}.json`);
    return texto.replace(/\{(\w+)\}/g, (_, v: string) => String(valores[v]));
  };
}

jest.mock("@/lib/auth", () => ({ auth: jest.fn(async () => mockSesion) }));
jest.mock("next-intl/server", () => ({
  getLocale: jest.fn(async () => mockLocale),
  getTranslations: jest.fn(async (ns: string) => mockTraductor(ns)),
}));
jest.mock("next-intl", () => ({
  useLocale: () => mockLocale,
  useTranslations: (ns: string) => mockTraductor(ns),
}));
// Cabecera y pie tienen sus propias pruebas; el pulso es asíncrono y se prueba en CollectivePulse.test.tsx.
jest.mock("@/components/layout", () => ({ Header: () => null, Footer: () => null }));
jest.mock("@/components/landing/CollectivePulse", () => ({ CollectivePulse: () => null }));
jest.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
jest.mock("@/lib/prisma", () => ({ prisma: { card: { findFirst: jest.fn() } } }));
// «Hoy» fijo: 5 nov 2026 (UTC) = 1 Mázatl, trecena Ce Mázatl, señor de la noche Tláloc.
jest.mock("@/lib/systems", () => ({
  ...jest.requireActual("@/lib/systems"),
  todayUtc: () => new Date(Date.UTC(2026, 10, 5)),
}));

import Home from "@/app/page";
import { cartaDelDia } from "@/components/landing/cartaDelDia";
import { prisma } from "@/lib/prisma";

const findFirst = prisma.card.findFirst as unknown as jest.Mock;
const HOY = new Date(Date.UTC(2026, 10, 5));

async function pintar(locale: "es" | "en" = "es", sesion: typeof mockSesion = null) {
  mockLocale = locale;
  mockSesion = sesion;
  const utils = render((await Home()) as ReactElement);
  await act(async () => {}); // efectos de los componentes cliente
  return utils;
}

const hrefs = (links: HTMLElement[]) => links.map((a) => a.getAttribute("href"));

function movimientoReducido(si: boolean) {
  (window.matchMedia as jest.Mock).mockImplementation((query: string) => ({
    matches: si && query.includes("prefers-reduced-motion: reduce"),
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  }));
}

beforeEach(() => {
  movimientoReducido(false);
  findFirst.mockResolvedValue({
    nameEs: "La Estrella",
    meaningUpright: "Esperanza, inspiración y renovación después de la tormenta. Representa la fe en el futuro.",
    meaningUprightEn: null,
  });
});

describe("Portada · escenas", () => {
  it("pinta las seis escenas en orden, con un solo h1 (la tesis)", async () => {
    await pintar();

    const h1 = screen.getAllByRole("heading", { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]).toHaveTextContent(
      "Las cartas son de 1909. Quien las lee hoy es una IA. La pregunta sigue siendo tuya."
    );

    const escenas = screen.getAllByRole("region").map((r) => r.getAttribute("aria-labelledby"));
    expect(escenas).toEqual([
      "portada-tesis",
      "portada-grabado-titulo",
      "portada-carta-titulo",
      "more-than-tarot-title",
      "portada-hoy-titulo",
      "portada-faq-titulo",
      "portada-turno-titulo",
    ]);
    // La palabra a pincel es un sello: no se lee dos veces.
    expect(screen.getByText("Pregunta")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Tu turno", { selector: "p" })).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("heading", { level: 2, name: "Tu turno" })).toBeInTheDocument();
  });

  it("la escena 2 es GrabadoParticulas con El Loco y la lectura de ejemplo marcada como ejemplo", async () => {
    const { container } = await pintar();
    const escena = screen.getByRole("region", { name: /Un grabado de 1909/ });

    expect(within(escena).getByAltText("El Loco, grabado de Pamela Colman Smith, 1909")).toHaveAttribute(
      "src",
      "/cartas/rws-tarot-00-fool-tinta.webp"
    );
    expect(within(escena).getByText("Lectura de ejemplo · Arcana")).toBeInTheDocument();
    // Debajo del héroe (no dentro).
    const [heroe, segunda] = Array.from(container.querySelectorAll("main > section"));
    expect(heroe).toHaveClass("portada-grabados");
    expect(segunda).toContainElement(container.querySelector(".gp"));
  });

  it("la mesa de grabados del héroe es la de la maqueta: 8 × 5, decorativa y con cartas autohospedadas", async () => {
    const { container } = await pintar();
    const mesa = container.querySelector(".portada-grabados .mdg")!;

    expect(mesa).toHaveAttribute("aria-hidden", "true");
    const imgs = Array.from(mesa.querySelectorAll("img"));
    expect(imgs).toHaveLength(40);
    expect(imgs[0]).toHaveAttribute("src", "/cartas/rws-tarot-00-fool-mesa.webp");
    expect(imgs.every((i) => /^\/cartas\/[a-z0-9-]+-mesa\.webp$/.test(i.getAttribute("src")!))).toBe(true);
  });
});

describe("Portada · llamados según la sesión", () => {
  it("sin sesión: «Haz tu lectura» va a /register, «Ver la carta de hoy» a #hoy y aparece la nota de 3 gratis", async () => {
    await pintar("es", null);

    expect(hrefs(screen.getAllByRole("link", { name: /^Haz tu lectura/ }))).toEqual(["/register", "/register"]);
    expect(screen.getByRole("link", { name: "Ver la carta de hoy" })).toHaveAttribute("href", "#hoy");
    expect(document.getElementById("hoy")).toHaveClass("portada-carta");
    expect(screen.getByText("3 lecturas gratis al registrarte · sin tarjeta")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Haz tu lectura · 3 gratis" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Recíbela cada mañana" })).toHaveAttribute("href", "/subscribe");
    expect(screen.getByText("Al registrarte")).toBeInTheDocument();
  });

  it("con sesión: «Haz tu lectura» va a /reading/new, «Ir a mi espacio» al dashboard y no se ofrecen lecturas gratis", async () => {
    await pintar("es", { user: { id: "u1" } });

    expect(hrefs(screen.getAllByRole("link", { name: /^Haz tu lectura/ }))).toEqual(["/reading/new", "/reading/new"]);
    expect(screen.getByRole("link", { name: "Ir a mi espacio" })).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByText(/lecturas gratis/)).not.toBeInTheDocument();
    expect(screen.queryByText(/3 gratis/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "En tu calendario" })).toHaveAttribute("href", "/calendar");
  });

  it("los llamados son enlaces con aspecto de botón, nunca un botón dentro de un enlace", async () => {
    const { container } = await pintar();
    expect(container.querySelector("a button, button a")).toBeNull();
    for (const a of screen.getAllByRole("link", { name: /^Haz tu lectura/ })) expect(a).toHaveClass("min-h-14");
  });
});

describe("Portada · la carta del día", () => {
  it("elige la carta por el día UTC con CARTAS, le pone nombre y sentido de la base y la marca como ejemplo", async () => {
    const esperada = cartaDelDia(HOY);
    await pintar();

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { name: esperada.name } }));
    const escena = screen.getByRole("region", { name: "Una carta al día, para empezar con una pregunta." });
    const carta = within(escena).getByRole("button", { name: "Voltear la carta: carta de hoy" });
    expect(carta.querySelector("img.cq-cara")).toHaveAttribute("src", `/cartas/${esperada.slug}-color.webp`);
    expect(within(escena).getByText("La carta de hoy · 1 Mázatl")).toBeInTheDocument();
    expect(within(escena).getByRole("heading", { level: 3, name: "La Estrella" })).toBeInTheDocument();
    expect(within(escena).getByText("Esperanza, inspiración y renovación después de la tormenta.")).toBeInTheDocument();
    expect(within(escena).getByText("Mensaje de ejemplo · Arcana")).toBeInTheDocument();
    expect(within(escena).getByText("Carta del día · 5 de noviembre de 2026")).toBeInTheDocument();
  });

  it("el mensaje espera a que se voltee la carta (con JS) y el aviso de «boca abajo» se va al voltearla", async () => {
    movimientoReducido(true); // la carta se revela con fundido, sin lienzo (jsdom)
    await pintar();
    const mensaje = screen.getByTestId("mensaje-carta-del-dia");
    expect(mensaje).toHaveAttribute("data-oculto");
    expect(screen.getByText("La carta de hoy está boca abajo. Tócala para voltearla.")).toBeInTheDocument();

    await act(async () => screen.getByRole("button", { name: "Voltear la carta: carta de hoy" }).click());
    await act(async () => {});

    expect(mensaje).not.toHaveAttribute("data-oculto");
    expect(screen.queryByText(/está boca abajo/)).not.toBeInTheDocument();
  });

  it("si la base no contesta la escena se arma igual (sin sentido, con un nombre de respaldo)", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    findFirst.mockRejectedValue(new Error("db down"));
    await pintar();

    const escena = screen.getByRole("region", { name: "Una carta al día, para empezar con una pregunta." });
    expect(within(escena).getByRole("heading", { level: 3 }).textContent).toBeTruthy();
    expect(within(escena).getByText("Mensaje de ejemplo · Arcana")).toBeInTheDocument();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("en inglés usa el nombre en inglés y no muestra el significado en español", async () => {
    await pintar("en");
    const escena = screen.getByRole("region", { name: "One card a day, to start with a question." });
    expect(within(escena).getByRole("heading", { level: 3, name: cartaDelDia(HOY).name })).toBeInTheDocument();
    expect(within(escena).queryByText(/Esperanza/)).not.toBeInTheDocument();
  });
});

describe("Portada · Más que tarot", () => {
  it("es una tira de cinco láminas con sus rutas", async () => {
    await pintar();
    const escena = screen.getByRole("region", { name: "Más que tarot" });

    expect(hrefs(within(escena).getAllByRole("link"))).toEqual([
      "/blueprint",
      "/calendar",
      "/compatibility",
      "/reading/manual",
      "/history",
    ]);
    expect(within(escena).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Mapa Arcano",
      "Calendario Arcano",
      "Lectura de dos",
      "Tu mazo",
      "Mi historia",
    ]);
  });
});

describe("Portada · el día de hoy en el tonalpohualli", () => {
  it("dice el tonalli, la trecena, el señor de la noche y la luna de @/lib/systems", async () => {
    await pintar();
    const escena = screen.getByRole("region", { name: "Hoy es 1 Mázatl, Venado." });

    const valor = (dt: string) => within(escena).getByText(dt).nextElementSibling;
    expect(valor("Trecena")).toHaveTextContent("Ce Mázatl");
    expect(valor("Señor de la noche")).toHaveTextContent("Tláloc");
    expect(valor("Luna")?.textContent).toMatch(/^[A-ZÁÉÍÓÚ][a-záéíóú ]+ · \d{1,3}%$/);
  });

  it("la marquesina tiene los 20 signos, hoy marcado una vez, y su copia del bucle está oculta al lector", async () => {
    const { container } = await pintar();
    const lista = screen.getByRole("list", { name: "Los veinte signos del tonalpohualli" });
    const signos = within(lista).getAllByRole("listitem");

    expect(signos).toHaveLength(20);
    expect(signos[0]).toHaveTextContent("Cipactli");
    expect(signos[19]).toHaveTextContent("Xóchitl");
    const hoy = signos.filter((li) => li.getAttribute("aria-current") === "date");
    expect(hoy).toHaveLength(1);
    expect(hoy[0]).toHaveTextContent("Mázatl");
    expect(hoy[0]).toHaveAttribute("data-hoy");

    const copia = container.querySelector(".portada-marquesina__copia")!;
    expect(copia).toHaveAttribute("aria-hidden", "true");
    expect(copia.querySelectorAll("li")).toHaveLength(20);
    expect(copia.querySelector("[aria-current]")).toBeNull();
    expect(container.querySelector(".portada-marquesina")).toHaveAttribute("data-recorta");
  });
});

describe("Portada · lo que ya no va", () => {
  it.each(["es", "en"] as const)("en %s no hay «destino», «el universo te habla» ni testimonios inventados", async (locale) => {
    const { container } = await pintar(locale);
    const texto = container.textContent ?? "";

    expect(texto).not.toMatch(/destin[oy]|universo|universe/i);
    expect(texto).not.toMatch(/Maria G\.|Carlos R\.|Ana L\.|Lo que dicen|What Our Users Say/);
    expect(container.querySelector(".animate-float")).toBeNull();
  });

  it("conserva las preguntas frecuentes (SEO) como <details> nativos", async () => {
    await pintar();
    const escena = screen.getByRole("region", { name: /^preguntas frecuentes$/i });
    expect(escena.querySelectorAll("details")).toHaveLength(3);
    expect(within(escena).getAllByRole("heading", { level: 3 })).toHaveLength(3);
  });
});

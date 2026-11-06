import fs from "node:fs";
import path from "node:path";
import { act, render } from "@testing-library/react";
import { MesaDeGrabados } from "@/components/tinta/MesaDeGrabados";
import { CARTAS } from "@/lib/cartas";

const SLUGS = CARTAS.slice(0, 40).map((c) => c.slug);
const CSS = fs.readFileSync(path.join(process.cwd(), "src/components/tinta/tinta.css"), "utf8");

/** Las reglas de tinta.css cuyo selector menciona .mdg (sin comentarios). */
function reglasMesa(): string[] {
  const limpio = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
  return [...limpio.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => m[1].includes(".mdg")).map((m) => m[2]);
}

describe("MesaDeGrabados", () => {
  const global = globalThis as { IntersectionObserver?: unknown };
  const original = global.IntersectionObserver;
  afterEach(() => {
    global.IntersectionObserver = original;
  });

  it("es decorativa: aria-hidden en la raíz y alt vacío en cada grabado", () => {
    const { container } = render(<MesaDeGrabados slugs={SLUGS} />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
    container.querySelectorAll("img").forEach((img) => expect(img).toHaveAttribute("alt", ""));
  });

  it("8 × 5 por omisión; de la quinta columna en adelante se ocultan abajo de 720 px (4 × 5)", () => {
    const { container } = render(<MesaDeGrabados slugs={SLUGS} />);
    const columnas = container.querySelectorAll(".mdg-columna");
    expect(columnas).toHaveLength(8);
    columnas.forEach((c) => expect(c.querySelectorAll("img")).toHaveLength(5));
    expect(container.querySelectorAll(".mdg-columna--ancha")).toHaveLength(4);
    expect(columnas[0]).not.toHaveClass("mdg-columna--ancha");
    expect(columnas[4]).toHaveClass("mdg-columna--ancha");
    const raiz = container.firstChild as HTMLElement;
    expect(raiz.style.getPropertyValue("--mdg-columnas")).toBe("8");
    expect(raiz.style.getPropertyValue("--mdg-columnas-movil")).toBe("4");
    expect(CSS).toMatch(/@media \(max-width: 719\.98px\)[\s\S]*?\.mdg-columna--ancha \{ display: none; \}/);
  });

  it("grabados gris horneado, perezosos y de baja prioridad, con medidas", () => {
    const { container } = render(<MesaDeGrabados slugs={SLUGS} />);
    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("src", `/cartas/${SLUGS[0]}-mesa.webp`);
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
    expect(img).toHaveAttribute("fetchpriority", "low");
    expect(img).toHaveAttribute("width", "200");
    expect(img).toHaveAttribute("height", "342");
  });

  it("sin `inmediatas`, los 40 grabados son perezosos y de baja prioridad", () => {
    const { container } = render(<MesaDeGrabados slugs={SLUGS} />);
    const imgs = [...container.querySelectorAll("img")];
    expect(imgs).toHaveLength(40);
    for (const img of imgs) {
      expect(img).toHaveAttribute("loading", "lazy");
      expect(img).toHaveAttribute("fetchpriority", "low");
    }
  });

  it("con `inmediatas={3}`, las 3 primeras filas de las 4 columnas de móvil van sin loading ni fetchpriority (12) y el resto perezoso (28)", () => {
    const { container } = render(<MesaDeGrabados slugs={SLUGS} inmediatas={3} />);
    const columnas = [...container.querySelectorAll(".mdg-columna")];
    const inmediatas: Element[] = [];
    const perezosas: Element[] = [];
    columnas.forEach((col, c) =>
      col.querySelectorAll("img").forEach((img, f) => (c < 4 && f < 3 ? inmediatas : perezosas).push(img))
    );
    expect(inmediatas).toHaveLength(12);
    expect(perezosas).toHaveLength(28);
    for (const img of inmediatas) {
      expect(img).not.toHaveAttribute("loading");
      expect(img).not.toHaveAttribute("fetchpriority");
      // Lo demás no cambia: decodificación asíncrona, medidas y decorativa.
      expect(img).toHaveAttribute("decoding", "async");
      expect(img).toHaveAttribute("width", "200");
      expect(img).toHaveAttribute("height", "342");
      expect(img).toHaveAttribute("alt", "");
    }
    for (const img of perezosas) {
      expect(img).toHaveAttribute("loading", "lazy");
      expect(img).toHaveAttribute("fetchpriority", "low");
    }
    // Las de las columnas anchas (ocultas en móvil) nunca se piden de inmediato.
    columnas.slice(4).forEach((col) => col.querySelectorAll("img").forEach((img) => expect(img).toHaveAttribute("loading", "lazy")));
    // En el orden del documento, las inmediatas son las filas 0–2 de cada una de las 4 primeras columnas.
    const enOrden = [...container.querySelectorAll("img")].map((img) => !img.hasAttribute("loading"));
    expect(enOrden.slice(0, 20)).toEqual([0, 1, 2, 3].flatMap(() => [true, true, true, false, false]));
    expect(enOrden.slice(20).every((x) => !x)).toBe(true);
  });

  it("sin filter: ni en estilos en línea ni en las reglas .mdg de tinta.css", () => {
    const { container } = render(<MesaDeGrabados slugs={SLUGS} />);
    container.querySelectorAll<HTMLElement>("*").forEach((el) => expect(el.style.filter).toBe(""));
    const reglas = reglasMesa();
    expect(reglas.length).toBeGreaterThan(5);
    expect(reglas.join("\n")).not.toMatch(/filter/);
  });

  it("repite los slugs si faltan y usa las 78 si viene vacío; columnas y filas configurables", () => {
    const { container, rerender } = render(<MesaDeGrabados slugs={["cups02", "wands01"]} columnas={4} filas={4} />);
    const srcs = [...container.querySelectorAll("img")].map((i) => i.getAttribute("src"));
    expect(srcs).toHaveLength(16);
    expect(srcs[2]).toBe("/cartas/cups02-mesa.webp");
    rerender(<MesaDeGrabados slugs={[]} columnas={2} filas={3} />);
    expect(container.querySelector("img")).toHaveAttribute("src", `/cartas/${CARTAS[0].slug}-mesa.webp`);
  });

  it("la deriva se pausa fuera de pantalla (IntersectionObserver) y se desconecta al desmontar", () => {
    let avisar: (e: { isIntersecting: boolean }[]) => void = () => {};
    const disconnect = jest.fn();
    global.IntersectionObserver = jest.fn((cb: typeof avisar) => {
      avisar = cb;
      return { observe: jest.fn(), disconnect };
    });
    const { container, unmount } = render(<MesaDeGrabados slugs={SLUGS} />);
    expect(container.firstChild).not.toHaveClass("mdg--pausada");
    act(() => avisar([{ isIntersecting: false }]));
    expect(container.firstChild).toHaveClass("mdg--pausada");
    act(() => avisar([{ isIntersecting: true }]));
    expect(container.firstChild).not.toHaveClass("mdg--pausada");
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it("la deriva sólo existe con movimiento: su animación vive dentro de prefers-reduced-motion: no-preference", () => {
    const animacion = CSS.indexOf("animation: mdg-deriva");
    const bloque = CSS.lastIndexOf("@media (prefers-reduced-motion: no-preference)", animacion);
    expect(animacion).toBeGreaterThan(0);
    expect(bloque).toBeGreaterThan(0);
    // Entre la apertura del @media y la animación no se cierra ningún bloque de primer nivel.
    expect(CSS.slice(bloque, animacion)).not.toMatch(/\n\}/);
  });
});

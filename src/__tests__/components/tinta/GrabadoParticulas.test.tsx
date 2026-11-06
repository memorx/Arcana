import { render, screen } from "@testing-library/react";
import {
  GrabadoParticulas,
  NIVELES_ALFA,
  nuevoLote,
  pintarParticulas,
  type Particula,
} from "@/components/tinta/GrabadoParticulas";

const TEXTO = ["El Loco abre tu lectura con un paso al vacío.", "Esta carta no te promete que saldrá bien."];

function medios({ reducido = false, angosto = false }) {
  (window.matchMedia as jest.Mock).mockImplementation((query: string) => ({
    matches: (reducido && query.includes("reduce")) || (angosto && query.includes("max-width: 820px")),
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  }));
}

describe("GrabadoParticulas", () => {
  beforeEach(() => {
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((() => null) as never);
  });
  afterEach(() => jest.restoreAllMocks());

  it("trae el grabado en tinta, la lectura, la firma y la columna de texto (todo legible sin JS)", () => {
    medios({});
    render(
      <GrabadoParticulas carta={{ slug: "rws-tarot-00-fool" }} texto={TEXTO} firma="Lectura de ejemplo" alt="El Loco, 1909">
        <h2>Del grabado a la IA</h2>
      </GrabadoParticulas>,
    );
    expect(screen.getByAltText("El Loco, 1909")).toHaveAttribute("src", "/cartas/rws-tarot-00-fool-tinta.webp");
    expect(screen.getByText(TEXTO[0])).toBeInTheDocument();
    expect(screen.getByText(TEXTO[1])).toBeInTheDocument();
    expect(screen.getByText("Lectura de ejemplo")).toHaveClass("gp-firma");
    expect(screen.getByRole("heading", { name: "Del grabado a la IA" })).toBeInTheDocument();
  });

  it("con movimiento y > 820 px se activa (escena alta, lienzo fijo); sin canvas deja el texto visible", () => {
    medios({});
    const { container } = render(<GrabadoParticulas carta={{ slug: "rws-tarot-00-fool" }} texto={TEXTO} />);
    expect(container.firstChild).toHaveClass("gp--activa");
    const lienzo = container.querySelector(".gp-lienzo") as HTMLElement;
    expect(lienzo.style.getPropertyValue("--p-texto")).toBe("1");
  });

  it.each([
    ["reduced-motion", { reducido: true }],
    ["un ancho de 820 px o menos", { angosto: true }],
  ])("con %s queda quieta: grabado y texto, sin escena alta", (_n, m) => {
    medios(m);
    const { container } = render(<GrabadoParticulas carta={{ slug: "rws-tarot-00-fool" }} texto={TEXTO} />);
    expect(container.firstChild).not.toHaveClass("gp--activa");
    expect(screen.getByText(TEXTO[0])).toBeVisible();
    expect(container.querySelector("img")).toBeVisible();
  });

  it("escucha scroll y resize sólo mientras está montada (sin bucle de rAF)", () => {
    medios({});
    jest
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockImplementation((() => ({ setTransform: jest.fn(), clearRect: jest.fn() })) as never);
    const raf = jest.spyOn(window, "requestAnimationFrame");
    const add = jest.spyOn(window, "addEventListener");
    const remove = jest.spyOn(window, "removeEventListener");
    const { unmount } = render(<GrabadoParticulas carta={{ slug: "rws-tarot-00-fool" }} texto={TEXTO} />);
    expect(add).toHaveBeenCalledWith("scroll", expect.any(Function), { passive: true });
    expect(raf.mock.calls.length).toBeLessThanOrEqual(1);
    unmount();
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
    expect(remove).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});

describe("pintarParticulas (por cubetas de opacidad)", () => {
  /** Lienzo falso que anota el estado con que se pinta cada rectángulo. */
  function lienzoFalso() {
    const estado = { fillStyle: "", globalAlpha: 1 };
    const cambiosColor: string[] = [];
    const cambiosAlfa: number[] = [];
    const rects: { color: string; alfa: number; x: number; y: number; s: number }[] = [];
    const ctx = {
      set fillStyle(v: string) {
        cambiosColor.push(v);
        estado.fillStyle = v;
      },
      get fillStyle() {
        return estado.fillStyle;
      },
      set globalAlpha(v: number) {
        cambiosAlfa.push(v);
        estado.globalAlpha = v;
      },
      get globalAlpha() {
        return estado.globalAlpha;
      },
      fillRect: (x: number, y: number, s: number) => rects.push({ color: estado.fillStyle, alfa: estado.globalAlpha, x, y, s }),
    } as unknown as CanvasRenderingContext2D;
    return { ctx, cambiosColor, cambiosAlfa, rects, estado };
  }

  /** n partículas que ya salieron (sale 0), 1 de cada 10 rosa, con arcos variados. */
  function particulas(n: number): Particula[] {
    return Array.from({ length: n }, (_, i) => ({
      sx: i,
      sy: i,
      dx: i + 100,
      dy: i + 200,
      nx: ((i % 7) - 3) / 3,
      ny: ((i % 5) - 2) / 2,
      rosa: i % 10 === 0,
      sale: (i % 50) / 100, // salen escalonadas: a m = 0.6 cada una va en un punto distinto del viaje
    }));
  }

  it("5200 partículas: dos colores y a lo más NIVELES_ALFA + 1 opacidades por cuadro, un rectángulo por partícula", () => {
    const pts = particulas(5200);
    const { ctx, cambiosColor, cambiosAlfa, rects, estado } = lienzoFalso();
    pintarParticulas(ctx, pts, 0.6, 0.8, nuevoLote(pts.length));
    expect(rects).toHaveLength(5200);
    expect(new Set(cambiosColor)).toEqual(new Set(["rgb(14,13,12)", "rgb(228,0,124)"]));
    expect(cambiosColor.length).toBeLessThanOrEqual(2);
    expect(cambiosAlfa.length).toBeLessThanOrEqual(NIVELES_ALFA + 2); // + volver a 1 al terminar
    expect(estado.globalAlpha).toBe(1);
  });

  it("la opacidad casi no cambia: negras entre 0,55 y 1 × alfa (±1/16), rosas a alfa", () => {
    const pts = particulas(400);
    const { ctx, rects } = lienzoFalso();
    pintarParticulas(ctx, pts, 0.6, 0.8, nuevoLote(pts.length));
    const rosas = rects.filter((r) => r.color === "rgb(228,0,124)");
    const negras = rects.filter((r) => r.color === "rgb(14,13,12)");
    expect(rosas).toHaveLength(40);
    rosas.forEach((r) => expect(r.alfa).toBeCloseTo(0.8));
    negras.forEach((r) => {
      expect(r.alfa).toBeGreaterThanOrEqual(0.8 * 0.55);
      expect(r.alfa).toBeLessThanOrEqual(0.8);
      // Tamaño 1,3–2,1 px como antes: s = 1,3 + 0,8·arco, y la opacidad de su cubeta sigue al arco.
      const arco = (r.s - 1.3) / 0.8;
      expect(Math.abs(r.alfa - 0.8 * (0.55 + 0.45 * (1 - arco)))).toBeLessThanOrEqual(0.8 * 0.45 * (1 / NIVELES_ALFA) + 1e-3);
    });
  });

  it("no pinta las que aún son parte del grabado", () => {
    const pts = particulas(100).map((p, i) => ({ ...p, sale: i < 30 ? 0.1 : 0.9 }));
    const { ctx, rects } = lienzoFalso();
    pintarParticulas(ctx, pts, 0.5, 1, nuevoLote(pts.length));
    expect(rects).toHaveLength(30);
  });
});

import { render, screen } from "@testing-library/react";
import { GrabadoParticulas } from "@/components/tinta/GrabadoParticulas";

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

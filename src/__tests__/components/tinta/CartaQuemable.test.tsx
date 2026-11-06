import fs from "node:fs";
import path from "node:path";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import {
  CartaQuemable,
  DURACION_CON_COLA,
  DURACION_SOLA,
  MAX_QUEMAS,
} from "@/components/tinta/CartaQuemable";

// jest.setup.ts: useTranslations devuelve la llave, así que la pista es "pista" y el sufijo de invertida "invertida".

const ESTRELLA = { nombre: "La Estrella", slug: "rws-tarot-17-star" };

/** Un contexto 2D que no dibuja: lo justo para que el quemado corra en jsdom. */
function contextoFalso() {
  const imagen = (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
  const props: Record<string | symbol, unknown> = {};
  return new Proxy(props, {
    get(obj, k) {
      if (k in obj) return obj[k];
      if (k === "getImageData") return (_x: number, _y: number, w: number, h: number) => imagen(w, h);
      if (k === "createImageData") return (w: number, h: number) => imagen(w, h);
      return () => {};
    },
    set(obj, k, v) {
      obj[k] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

const getContext = jest.spyOn(HTMLCanvasElement.prototype, "getContext");
const conCanvas = () => getContext.mockImplementation((() => contextoFalso()) as never);

function movimientoReducido(si: boolean) {
  (window.matchMedia as jest.Mock).mockImplementation((query: string) => ({
    matches: si && query.includes("prefers-reduced-motion: reduce"),
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

/** Deja que React aplique lo pendiente (efectos y cambios de estado). */
const vaciarCola = () => act(async () => {});
const avanzar = (ms: number) => act(() => void jest.advanceTimersByTime(ms));
const lienzos = (c: HTMLElement) => c.querySelectorAll("canvas.cq-lienzo").length;

beforeEach(() => {
  jest.useFakeTimers();
  movimientoReducido(false);
  conCanvas();
});
afterEach(() => {
  // La cola es de módulo: se desmonta todo (suelta turnos) y corre el cuadro pendiente antes de volver a timers reales.
  cleanup();
  act(() => void jest.advanceTimersByTime(100));
  jest.useRealTimers();
});

describe("CartaQuemable", () => {
  it("boca abajo: botón con la etiqueta, el reverso, la pista y la carta a color debajo", () => {
    const { container } = render(<CartaQuemable carta={ESTRELLA} etiqueta="Voltear la carta de hoy" />);
    const boton = screen.getByRole("button", { name: "Voltear la carta de hoy" });
    expect(boton.tagName).toBe("BUTTON");
    expect(container.querySelector(".cq-reverso")).toBeInTheDocument();
    expect(container.querySelector(".cq-pista")).toHaveTextContent("pista");
    const img = container.querySelector("img.cq-cara")!;
    expect(img).toHaveAttribute("src", "/cartas/rws-tarot-17-star-color.webp");
    expect(img).toHaveAttribute("width", "480");
    expect(lienzos(container)).toBe(0);
  });

  // Va antes que cualquier otra quema del archivo: los píxeles del reverso se leen una vez por página (por tamaño)
  // y quedan en caché, así que getImageData sólo puede fallar en la primera quema.
  it("si getImageData lanza (lienzo bloqueado) también se revela con fundido", async () => {
    getContext.mockImplementation((() => {
      const ctx = contextoFalso();
      (ctx as unknown as Record<string, unknown>).getImageData = () => {
        throw new DOMException("bloqueado", "SecurityError");
      };
      return ctx;
    }) as never);
    const { container } = render(<CartaQuemable carta={ESTRELLA} etiqueta="Voltear" />);
    act(() => screen.getByRole("button").click());
    avanzar(20); // la preparación corre en el primer cuadro
    expect(lienzos(container)).toBe(0);
    expect(container.firstChild).toHaveAttribute("data-estado", "revelada");
    expect(container.firstChild).toHaveClass("cq--fundido");
  });

  it.each([["Enter", "{Enter}"], ["Espacio", " "]])("%s la quema y al terminar anuncia el nombre", async (_n, tecla) => {
    const onRevelada = jest.fn();
    const user = userEvent.setup({ delay: null });
    const { container } = render(
      <CartaQuemable carta={ESTRELLA} etiqueta="Voltear la carta de hoy" onRevelada={onRevelada} />,
    );
    screen.getByRole("button").focus();
    await act(() => user.keyboard(tecla));
    await vaciarCola();
    expect(lienzos(container)).toBe(1);
    expect(container.querySelector(".cq-brillo")).toHaveAttribute("width", "75");
    expect(container.querySelector(".cq-lienzo")).toHaveAttribute("width", "150");
    // El lienzo nace debajo del reverso; en el primer cuadro se prepara, se pinta y la tapa se esconde.
    const tapa = container.querySelector<HTMLElement>(".cq-tapa")!;
    expect(tapa.style.visibility).toBe("");
    avanzar(20);
    expect(tapa.style.visibility).toBe("hidden");
    expect(onRevelada).not.toHaveBeenCalled();

    avanzar(DURACION_SOLA + 50);
    expect(lienzos(container)).toBe(0);
    expect(screen.getByRole("button", { name: "La Estrella" })).toHaveAttribute("aria-disabled", "true");
    expect(container.querySelector("[aria-live]")).toHaveTextContent("La Estrella");
    expect(onRevelada).toHaveBeenCalledTimes(1);
  });

  it("una quema sola dura 1700 ms", async () => {
    const { container } = render(<CartaQuemable carta={ESTRELLA} etiqueta="Voltear" />);
    act(() => screen.getByRole("button").click());
    await vaciarCola();
    avanzar(DURACION_CON_COLA + 100);
    expect(container.firstChild).toHaveAttribute("data-estado", "quemando");
    avanzar(DURACION_SOLA - DURACION_CON_COLA);
    expect(container.firstChild).toHaveAttribute("data-estado", "revelada");
  });

  it("chica usa el lienzo de 90 × 156 y el resplandor de 45 × 78", async () => {
    const { container } = render(<CartaQuemable carta={ESTRELLA} etiqueta="Voltear" tamano="chica" />);
    act(() => screen.getByRole("button").click());
    await vaciarCola();
    expect(container.querySelector(".cq-lienzo")).toHaveAttribute("height", "156");
    expect(container.querySelector(".cq-brillo")).toHaveAttribute("width", "45");
    expect(container.querySelector(".cq-pista")).toBeNull(); // ya está quemando
  });

  it("sin canvas 2D (getContext nulo) se revela con fundido y sin montar lienzos", async () => {
    getContext.mockImplementation((() => null) as never);
    const onRevelada = jest.fn();
    const { container } = render(<CartaQuemable carta={ESTRELLA} etiqueta="Voltear" onRevelada={onRevelada} />);
    act(() => screen.getByRole("button").click());
    await vaciarCola();
    expect(lienzos(container)).toBe(0);
    expect(container.firstChild).toHaveAttribute("data-estado", "revelada");
    expect(container.firstChild).toHaveClass("cq--fundido");
    expect(onRevelada).toHaveBeenCalledTimes(1);
  });

  it("con prefers-reduced-motion se revela de inmediato, sin canvas", () => {
    movimientoReducido(true);
    const onRevelada = jest.fn();
    const { container } = render(<CartaQuemable carta={ESTRELLA} etiqueta="Voltear" onRevelada={onRevelada} />);
    act(() => screen.getByRole("button").click());
    expect(getContext).not.toHaveBeenCalled();
    expect(lienzos(container)).toBe(0);
    expect(container.firstChild).toHaveAttribute("data-estado", "revelada");
    expect(container.firstChild).toHaveClass("cq--fundido");
    expect(onRevelada).toHaveBeenCalledTimes(1);
  });

  it("`revelada` controlada: true al montar no anima ni avisa; false → true quema; true → false la voltea", async () => {
    const onRevelada = jest.fn();
    const { container, rerender } = render(
      <CartaQuemable carta={ESTRELLA} etiqueta="Voltear" revelada onRevelada={onRevelada} />,
    );
    expect(container.firstChild).toHaveAttribute("data-estado", "revelada");
    expect(container.querySelector(".cq-reverso")).toBeNull();
    expect(onRevelada).not.toHaveBeenCalled();
    expect(container.querySelector("[aria-live]")).toHaveTextContent("");

    rerender(<CartaQuemable carta={ESTRELLA} etiqueta="Voltear" revelada={false} onRevelada={onRevelada} />);
    expect(container.firstChild).toHaveAttribute("data-estado", "boca-abajo");
    expect(container.querySelector(".cq-reverso")).toBeInTheDocument();

    rerender(<CartaQuemable carta={ESTRELLA} etiqueta="Voltear" revelada onRevelada={onRevelada} />);
    await vaciarCola();
    expect(lienzos(container)).toBe(1);
    avanzar(DURACION_SOLA + 50);
    expect(container.firstChild).toHaveAttribute("data-estado", "revelada");
    expect(onRevelada).toHaveBeenCalledTimes(1);
  });

  it("si `revelada` vuelve a false a media quema, se corta la quema y el reverso reaparece", () => {
    const onRevelada = jest.fn();
    const { container, rerender } = render(
      <CartaQuemable carta={ESTRELLA} etiqueta="Voltear" revelada={false} onRevelada={onRevelada} />,
    );
    rerender(<CartaQuemable carta={ESTRELLA} etiqueta="Voltear" revelada onRevelada={onRevelada} />);
    avanzar(300);
    expect(container.firstChild).toHaveAttribute("data-estado", "quemando");
    expect(container.querySelector<HTMLElement>(".cq-tapa")!.style.visibility).toBe("hidden");
    rerender(<CartaQuemable carta={ESTRELLA} etiqueta="Voltear" revelada={false} onRevelada={onRevelada} />);
    expect(container.firstChild).toHaveAttribute("data-estado", "boca-abajo");
    expect(lienzos(container)).toBe(0);
    expect(container.querySelector<HTMLElement>(".cq-tapa")!.style.visibility).toBe("");
    avanzar(DURACION_SOLA * 2);
    expect(onRevelada).not.toHaveBeenCalled();
  });

  it("onRevelada se llama una sola vez aunque se toque varias veces durante la quema", async () => {
    const onRevelada = jest.fn();
    const user = userEvent.setup({ delay: null });
    render(<CartaQuemable carta={ESTRELLA} etiqueta="Voltear" onRevelada={onRevelada} />);
    const boton = screen.getByRole("button");
    act(() => boton.click());
    act(() => boton.click());
    await vaciarCola();
    act(() => boton.click());
    boton.focus();
    await act(() => user.keyboard("{Enter}"));
    avanzar(DURACION_SOLA * 2);
    act(() => boton.click());
    avanzar(DURACION_SOLA * 2);
    await vaciarCola();
    expect(onRevelada).toHaveBeenCalledTimes(1);
  });

  it("cola global: 5 disparos simultáneos → como mucho 3 lienzos a la vez, 1100 ms cada uno", async () => {
    const onRevelada = jest.fn();
    const { container } = render(
      <div>
        {[0, 1, 2, 3, 4].map((i) => (
          <CartaQuemable key={i} carta={ESTRELLA} etiqueta={`Voltear ${i}`} onRevelada={onRevelada} />
        ))}
      </div>,
    );
    act(() => screen.getAllByRole("button").forEach((b) => b.click()));
    await vaciarCola();
    expect(MAX_QUEMAS).toBe(3);
    // Arranca una por cuadro: en la misma tarea del toque sólo se prepara una quema.
    expect(lienzos(container)).toBe(1);
    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(5);
    avanzar(50);
    expect(lienzos(container)).toBe(3);
    expect(container.querySelectorAll('[data-estado="esperando"]')).toHaveLength(2);

    let maximo = 0;
    for (let ms = 0; ms < DURACION_CON_COLA * 3; ms += 16) {
      avanzar(16);
      await vaciarCola();
      maximo = Math.max(maximo, lienzos(container));
      if (ms === DURACION_CON_COLA + 100) {
        // Las tres primeras ya terminaron (con cola duran 1100 ms) y entraron las otras dos.
        expect(onRevelada).toHaveBeenCalledTimes(3);
        expect(lienzos(container)).toBe(2);
      }
    }
    expect(maximo).toBe(3);
    expect(onRevelada).toHaveBeenCalledTimes(5);
    expect(container.querySelectorAll('[data-estado="revelada"]')).toHaveLength(5);
  });

  it("al desmontar cancela el cuadro pendiente y suelta su lugar en la cola", async () => {
    const cancelar = jest.spyOn(window, "cancelAnimationFrame");
    const cartas = (n: number) =>
      Array.from({ length: n }, (_, i) => <CartaQuemable key={i} carta={ESTRELLA} etiqueta={`Voltear ${i}`} />);
    const { container, rerender } = render(<div>{cartas(4)}</div>);
    act(() => screen.getAllByRole("button").forEach((b) => b.click()));
    avanzar(50);
    await vaciarCola();
    expect(lienzos(container)).toBe(3);
    // Se van dos que estaban quemando: la que esperaba entra, sin pasar de tres.
    rerender(<div>{cartas(4).slice(2)}</div>);
    await vaciarCola();
    expect(cancelar).toHaveBeenCalled();
    expect(lienzos(container)).toBe(2);
    expect(container.querySelectorAll('[data-estado="esperando"]')).toHaveLength(0);
    avanzar(DURACION_SOLA * 2);
  });

  it("invertida gira la imagen y lo dice al revelarse", () => {
    movimientoReducido(true);
    const { container } = render(<CartaQuemable carta={ESTRELLA} etiqueta="Voltear" invertida />);
    expect(container.firstChild).toHaveClass("cq--invertida");
    act(() => screen.getByRole("button").click());
    expect(screen.getByRole("button", { name: "La Estrella · invertida" })).toBeInTheDocument();
  });

  it("dorada: la brasa persistente sólo una vez revelada", () => {
    movimientoReducido(true);
    const { container } = render(<CartaQuemable carta={ESTRELLA} etiqueta="Voltear" dorada />);
    expect(container.firstChild).not.toHaveClass("cq--dorada");
    act(() => screen.getByRole("button").click());
    expect(container.firstChild).toHaveClass("cq--dorada");
  });

  it("sin JS (SSR): el HTML trae la carta y el CSS oculta reverso y pista con scripting: none", () => {
    const html = renderToString(<CartaQuemable carta={ESTRELLA} etiqueta="Voltear la carta de hoy" />);
    expect(html).toContain('src="/cartas/rws-tarot-17-star-color.webp"');
    expect(html).toContain('alt="La Estrella"');
    const css = fs.readFileSync(path.join(process.cwd(), "src/components/tinta/tinta.css"), "utf8");
    expect(html).toContain('class="cq-tapa"');
    expect(css).toMatch(/@media \(scripting: none\)\s*\{\s*\.cq-tapa, \.cq-pista \{ display: none; \}/);
  });

  it("el reverso llena su caja desde la capa de componentes: una utilidad (h-auto, w-16) le gana", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/components/tinta/tinta.css"), "utf8");
    expect(css).toMatch(/@layer components \{\s*\.reverso-carta \{ display: block; width: 100%; height: 100%; \}\s*\}/);
    // Fuera de la capa no queda otra regla de .reverso-carta que ganaría a las utilidades.
    const sinCapa = css.replace(/@layer components \{[\s\S]*?\n\}/, "");
    expect(sinCapa).not.toMatch(/\.reverso-carta\s*\{/);
  });

  it("el resplandor no usa filter ni mix-blend-mode", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/components/tinta/tinta.css"), "utf8");
    const reglasCq = css.split("}").filter((r) => /\.cq[-\w]*/.test(r.split("{")[0] ?? ""));
    expect(reglasCq.join("}")).not.toMatch(/filter|mix-blend-mode/);
  });
});

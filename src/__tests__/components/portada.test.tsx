/**
 * Piezas sueltas de la portada: la carta del día determinista y el revelado al scroll, que nunca deja nada
 * escondido sin JS ni con movimiento reducido.
 */
import { act, render } from "@testing-library/react";
import { cartaDelDia, diaUtc, primeraFrase } from "@/components/landing/cartaDelDia";
import { ATRIBUTO_REVELAR, RevelarAlScroll } from "@/components/landing/RevelarAlScroll";
import { CARTAS } from "@/lib/cartas";

describe("cartaDelDia", () => {
  const dia = (iso: string) => new Date(iso);

  it("da la misma carta a cualquier hora del mismo día UTC", () => {
    const manana = cartaDelDia(dia("2026-11-05T00:00:00Z"));
    expect(cartaDelDia(dia("2026-11-05T12:34:56Z"))).toBe(manana);
    expect(cartaDelDia(dia("2026-11-05T23:59:59.999Z"))).toBe(manana);
    // 17:59 de la Ciudad de México del 5 nov sigue siendo el 5 en UTC; a las 18:00 ya es el 6.
    expect(cartaDelDia(dia("2026-11-05T17:59:00-06:00"))).toBe(manana);
    expect(cartaDelDia(dia("2026-11-05T18:00:00-06:00"))).not.toBe(manana);
  });

  it("es una de las 78 de CARTAS y cambia de un día al siguiente", () => {
    const hoy = cartaDelDia(dia("2026-11-05T10:00:00Z"));
    expect(CARTAS).toContain(hoy);
    expect(cartaDelDia(dia("2026-11-06T10:00:00Z"))).not.toBe(hoy);
  });

  it("en 78 días seguidos salen las 78 cartas, sin repetir", () => {
    const inicio = Date.UTC(2026, 0, 1);
    const vistas = new Set(Array.from({ length: 78 }, (_, i) => cartaDelDia(new Date(inicio + i * 86_400_000)).slug));
    expect(vistas.size).toBe(78);
  });

  it("cuenta días UTC desde 1970", () => {
    expect(diaUtc(new Date("1970-01-02T00:00:00Z"))).toBe(1);
    expect(diaUtc(new Date("1969-12-31T23:00:00Z"))).toBe(-1);
    expect(CARTAS).toContain(cartaDelDia(new Date("1969-12-31T23:00:00Z")));
  });
});

describe("primeraFrase", () => {
  it("toma la primera oración del significado", () => {
    expect(primeraFrase("Esperanza y renovación. Representa la fe.")).toBe("Esperanza y renovación.");
    expect(primeraFrase("  Sin punto final  ")).toBe("Sin punto final.");
    expect(primeraFrase("Termina aquí")).toBe("Termina aquí.");
  });

  it("devuelve null si no hay texto", () => {
    expect(primeraFrase(null)).toBeNull();
    expect(primeraFrase(undefined)).toBeNull();
    expect(primeraFrase("   ")).toBeNull();
  });
});

describe("RevelarAlScroll", () => {
  const observados: Element[] = [];
  let alCruzar: IntersectionObserverCallback = () => {};

  function movimiento(reducido: boolean) {
    (window.matchMedia as jest.Mock).mockImplementation((query: string) => ({
      matches: reducido && query.includes("prefers-reduced-motion: reduce"),
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
  }

  /** Dos bloques: uno ya a la vista (top 100) y otro abajo del pliegue (top 2000). */
  function Pagina() {
    return (
      <main className="portada">
        <div data-revelar data-testid="arriba" />
        <div data-revelar data-testid="abajo" />
        <RevelarAlScroll />
      </main>
    );
  }

  beforeEach(() => {
    observados.length = 0;
    window.innerHeight = 800;
    (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
      constructor(cb: IntersectionObserverCallback) {
        alCruzar = cb;
      }
      observe(el: Element) {
        observados.push(el);
      }
      unobserve() {}
      disconnect() {}
    };
    jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const top = this.dataset.testid === "abajo" ? 2000 : 100;
      return { top, bottom: top + 100, left: 0, right: 100, width: 100, height: 100, x: 0, y: top } as DOMRect;
    });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    document.documentElement.removeAttribute(ATRIBUTO_REVELAR);
  });

  it("marca visible lo que ya está a la vista ANTES de encender el revelado, y lo de abajo al cruzar", () => {
    movimiento(false);
    const { getByTestId } = render(<Pagina />);

    expect(getByTestId("arriba")).toHaveAttribute("data-visible");
    expect(getByTestId("abajo")).not.toHaveAttribute("data-visible");
    expect(document.documentElement).toHaveAttribute(ATRIBUTO_REVELAR);
    expect(observados).toEqual([getByTestId("abajo")]);

    act(() =>
      alCruzar([{ isIntersecting: true, target: getByTestId("abajo") } as unknown as IntersectionObserverEntry], {} as IntersectionObserver)
    );
    expect(getByTestId("abajo")).toHaveAttribute("data-visible");
  });

  it("con movimiento reducido no esconde nada (no enciende el revelado)", () => {
    movimiento(true);
    render(<Pagina />);
    expect(document.documentElement).not.toHaveAttribute(ATRIBUTO_REVELAR);
    expect(observados).toHaveLength(0);
  });

  it("al desmontar apaga el revelado (nada queda escondido en otra página)", () => {
    movimiento(false);
    const { unmount } = render(<Pagina />);
    expect(document.documentElement).toHaveAttribute(ATRIBUTO_REVELAR);
    unmount();
    expect(document.documentElement).not.toHaveAttribute(ATRIBUTO_REVELAR);
  });
});

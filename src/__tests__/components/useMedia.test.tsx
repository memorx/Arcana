/**
 * useMedia (src/components/reading/useMedia.ts): `subscribe` estable por consulta. Con un `subscribe` nuevo en cada
 * render, useSyncExternalStore quita y vuelve a poner el listener de matchMedia en cada uno.
 */
import { act, render, screen } from "@testing-library/react";
import { useMedia } from "@/components/reading/useMedia";

type Escucha = () => void;

/** matchMedia falso: una lista por consulta, con contadores de altas y bajas de listeners. */
function simularMatchMedia(coincide: Record<string, boolean>) {
  const escuchas = new Map<string, Set<Escucha>>();
  const altas = jest.fn();
  const bajas = jest.fn();
  window.matchMedia = jest.fn((consulta: string) => ({
    get matches() {
      return !!coincide[consulta];
    },
    media: consulta,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: (_: string, fn: Escucha) => {
      altas(consulta);
      if (!escuchas.has(consulta)) escuchas.set(consulta, new Set());
      escuchas.get(consulta)!.add(fn);
    },
    removeEventListener: (_: string, fn: Escucha) => {
      bajas(consulta);
      escuchas.get(consulta)?.delete(fn);
    },
    dispatchEvent: jest.fn(),
  })) as unknown as typeof window.matchMedia;
  const cambiar = (consulta: string, valor: boolean) => {
    coincide[consulta] = valor;
    escuchas.get(consulta)?.forEach((fn) => fn());
  };
  return { altas, bajas, cambiar };
}

function Sonda({ consulta, render: n }: { consulta: string; render: number }) {
  const angosto = useMedia(consulta);
  return <p data-testid="sonda" data-render={n}>{angosto ? "angosto" : "ancho"}</p>;
}

const ANGOSTO = "(max-width: 639.98px)";
const matchMediaOriginal = window.matchMedia;

afterEach(() => {
  window.matchMedia = matchMediaOriginal;
});

describe("useMedia", () => {
  it("se suscribe una sola vez aunque el componente se vuelva a pintar", () => {
    const { altas, bajas } = simularMatchMedia({ [ANGOSTO]: false });
    const { rerender } = render(<Sonda consulta={ANGOSTO} render={0} />);
    for (let n = 1; n <= 10; n++) rerender(<Sonda consulta={ANGOSTO} render={n} />);
    expect(altas).toHaveBeenCalledTimes(1);
    expect(bajas).not.toHaveBeenCalled();
  });

  it("sigue los cambios de la ventana", () => {
    const { cambiar } = simularMatchMedia({ [ANGOSTO]: false });
    render(<Sonda consulta={ANGOSTO} render={0} />);
    expect(screen.getByTestId("sonda")).toHaveTextContent("ancho");
    act(() => cambiar(ANGOSTO, true));
    expect(screen.getByTestId("sonda")).toHaveTextContent("angosto");
  });

  it("si cambia la consulta, se da de baja de la vieja y se suscribe a la nueva", () => {
    const { altas, bajas } = simularMatchMedia({ [ANGOSTO]: false, "(max-width: 400px)": true });
    const { rerender, unmount } = render(<Sonda consulta={ANGOSTO} render={0} />);
    rerender(<Sonda consulta="(max-width: 400px)" render={1} />);
    expect(screen.getByTestId("sonda")).toHaveTextContent("angosto");
    expect(altas.mock.calls.flat()).toEqual([ANGOSTO, "(max-width: 400px)"]);
    expect(bajas.mock.calls.flat()).toEqual([ANGOSTO]);
    unmount();
    expect(bajas.mock.calls.flat()).toEqual([ANGOSTO, "(max-width: 400px)"]);
  });
});

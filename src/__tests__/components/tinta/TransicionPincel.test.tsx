import { act, fireEvent, render, screen } from "@testing-library/react";
import { TransicionPincel } from "@/components/tinta/TransicionPincel";

function movimientoReducido(si: boolean) {
  (window.matchMedia as jest.Mock).mockImplementation((query: string) => ({
    matches: si && query.includes("reduce"),
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  }));
}

describe("TransicionPincel", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("con movimiento barre una vez y se quita al terminar la animación", () => {
    movimientoReducido(false);
    const onTerminar = jest.fn();
    render(<TransicionPincel onTerminar={onTerminar} />);
    const barra = screen.getByTestId("transicion-pincel");
    expect(barra).toHaveAttribute("aria-hidden", "true");
    fireEvent.animationEnd(barra);
    expect(screen.queryByTestId("transicion-pincel")).toBeNull();
    act(() => void jest.advanceTimersByTime(2000));
    expect(onTerminar).toHaveBeenCalledTimes(1);
  });

  it("si animationend no llega, se quita sola a los 900 ms", () => {
    movimientoReducido(false);
    const onTerminar = jest.fn();
    render(<TransicionPincel onTerminar={onTerminar} />);
    act(() => void jest.advanceTimersByTime(950));
    expect(screen.queryByTestId("transicion-pincel")).toBeNull();
    expect(onTerminar).toHaveBeenCalledTimes(1);
  });

  it("con reduced-motion no pinta nada y avisa de inmediato", () => {
    movimientoReducido(true);
    const onTerminar = jest.fn();
    const { container } = render(<TransicionPincel onTerminar={onTerminar} />);
    expect(container).toBeEmptyDOMElement();
    expect(onTerminar).toHaveBeenCalledTimes(1);
  });
});

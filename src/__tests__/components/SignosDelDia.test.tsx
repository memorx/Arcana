import { render, screen, within } from "@testing-library/react";
import { SignosDelDia } from "@/components/calendar/SignosDelDia";
import { trazoLuna } from "@/components/energies/LunaGlifo";

describe("SignosDelDia (the twenty day signs, today in pink)", () => {
  it("lists the twenty signs once for screen readers, starting two before today, with today marked", () => {
    // 2026-11-05 is 1 Mázatl (Deer)
    const { container } = render(<SignosDelDia hoy="2026-11-05" locale="es" etiqueta="Los veinte signos" />);

    const lista = screen.getByRole("list", { name: "Los veinte signos" });
    const signos = within(lista).getAllByRole("listitem");
    expect(signos).toHaveLength(20);
    expect(signos[0]).toHaveTextContent(/^Cóatl/);
    expect(signos[2]).toHaveTextContent(/^Mázatl/);
    expect(signos[2]).toHaveAttribute("aria-current", "date");
    expect(signos[2]).toHaveClass("text-rosa-luz");
    expect(lista.querySelectorAll('[aria-current="date"]')).toHaveLength(1);
    expect(signos[3]).toHaveClass("text-papel");

    // The loop copy is hidden from assistive tech; the strip cuts on purpose (data-recorta)
    const listas = container.querySelectorAll("ul");
    expect(listas).toHaveLength(2);
    expect(listas[1]).toHaveAttribute("aria-hidden", "true");
    expect(container.firstElementChild).toHaveAttribute("data-recorta");
    expect(container.firstElementChild).toHaveClass("suelo-tinta");
  });

  it("names the signs in English too", () => {
    render(<SignosDelDia hoy="2026-11-06" locale="en" etiqueta="The twenty signs" />);

    const hoy = within(screen.getByRole("list")).getAllByRole("listitem")[2];
    expect(hoy).toHaveTextContent("TochtliRabbit");
  });
});

describe("LunaGlifo (the moon in two inks)", () => {
  it("draws nothing lit at new moon, half a disc at the quarters and the whole disc at full moon", () => {
    // limb on the lit side, then the terminator with rx = |1 − 2k|·10
    expect(trazoLuna(0, true)).toBe("M12 2A10 10 0 0 1 12 22A10 10 0 0 0 12 2Z");
    expect(trazoLuna(0.5, true)).toBe("M12 2A10 10 0 0 1 12 22A0 10 0 0 1 12 2Z");
    expect(trazoLuna(1, true)).toBe("M12 2A10 10 0 0 1 12 22A10 10 0 0 1 12 2Z");
    // waning: lit on the left
    expect(trazoLuna(0.25, false)).toBe("M12 2A10 10 0 0 0 12 22A5 10 0 0 1 12 2Z");
    // out of range values are clamped
    expect(trazoLuna(-1, true)).toBe(trazoLuna(0, true));
    expect(trazoLuna(Number.NaN, false)).toBe(trazoLuna(0, false));
  });
});

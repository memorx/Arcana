/**
 * Componentes chicos de «Dos tintas»: HoraDelDia, Pincel, Etiqueta, Escena.
 * HoraDelDia usa los textos reales de messages/ (con ICU) para comprobar lo
 * que ve la persona en es y en en.
 */
import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { HoraDelDia } from "@/components/tinta/HoraDelDia";
import { Pincel } from "@/components/tinta/Pincel";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { Escena } from "@/components/tinta/Escena";

let mockLocale: "es" | "en" = "es";

/** ICU mínimo ({x} y {x, select, …}), suficiente para el namespace `hora`
 *  (intl-messageformat es ESM y Jest no lo carga). */
function mockFormatear(msg: string, valores: Record<string, string> = {}): string {
  let salida = "";
  let i = 0;
  while (i < msg.length) {
    if (msg[i] !== "{") {
      salida += msg[i++];
      continue;
    }
    let nivel = 0;
    let j = i;
    for (; j < msg.length; j++) {
      if (msg[j] === "{") nivel++;
      else if (msg[j] === "}" && --nivel === 0) break;
    }
    const [, nombre, opciones] = msg.slice(i + 1, j).match(/^\s*(\w+)\s*(?:,\s*select\s*,([\s\S]*))?$/)!;
    if (opciones === undefined) salida += valores[nombre];
    else {
      const casos: Record<string, string> = {};
      for (const [, clave, texto] of opciones.matchAll(/\s*([^\s{}]+)\s*\{([^{}]*)\}/g)) casos[clave] = texto;
      salida += casos[valores[nombre]] ?? casos.other;
    }
    i = j + 1;
  }
  return salida;
}

jest.mock("next-intl", () => {
  const mensajes: Record<string, Record<string, Record<string, string>>> = {
    es: jest.requireActual("../../../messages/es.json"),
    en: jest.requireActual("../../../messages/en.json"),
  };
  return {
    useLocale: () => mockLocale,
    useTranslations: (ns: string) => (key: string, values?: Record<string, string>) =>
      mockFormatear(mensajes[mockLocale][ns][key], values),
  };
});

const textoDe = (el: HTMLElement) => el.textContent?.replace(/\s+/g, " ").trim() ?? "";

describe("HoraDelDia", () => {
  beforeEach(() => {
    mockLocale = "es";
    // 5 nov 2026, mediodía en la Ciudad de México (TZ de jest.setup)
    jest.useFakeTimers({ now: new Date("2026-11-05T18:00:00Z") });
  });
  afterEach(() => jest.useRealTimers());

  it("larga en es: fecha, 1 Mázatl (Venado), Tláloc y la luna", () => {
    const { container } = render(<HoraDelDia variante="larga" />);
    const texto = textoDe(container);
    expect(texto).toContain("jue 5 nov 2026");
    expect(texto).toContain("1 Mázatl (Venado)");
    expect(texto).toContain("Señor de la noche: Tláloc");
    expect(texto).toContain("Luna menguante 19%");
    expect(container.querySelector("time")).toHaveAttribute("dateTime", "2026-11-05");
  });

  it("corta en es: «5 nov · 1 Mázatl · Tláloc · Luna 19%»", () => {
    const { container } = render(<HoraDelDia variante="corta" />);
    expect(textoDe(container)).toBe("Hoy: 5 nov · 1 Mázatl · Tláloc · Luna 19%");
  });

  it("larga en en: Thu Nov 5, 2026 · 1 Mázatl (Deer) · Lord of the night: Tláloc", () => {
    mockLocale = "en";
    const { container } = render(<HoraDelDia />);
    const texto = textoDe(container);
    expect(texto).toContain("Thu Nov 5, 2026");
    expect(texto).toContain("1 Mázatl (Deer)");
    expect(texto).toContain("Lord of the night: Tláloc");
    expect(texto).toContain("Waning Crescent 19%");
  });

  it("usa el día UTC (todayUtc), no el local: a las 21:00 de CDMX ya es 2 Tochtli", () => {
    jest.setSystemTime(new Date("2026-11-06T03:00:00Z"));
    const { container } = render(<HoraDelDia variante="corta" />);
    expect(textoDe(container)).toContain("6 nov · 2 Tochtli · Xiuhtecuhtli");
  });

  it("el HTML del servidor y el del cliente son el mismo texto y se hidrata sin errores", async () => {
    const elemento = <HoraDelDia variante="larga" />;
    const html = renderToString(elemento);
    const servidor = document.createElement("div");
    servidor.innerHTML = html;

    const { container: cliente } = render(elemento);
    expect(textoDe(servidor)).toBe(textoDe(cliente));

    const errores = jest.fn();
    const consola = jest.spyOn(console, "error").mockImplementation(() => {});
    const raiz = document.createElement("div");
    raiz.innerHTML = html;
    document.body.appendChild(raiz);
    await act(async () => {
      hydrateRoot(raiz, elemento, { onRecoverableError: errores });
    });
    expect(errores).not.toHaveBeenCalled();
    expect(consola).not.toHaveBeenCalled();
    expect(textoDe(raiz)).toBe(textoDe(cliente));
    consola.mockRestore();
    raiz.remove();
  });

  it("acepta una fecha fija", () => {
    const { container } = render(<HoraDelDia variante="corta" fecha={new Date("2026-01-01T00:00:00Z")} />);
    expect(textoDe(container)).toContain("1 ene · 5 Quiáhuitl · Mictlantecuhtli");
  });
});

describe("Pincel", () => {
  it("lleva la fuente de pincel, el filtro de pincel seco y el rosa", () => {
    render(<Pincel>Pregunta</Pincel>);
    const el = screen.getByText("Pregunta");
    expect(el.tagName).toBe("P");
    expect(el).toHaveClass("font-pincel", "pincel-seco", "text-rosa");
  });

  it("puede ser decorativo y otro elemento", () => {
    render(
      <Pincel as="span" aria-hidden="true" className="text-8xl">
        Tu turno
      </Pincel>
    );
    const el = screen.getByText("Tu turno");
    expect(el.tagName).toBe("SPAN");
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el).toHaveClass("text-8xl");
  });
});

describe("Etiqueta", () => {
  it("mono en mayúsculas con el punto rosa decorativo", () => {
    render(<Etiqueta>Del grabado a la IA</Etiqueta>);
    const el = screen.getByText("Del grabado a la IA");
    expect(el).toHaveClass("font-dato", "uppercase", "text-letra-suave");
    const punto = el.querySelector("span");
    expect(punto).toHaveAttribute("aria-hidden", "true");
    expect(punto).toHaveClass("bg-rosa", "rounded-full");
  });

  it("sin punto", () => {
    render(<Etiqueta punto={false}>Dato</Etiqueta>);
    expect(screen.getByText("Dato").querySelector("span")).toBeNull();
  });
});

describe("Escena", () => {
  it("tinta: sección con su suelo y margen para anclas", () => {
    render(
      <Escena suelo="tinta" aria-labelledby="t" id="hoy">
        <h2 id="t">Hoy</h2>
      </Escena>
    );
    const escena = screen.getByRole("region", { name: "Hoy" });
    expect(escena.tagName).toBe("SECTION");
    expect(escena).toHaveClass("suelo-tinta", "scroll-mt-(--alto-cabecera)", "overflow-clip");
    expect(escena).toHaveAttribute("data-suelo", "tinta");
    expect(escena).toHaveAttribute("id", "hoy");
  });

  it("papel", () => {
    render(
      <Escena suelo="papel" as="div" data-testid="e">
        x
      </Escena>
    );
    expect(screen.getByTestId("e")).toHaveClass("suelo-papel");
    expect(screen.getByTestId("e").tagName).toBe("DIV");
  });
});

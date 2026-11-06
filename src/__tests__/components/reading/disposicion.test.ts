/**
 * @jest-environment node
 */
// Pure functions; node environment because the fake AI texts come from @/lib/ai/config (Anthropic SDK).
import {
  arcoDe,
  disposicionDe,
  figuraDe,
  MINI,
  numeroRomano,
  partirInterpretacion,
} from "@/components/reading/disposicion";
import { FAKE_AI_TEXTS } from "@/lib/ai/config";

describe("disposición de la tirada por número de cartas (L2)", () => {
  it("elige la figura de cada tirada sembrada", () => {
    expect(disposicionDe(1)).toBe("una");
    expect(disposicionDe(3, "Three Card Spread")).toBe("fila");
    expect(disposicionDe(5, "Simple Cross")).toBe("cruz");
    expect(disposicionDe(5, "Cruz Simple")).toBe("cruz");
    // Las temáticas de cinco no son una cruz
    expect(disposicionDe(5, "Love Reading")).toBe("fila");
    expect(disposicionDe(5, "Career Spread")).toBe("fila");
    expect(disposicionDe(7, "Horseshoe Spread")).toBe("herradura");
    expect(disposicionDe(10, "Celtic Cross")).toBe("celta");
    expect(disposicionDe(12, "Year Ahead")).toBe("anio");
  });

  it("cae en rejilla con cualquier otro número", () => {
    for (const n of [6, 8, 9, 11, 13]) expect(disposicionDe(n)).toBe("rejilla");
    expect(disposicionDe(0)).toBe("una");
  });

  it("la herradura es un arco: el centro arriba y las puntas abajo", () => {
    const alturas = Array.from({ length: 7 }, (_, i) => arcoDe(i, 7));
    expect(alturas).toEqual([3, 2, 1, 0, 1, 2, 3]);
  });

  it("dibuja la Cruz Celta con la cruz a la izquierda y el báculo de abajo arriba", () => {
    const { cartas, ancho, alto } = figuraDe(10, "Celtic Cross");
    expect(cartas).toHaveLength(10);
    // Ninguna carta encima de otra
    expect(new Set(cartas.map((c) => `${c.x},${c.y}`)).size).toBe(10);
    const [presente, desafio, pasado, futuro, arriba, abajo, ...baculo] = cartas;
    expect(pasado.x).toBeLessThan(presente.x);
    expect(futuro.x).toBeGreaterThan(presente.x);
    expect(arriba.y).toBeLessThan(presente.y);
    expect(desafio.y).toBeGreaterThan(presente.y);
    expect(abajo.y).toBeGreaterThan(desafio.y);
    // El báculo: una columna a la derecha, la 7 abajo y la 10 arriba
    expect(new Set(baculo.map((c) => c.x)).size).toBe(1);
    expect(baculo[0].x).toBeGreaterThan(futuro.x);
    expect(baculo.map((c) => c.y)).toEqual([...baculo.map((c) => c.y)].sort((a, b) => b - a));
    expect(ancho).toBe(Math.max(...cartas.map((c) => c.x)) + MINI.ancho);
    expect(alto).toBe(Math.max(...cartas.map((c) => c.y)) + MINI.alto);
  });

  it("los doce meses van en dos renglones de seis y la cruz simple en cruz", () => {
    const anio = figuraDe(12, "Year Ahead").cartas;
    expect(new Set(anio.map((c) => c.y)).size).toBe(2);
    const cruz = figuraDe(5, "Simple Cross").cartas;
    expect(cruz[4].y).toBeLessThan(cruz[0].y); // consejo arriba
    expect(cruz[3].y).toBeGreaterThan(cruz[0].y); // influencia oculta abajo
  });

  it("numera las posiciones como los grabados", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(numeroRomano)).toEqual([
      "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII",
    ]);
  });
});

describe("la interpretación como pliego (L2)", () => {
  it("aparta las preguntas del final y deja la afirmación del último párrafo en el cuerpo", () => {
    const { parrafos, preguntas } = partirInterpretacion(FAKE_AI_TEXTS.es.reading);
    expect(preguntas).toEqual(["¿Qué te dirías si no tuvieras miedo de equivocarte?"]);
    expect(parrafos).toHaveLength(4);
    expect(parrafos[3]).toBe("Llévate esto al día: un paso pequeño vale más que una certeza grande.");
  });

  it("no pierde ni reordena texto", () => {
    for (const texto of [FAKE_AI_TEXTS.es.reading, FAKE_AI_TEXTS.en.reading]) {
      const { parrafos, preguntas } = partirInterpretacion(texto);
      const junto = [...parrafos, ...preguntas].join(" ").replace(/\s+/g, " ");
      expect(junto).toBe(texto.replace(/\s+/g, " ").trim());
    }
  });

  it("toma párrafos enteros de preguntas y en inglés también", () => {
    const texto = "Primero.\n\nSegundo, con calma.\n\n¿Qué quieres cuidar? ¿Qué sueltas?\n\nWhat would you keep?";
    expect(partirInterpretacion(texto)).toEqual({
      parrafos: ["Primero.", "Segundo, con calma."],
      preguntas: ["¿Qué quieres cuidar? ¿Qué sueltas?", "What would you keep?"],
    });
  });

  it("sin preguntas al final, todo es cuerpo; y nunca se queda sin cuerpo", () => {
    expect(partirInterpretacion("Uno.\nDos.").preguntas).toEqual([]);
    expect(partirInterpretacion("¿Sólo una pregunta?")).toEqual({ parrafos: ["¿Sólo una pregunta?"], preguntas: [] });
    // Un párrafo que no se puede partir en oraciones se queda entero
    expect(partirInterpretacion("Algo.\n…y luego ¿qué?").parrafos).toEqual(["Algo.", "…y luego ¿qué?"]);
  });
});

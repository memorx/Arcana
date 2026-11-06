/**
 * Disposición de una tirada sobre el papel (1 a 12 cartas) y el texto de la interpretación como pliego.
 * Funciones puras: las usan <Tirada>, la lámina de cada tirada en /reading/new y la interpretación.
 */

/**
 * - una: una sola carta.
 * - fila: de 2 a 5 cartas en renglón (la de tres es la de la maqueta `lectura.html`).
 * - cruz: Cruz Simple (5): pasado y futuro a los lados, consejo arriba, influencia oculta abajo.
 * - herradura: 7 cartas en arco.
 * - celta: Cruz Celta (10): la cruz y el báculo a la derecha.
 * - anio: 12 cartas como los meses (6 × 2, 4 × 3, 3 × 4).
 * - rejilla: cualquier otro número.
 * En móvil (< 640 px) todo lo que no es una, fila de ≤ 3 o cruz pasa a rejilla de 3 con el nombre de la posición encima.
 */
export type ClaveDisposicion = "una" | "fila" | "cruz" | "herradura" | "celta" | "anio" | "rejilla";

const ES_CRUZ = /\b(cross|cruz)\b/i;
const ES_CELTA = /celt/i;

/** Disposición según el número de cartas (y, para 5, si la tirada es una cruz). `nombre` es el nombre en inglés o en español. */
export function disposicionDe(total: number, nombre = ""): ClaveDisposicion {
  if (total <= 1) return "una";
  if (total === 5 && ES_CRUZ.test(nombre) && !ES_CELTA.test(nombre)) return "cruz";
  if (total <= 5) return "fila";
  if (total === 7) return "herradura";
  if (total === 10) return "celta";
  if (total === 12) return "anio";
  return "rejilla";
}

/** Altura en el arco de la herradura: 0 en la carta del centro, más abajo hacia las puntas. */
export function arcoDe(indice: number, total: number): number {
  return Math.abs(indice - (total - 1) / 2);
}

/** Celdas (columna, fila; desde 1) de cada posición en las disposiciones con figura, para dibujar la lámina en miniatura. */
export const FIGURAS: Partial<Record<ClaveDisposicion, { columnas: number; filas: number; celdas: [number, number][] }>> = {
  // 1 presente al centro · 2 pasado a la izquierda · 3 futuro a la derecha · 4 abajo · 5 arriba
  cruz: { columnas: 3, filas: 3, celdas: [[2, 2], [1, 2], [3, 2], [2, 3], [2, 1]] },
  // 1 presente · 2 desafío · 3 pasado · 4 futuro · 5 arriba · 6 abajo · 7–10 el báculo de abajo arriba
  celta: {
    columnas: 5,
    filas: 4,
    celdas: [[2, 2], [2, 3], [1, 2], [3, 2], [2, 1], [2, 4], [5, 4], [5, 3], [5, 2], [5, 1]],
  },
};

/** Medidas de la miniatura (en unidades del SVG): carta de 10 × 17 y 4 de separación. */
export const MINI = { ancho: 10, alto: 17, separacion: 4 } as const;

/**
 * La figura de la tirada en miniatura (la lámina de /reading/new): el rincón superior izquierdo de cada carta, en el
 * orden de las posiciones, y el tamaño total. Misma disposición que <Tirada> en escritorio.
 */
export function figuraDe(total: number, nombre = ""): { ancho: number; alto: number; cartas: { x: number; y: number }[] } {
  const n = Math.max(1, Math.floor(total));
  const clave = disposicionDe(n, nombre);
  const pasoX = MINI.ancho + MINI.separacion;
  const pasoY = MINI.alto + MINI.separacion;
  let celdas: [number, number][];

  const figura = FIGURAS[clave];
  if (figura && figura.celdas.length === n) {
    celdas = figura.celdas.map(([c, f]) => [c - 1, f - 1]);
  } else if (clave === "anio") {
    celdas = Array.from({ length: n }, (_, i) => [i % 6, Math.floor(i / 6)]);
  } else if (clave === "rejilla") {
    celdas = Array.from({ length: n }, (_, i) => [i % 5, Math.floor(i / 5)]);
  } else {
    celdas = Array.from({ length: n }, (_, i) => [i, 0]);
  }

  const cartas = celdas.map(([c, f], i) => ({
    x: c * pasoX,
    y: f * pasoY + (clave === "herradura" ? Math.round(arcoDe(i, n) * 4) : 0),
  }));
  const ancho = Math.max(...cartas.map((c) => c.x)) + MINI.ancho;
  const alto = Math.max(...cartas.map((c) => c.y)) + MINI.alto;
  return { ancho, alto, cartas };
}

const ROMANOS: [number, string][] = [
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

/** 1 → I, 4 → IV, 12 → XII (las posiciones de una tirada, como los grabados). */
export function numeroRomano(n: number): string {
  let resto = Math.max(0, Math.floor(n));
  let salida = "";
  for (const [valor, letra] of ROMANOS) {
    while (resto >= valor) {
      salida += letra;
      resto -= valor;
    }
  }
  return salida;
}

/**
 * La interpretación como pliego: párrafos y, aparte, las preguntas con que cierra (van en cursiva bajo un filete).
 * Sólo se separan las oraciones interrogativas del final; si el último párrafo empieza afirmando y termina
 * preguntando, la afirmación se queda en el cuerpo. No se pierde ni se reordena ningún texto.
 */
export function partirInterpretacion(texto: string): { parrafos: string[]; preguntas: string[] } {
  const parrafos = texto
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const preguntas: string[] = [];

  while (parrafos.length > 1) {
    const ultimo = parrafos[parrafos.length - 1];
    const oraciones = ultimo.match(/[^.!?…]+(?:[.!?…]+["'»”)\]]*|$)/g)?.map((o) => o.trim()).filter(Boolean) ?? [];
    // Si el corte en oraciones no reproduce el párrafo (p. ej. empieza con «…»), no se toca.
    if (oraciones.join("").replace(/\s+/g, "") !== ultimo.replace(/\s+/g, "")) break;
    let corte = oraciones.length;
    while (corte > 0 && esPregunta(oraciones[corte - 1])) corte--;
    if (corte === oraciones.length) break; // no termina en pregunta
    preguntas.unshift(oraciones.slice(corte).join(" "));
    parrafos.pop();
    if (corte > 0) {
      parrafos.push(oraciones.slice(0, corte).join(" "));
      break; // el párrafo empezaba afirmando: aquí termina el cuerpo
    }
  }

  return { parrafos, preguntas };
}

function esPregunta(oracion: string): boolean {
  return /\?["'»”)\]]*$/.test(oracion);
}

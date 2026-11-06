/**
 * Índice de los 78 grabados: palos en el orden del mazo y numeración romana.
 * Lo comparten /cards, /cards/[slug] y /collection (sólo piel: no toca datos).
 */

export type Palo = "major" | "wands" | "cups" | "swords" | "pentacles";

/** Mayores, Bastos, Copas, Espadas, Oros: el orden del seed y del mazo. */
export const PALOS: readonly Palo[] = ["major", "wands", "cups", "swords", "pentacles"];

const SUIT_A_PALO: Record<string, Palo> = {
  WANDS: "wands",
  CUPS: "cups",
  SWORDS: "swords",
  PENTACLES: "pentacles",
};

export function esPalo(valor: unknown): valor is Palo {
  return typeof valor === "string" && (PALOS as readonly string[]).includes(valor);
}

/** El palo de una carta de la base (`arcana` MAJOR/MINOR, `suit` WANDS…). */
export function paloDe(carta: { arcana: string; suit: string | null }): Palo {
  if (carta.arcana === "MAJOR") return "major";
  return SUIT_A_PALO[carta.suit ?? ""] ?? "major";
}

const ROMANOS: readonly [number, string][] = [
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

/** 17 → «XVII». El 0 se queda «0», como en El Loco. */
export function numeroRomano(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  let resto = Math.floor(n);
  let salida = "";
  for (const [valor, cifra] of ROMANOS) {
    while (resto >= valor) {
      salida += cifra;
      resto -= valor;
    }
  }
  return salida;
}

/** Agrupa en el orden de PALOS conservando el orden de cada grupo; omite los palos vacíos. */
export function agruparPorPalo<T extends { arcana: string; suit: string | null }>(
  cartas: readonly T[]
): [Palo, T[]][] {
  const grupos = new Map<Palo, T[]>(PALOS.map((p) => [p, []]));
  for (const carta of cartas) grupos.get(paloDe(carta))!.push(carta);
  return PALOS.map((p) => [p, grupos.get(p)!] as [Palo, T[]]).filter(([, lista]) => lista.length > 0);
}

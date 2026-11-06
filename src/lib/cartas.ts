/**
 * Las 78 cartas Rider-Waite-Smith (Pamela Colman Smith, 1909; dominio público), autohospedadas en `public/cartas/`.
 *
 * Cada carta tiene tres variantes WebP que genera `scripts/cartas.py`:
 *   - `color`  480 px — la carta revelada (lo único a todo color en «Dos tintas»)
 *   - `tinta`  360 px — el grabado en negro sobre papel
 *   - `mesa`   200 px — gris horneado para la mesa de grabados
 *
 * La UI deja de leer `card.imageUrl` (Wikimedia en caliente: 429 y «The Lovers» con 404) y usa `cartaImagen()`.
 */

export type VarianteCarta = "color" | "tinta" | "mesa";

export interface CartaRWS {
  /** Nombre en inglés, idéntico a `name` en `prisma/seed.ts`. */
  name: string;
  /** Nombre de archivo sin variante: `rws-tarot-06-lovers`, `cups02`… */
  slug: string;
}

/** Medidas nominales de cada variante (los escaneos varían entre 805 y 832 px de alto a 480 de ancho). */
export const MEDIDAS_CARTA: Readonly<Record<VarianteCarta, { width: number; height: number }>> = {
  color: { width: 480, height: 822 },
  tinta: { width: 360, height: 616 },
  mesa: { width: 200, height: 342 },
};

/** Imagen que se usa cuando un nombre no corresponde a ninguna de las 78 (el reverso de Arcana). */
export const CARTA_REVERSO = "/cartas/reverso.svg";

const MAYORES: readonly [string, string][] = [
  ["The Fool", "fool"],
  ["The Magician", "magician"],
  ["The High Priestess", "high-priestess"],
  ["The Empress", "empress"],
  ["The Emperor", "emperor"],
  ["The Hierophant", "hierophant"],
  ["The Lovers", "lovers"],
  ["The Chariot", "chariot"],
  ["Strength", "strength"],
  ["The Hermit", "hermit"],
  ["Wheel of Fortune", "wheel-of-fortune"],
  ["Justice", "justice"],
  ["The Hanged Man", "hanged-man"],
  ["Death", "death"],
  ["Temperance", "temperance"],
  ["The Devil", "devil"],
  ["The Tower", "tower"],
  ["The Star", "star"],
  ["The Moon", "moon"],
  ["The Sun", "sun"],
  ["Judgement", "judgement"],
  ["The World", "world"],
];

const RANGOS = [
  "Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King",
] as const;

/** Palos en el orden del seed (bastos, copas, espadas, oros) con el prefijo del archivo de Wikimedia. */
const PALOS: readonly [string, string][] = [
  ["Wands", "wands"],
  ["Cups", "cups"],
  ["Swords", "swords"],
  ["Pentacles", "pents"],
];

/** Las 78, en el orden de `prisma/seed.ts`: 22 mayores y luego bastos, copas, espadas y oros (As → Rey). */
export const CARTAS: readonly CartaRWS[] = Object.freeze([
  ...MAYORES.map(([name, s], i) => ({ name, slug: `rws-tarot-${String(i).padStart(2, "0")}-${s}` })),
  ...PALOS.flatMap(([palo, prefijo]) =>
    RANGOS.map((rango, i) => ({ name: `${rango} of ${palo}`, slug: `${prefijo}${String(i + 1).padStart(2, "0")}` })),
  ),
]);

const normalizar = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

const POR_NOMBRE = new Map<string, string>(CARTAS.map((c) => [normalizar(c.name), c.slug]));
const SLUGS = new Set(CARTAS.map((c) => c.slug));

// Variantes de escritura que circulan (ortografía de EE. UU., «The» opcional, «Coins» por «Pentacles»).
const ALIAS: Record<string, string> = {
  judgment: "judgement",
  "the wheel of fortune": "wheel of fortune",
  "the strength": "strength",
  "the justice": "justice",
  "the death": "death",
  "the temperance": "temperance",
  "the judgement": "judgement",
  "the judgment": "judgement",
};

/**
 * `"The Lovers"` → `"rws-tarot-06-lovers"`, `"Two of Cups"` → `"cups02"`.
 * También acepta un slug ya hecho. Devuelve `""` si el nombre no es ninguna de las 78.
 */
export function slugCarta(nombreEnIngles: string): string {
  const n = normalizar(nombreEnIngles ?? "");
  if (SLUGS.has(n)) return n;
  const directo = POR_NOMBRE.get(n) ?? POR_NOMBRE.get(ALIAS[n] ?? "");
  if (directo) return directo;
  const menor = n.replace(/ of coins$/, " of pentacles");
  return POR_NOMBRE.get(menor) ?? "";
}

/**
 * Ruta pública de una carta: `cartaImagen({ name: "The Star" })` → `"/cartas/rws-tarot-17-star-color.webp"`.
 * Acepta la carta (con `name` en inglés), su nombre o su slug. Si no es ninguna de las 78 devuelve el reverso.
 */
export function cartaImagen(c: { name: string } | string, v: VarianteCarta = "color"): string {
  const slug = slugCarta(typeof c === "string" ? c : c.name);
  return slug ? `/cartas/${slug}-${v}.webp` : CARTA_REVERSO;
}

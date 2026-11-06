/**
 * La mesa de grabados del dashboard y del historial: qué cartas se ven y cómo se
 * llaman. Las lecturas guardan sólo `cardId`; el nombre en inglés (para el slug de
 * `@/lib/cartas`) sale de una consulta de lectura a `card`.
 */
import { prisma } from "@/lib/prisma";
import { parseReadingCards } from "@/lib/insights";
import { slugCarta } from "@/lib/cartas";

/** La banda del dashboard lleva como mucho 16 grabados (plan §5.4: 8 columnas × 2 filas). */
export const MAX_GRABADOS_MESA = 16;

/**
 * Los grabados de una mesa sin historia (cuenta nueva): los mismos de la portada de la
 * maqueta, mayores y menores alternados para que la banda no se vea repetida.
 */
export const MESA_FIJA: readonly string[] = [
  "rws-tarot-00-fool",
  "cups01",
  "rws-tarot-13-death",
  "swords03",
  "rws-tarot-21-world",
  "rws-tarot-01-magician",
  "wands10",
  "rws-tarot-18-moon",
  "pents01",
  "rws-tarot-06-lovers",
  "rws-tarot-02-high-priestess",
  "swords01",
  "rws-tarot-19-sun",
  "cups10",
  "rws-tarot-17-star",
  "rws-tarot-16-tower",
];

/**
 * Slugs para `<MesaDeGrabados>`: primero las cartas de las lecturas recientes (sin
 * repetir, en orden de aparición), luego se completa con la mesa fija. Nunca más de `max`.
 */
export function slugsParaMesa(nombres: readonly string[], max: number = MAX_GRABADOS_MESA): string[] {
  const tope = Math.max(0, Math.min(max, MAX_GRABADOS_MESA));
  const vistos = new Set<string>();
  const slugs: string[] = [];
  const poner = (slug: string) => {
    if (!slug || vistos.has(slug) || slugs.length >= tope) return;
    vistos.add(slug);
    slugs.push(slug);
  };
  for (const nombre of nombres) poner(slugCarta(nombre));
  for (const slug of MESA_FIJA) poner(slug);
  return slugs;
}

/**
 * Nombre en inglés de cada carta que aparece en estas lecturas (`cardId` → `name`).
 * Si la consulta falla, devuelve un mapa vacío: la mesa cae en la fija y el historial
 * se queda sin miniaturas, pero la página no se cae.
 */
export async function nombresDeCartas(lecturas: readonly { cards: unknown }[]): Promise<Map<string, string>> {
  const ids = [...new Set(lecturas.flatMap((l) => parseReadingCards(l.cards).map((c) => c.cardId)))];
  if (ids.length === 0) return new Map();
  try {
    const cartas = await prisma.card.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    return new Map(cartas.map((c) => [c.id, c.name]));
  } catch (error) {
    console.error("[mesa] Could not load the card names:", error);
    return new Map();
  }
}

/** Las cartas de una lectura en su orden de posición, con su nombre en inglés (las desconocidas se omiten). */
export function cartasDeLectura(
  cards: unknown,
  nombres: ReadonlyMap<string, string>
): { cardId: string; name: string; isReversed: boolean }[] {
  return parseReadingCards(cards)
    .sort((a, b) => a.position - b.position)
    .flatMap((c) => {
      const name = nombres.get(c.cardId);
      return name ? [{ cardId: c.cardId, name, isReversed: c.isReversed }] : [];
    });
}

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { MAJOR_ARCANA } from "@/lib/systems";
import { cartaDelDia, primeraFrase } from "./cartaDelDia";

export interface CartaDelDiaPortada {
  /** Nombre en inglés, como en la base (`Card.name`). */
  name: string;
  /** Slug de `@/lib/cartas` (la imagen sale de `cartaImagen`). */
  slug: string;
  /** Nombre para mostrar en el idioma de la página. */
  nombre: string;
  /** Primera oración de su significado al derecho, o null si no hay datos en ese idioma. */
  sentido: string | null;
}

interface FilaCarta {
  nameEs: string;
  meaningUpright: string;
  meaningUprightEn: string | null;
}

/** Nombre y significado de una carta de la base; cambian casi nunca, así que se guardan una hora. */
const leerCarta = unstable_cache(
  async (name: string): Promise<FilaCarta | null> =>
    prisma.card.findFirst({
      where: { name },
      select: { nameEs: true, meaningUpright: true, meaningUprightEn: true },
    }),
  ["portada-carta-del-dia"],
  { revalidate: 3600 }
);

/**
 * La carta de ejemplo del día para la portada: la elige `cartaDelDia` (día UTC, sin base) y la base le pone
 * nombre en español y su significado. Si la base no contesta, la escena se arma igual: nombre de los arcanos
 * mayores (`MAJOR_ARCANA`) o el inglés, y sin significado.
 */
export async function cargarCartaDelDia(fecha: Date, locale: string): Promise<CartaDelDiaPortada> {
  const carta = cartaDelDia(fecha);
  let fila: FilaCarta | null = null;
  try {
    fila = await leerCarta(carta.name);
  } catch (error) {
    console.error("[portada] No se pudo leer la carta del día:", error);
  }
  const ingles = locale === "en";
  const nombre = ingles
    ? carta.name
    : (fila?.nameEs ?? MAJOR_ARCANA.find((m) => m.name === carta.name)?.nameEs ?? carta.name);
  const sentido = primeraFrase(ingles ? fila?.meaningUprightEn : fila?.meaningUpright);
  return { name: carta.name, slug: carta.slug, nombre, sentido };
}

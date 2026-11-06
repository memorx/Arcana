/**
 * La carta de ejemplo de la escena 3 de la portada: una de las 78 de `CARTAS`, elegida por el día UTC
 * (la misma convención que `todayUtc()`, /calendar y la carta del día). Es determinista: el mismo día da
 * la misma carta a cualquier hora y en cualquier servidor, y el día siguiente da otra.
 */
import { CARTAS, type CartaRWS } from "@/lib/cartas";

const MS_DIA = 86_400_000;
/** Salto entre un día y el siguiente. Coprimo con 78: en 78 días seguidos salen las 78, sin repetir. */
const SALTO = 29;
const DESFASE = 17;

/** Número de día UTC desde 1970-01-01 (sin importar la hora ni el huso). */
export function diaUtc(fecha: Date): number {
  return Math.floor(fecha.getTime() / MS_DIA);
}

export function cartaDelDia(fecha: Date): CartaRWS {
  const n = CARTAS.length;
  const i = (((diaUtc(fecha) * SALTO + DESFASE) % n) + n) % n;
  return CARTAS[i];
}

/** Primera oración de un significado («Esperanza, inspiración y renovación después de la tormenta.»). */
export function primeraFrase(texto: string | null | undefined): string | null {
  const limpio = texto?.replace(/\s+/g, " ").trim();
  if (!limpio) return null;
  const fin = limpio.search(/[.!?…](\s|$)/);
  const frase = fin >= 0 ? limpio.slice(0, fin + 1) : `${limpio}.`;
  return frase.length > 1 ? frase : null;
}

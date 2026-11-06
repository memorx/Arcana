"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * ¿Casa la consulta de medios? En el servidor (y en la primera pasada) responde `alServidor`; luego sigue los
 * cambios de la ventana. Lo usa el revelado para dar cartas «chicas» (lienzo y pista cortos) en móvil.
 * `subscribe` es estable por consulta: si cambiara en cada render, React quitaría y volvería a poner el listener
 * de `matchMedia` en cada uno (el revelado se vuelve a pintar cada 700 ms al barajar y con cada carta).
 */
export function useMedia(consulta: string, alServidor = false): boolean {
  const suscribir = useCallback(
    (avisar: () => void) => {
      const mq = typeof window !== "undefined" ? window.matchMedia?.(consulta) : undefined;
      if (!mq) return () => {};
      mq.addEventListener?.("change", avisar);
      return () => mq.removeEventListener?.("change", avisar);
    },
    [consulta]
  );
  return useSyncExternalStore(
    suscribir,
    () => (typeof window !== "undefined" ? !!window.matchMedia?.(consulta)?.matches : alServidor),
    () => alServidor
  );
}

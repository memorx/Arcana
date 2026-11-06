"use client";

import { useSyncExternalStore } from "react";

/**
 * ¿Casa la consulta de medios? En el servidor (y en la primera pasada) responde `alServidor`; luego sigue los
 * cambios de la ventana. Lo usa el revelado para dar cartas «chicas» (lienzo y pista cortos) en móvil.
 */
export function useMedia(consulta: string, alServidor = false): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const mq = typeof window !== "undefined" ? window.matchMedia?.(consulta) : undefined;
      if (!mq) return () => {};
      mq.addEventListener?.("change", avisar);
      return () => mq.removeEventListener?.("change", avisar);
    },
    () => (typeof window !== "undefined" ? !!window.matchMedia?.(consulta)?.matches : alServidor),
    () => alServidor
  );
}

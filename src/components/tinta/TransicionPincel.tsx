"use client";

/**
 * <TransicionPincel> — una barra de tinta que barre la pantalla una vez (≈ 450 ms) al montar.
 * Sólo con movimiento: con `prefers-reduced-motion` o sin JS no pinta nada. Se usa únicamente al entrar al revelado
 * de una tirada (`/reading/new/*`, paso «revealing») y a `/daily` (plan §5.4); para repetirla, cambia su `key`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import "./tinta.css";

export interface TransicionPincelProps {
  /** Se llama al terminar el barrido (o de inmediato si no hay movimiento). */
  onTerminar?: () => void;
  className?: string;
}

/** Borde de pincel seco: los dos cantos de la barra, irregulares. */
const BARRA =
  "M9 0H93L97 4 94 9 99 15 95 22 100 30 96 39 99 47 94 55 98 63 95 71 100 79 96 87 99 94 95 100H6L2 96 5 89 0 82 4 74 1 66 6 58 2 50 7 42 3 34 6 26 1 18 5 10 2 4Z";

export function TransicionPincel({ onTerminar, className }: TransicionPincelProps) {
  const [activa, setActiva] = useState(false);
  const onTerminarRef = useRef(onTerminar);
  const terminadaRef = useRef(false);
  useEffect(() => {
    onTerminarRef.current = onTerminar;
  });

  const acabar = useCallback(() => {
    if (terminadaRef.current) return;
    terminadaRef.current = true;
    setActiva(false);
    onTerminarRef.current?.();
  }, []);

  useEffect(() => {
    terminadaRef.current = false;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      acabar();
      return;
    }
    setActiva(true);
    // Red de seguridad por si `animationend` no llega (pestaña en segundo plano).
    const id = window.setTimeout(acabar, 900);
    return () => window.clearTimeout(id);
  }, [acabar]);

  if (!activa) return null;
  return (
    <div
      className={["tp", className].filter(Boolean).join(" ")}
      aria-hidden="true"
      data-testid="transicion-pincel"
      onAnimationEnd={acabar}
    >
      <svg className="tp-barra" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
        <path d={BARRA} fill="#0E0D0C" />
        <path d="M94 0h2.2l-3 100H91z" fill="#E4007C" opacity=".85" />
      </svg>
    </div>
  );
}

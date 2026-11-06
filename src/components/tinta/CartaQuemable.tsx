"use client";

/**
 * <CartaQuemable> — la carta boca abajo que, al tocarla, se quema desde el punto tocado con brasa rosa y deja ver
 * la carta a color. Port de `quemar()` en design/maqueta/tinta.js con los límites de rendimiento del plan (§5.6):
 *
 * - Lienzo fijo de 150 × 260 (90 × 156 en `chica`) sin importar el DPR; el resplandor va en otro lienzo a mitad de
 *   resolución escalado por CSS, sin `filter: blur` ni `mix-blend-mode`.
 * - Cola global (de módulo): como mucho 3 quemas a la vez. Una quema dura 1700 ms; en cuanto alguna carta tiene
 *   que esperar, las que corren y las que esperan pasan a 1100 ms («voltear todas» de 12 ≈ 4.4 s).
 * - Sin `getContext`, con `getImageData` que lanza o con `prefers-reduced-motion`: se revela con un fundido corto.
 * - Sin JavaScript la carta se ve revelada (el reverso se oculta con `@media (scripting: none)`).
 * - El `requestAnimationFrame` vive sólo mientras se quema y se cancela al desmontar.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { cartaImagen, MEDIDAS_CARTA } from "@/lib/cartas";
import { ReversoCarta, pintarReverso } from "./ReversoCarta";
import "./tinta.css";

export type TamanoCarta = "chica" | "media" | "grande";

export interface CartaQuemableProps {
  /** La carta: nombre para mostrar (en el idioma de la página) y slug de `@/lib/cartas`. */
  carta: { nombre: string; slug: string };
  /** Carta invertida: la imagen se gira 180°. */
  invertida?: boolean;
  /**
   * Controlada desde fuera (p. ej. «voltear todas»). `true` al montar: aparece revelada sin animación;
   * pasar de `false` a `true`: se quema (por la cola); de `true` a `false`: vuelve boca abajo.
   * Si se omite, la carta sólo se revela al tocarla.
   */
  revelada?: boolean;
  /** Se llama una vez cada vez que la carta termina de revelarse (por toque, teclado o `revelada`). */
  onRevelada?: () => void;
  /** Nombre accesible del botón mientras está boca abajo («Voltear la carta del pasado»). */
  etiqueta: string;
  /** chica ≈ 92 px · media ≈ 132–220 px · grande ≈ hasta 360 px. El ancho se puede fijar con `--cq-ancho`. */
  tamano?: TamanoCarta;
  /** Texto alternativo de la imagen a color (por omisión, el nombre de la carta). */
  alt?: string;
  /** Pista visible sobre el reverso; por omisión «Toca para voltear» (`carta.pista`). `false` la quita. */
  pista?: string | false;
  /** Carta dorada: al revelarse queda con la brasa rosa persistente. */
  dorada?: boolean;
  /** Carga la imagen a color de inmediato (carta del día, primera tirada visible). */
  prioridad?: boolean;
  className?: string;
}

type Estado = "boca-abajo" | "esperando" | "quemando" | "revelada";

const LIENZO: Record<TamanoCarta, readonly [number, number]> = {
  chica: [90, 156],
  media: [150, 260],
  grande: [150, 260],
};

// ---------------------------------------------------------------------------------------------------------------------
// Cola global de quemas
// ---------------------------------------------------------------------------------------------------------------------

export const MAX_QUEMAS = 3;
export const DURACION_SOLA = 1700;
export const DURACION_CON_COLA = 1100;

interface Turno {
  iniciar: () => void;
  /** Hubo cola mientras esta quema esperaba o corría: dura DURACION_CON_COLA. */
  conCola: boolean;
}
const activas = new Set<Turno>();
const espera: Turno[] = [];

function procesarCola() {
  while (activas.size < MAX_QUEMAS && espera.length > 0) {
    const turno = espera.shift()!;
    activas.add(turno);
    turno.iniciar();
  }
  // Si alguien se quedó esperando, todas las quemas en curso y en espera pasan al ritmo corto
  // (la que ya corría ajusta su reloj sin saltos).
  if (espera.length > 0) {
    activas.forEach((t) => (t.conCola = true));
    espera.forEach((t) => (t.conCola = true));
  }
}

/** Pide lugar para quemar. Si hay lugar, `iniciar` corre ya; si no, cuando se libere uno. */
function pedirTurno(iniciar: () => void): { turno: Turno; soltar: () => void } {
  const turno: Turno = { iniciar, conCola: false };
  espera.push(turno);
  procesarCola();
  return {
    turno,
    soltar: () => {
      const i = espera.indexOf(turno);
      if (i >= 0) espera.splice(i, 1);
      if (activas.delete(turno)) procesarCola();
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// El quemado (algoritmo de design/maqueta/tinta.js)
// ---------------------------------------------------------------------------------------------------------------------

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const suave = (t: number) => t * t * (3 - 2 * t);

/** Ruido de valor en dos octavas, suavizado: da bordes de quemadura irregulares. */
function ruido(w: number, h: number): Float32Array {
  const capa = (gx: number, gy: number) => {
    const g = new Float32Array((gx + 1) * (gy + 1));
    for (let i = 0; i < g.length; i++) g[i] = Math.random();
    const v = (i: number, j: number) => g[Math.min(j, gy) * (gx + 1) + Math.min(i, gx)];
    return (x: number, y: number) => {
      const fx = (x / w) * gx;
      const fy = (y / h) * gy;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = suave(fx - x0);
      const ty = suave(fy - y0);
      const a = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * tx;
      const b = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * tx;
      return a + (b - a) * ty;
    };
  };
  const c1 = capa(6, 10);
  const c2 = capa(18, 30);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = c1(x, y) * 0.68 + c2(x, y) * 0.32;
  return out;
}

interface Quema {
  w: number;
  h: number;
  /** Momento en que se quema cada píxel (0 en el punto tocado, ~1.1 en la esquina más lejana). */
  v: Float32Array;
  dorso: Uint8ClampedArray;
  img: ImageData;
  brillo: ImageData;
  base: CanvasRenderingContext2D;
  resplandor: CanvasRenderingContext2D;
}

const BANDA = 0.085;
const CHAMUSCO = 0.06;

function prepararQuema(
  base: CanvasRenderingContext2D,
  resplandor: CanvasRenderingContext2D,
  w: number,
  h: number,
  punto: { fx: number; fy: number },
): Quema {
  pintarReverso(base, w, h);
  const dorso = base.getImageData(0, 0, w, h); // puede lanzar (lienzo bloqueado por el navegador): lo atrapa quien llama
  const n = ruido(w, h);
  const px = punto.fx * w;
  const py = punto.fy * h;
  const maxD = Math.max(Math.hypot(px, py), Math.hypot(w - px, py), Math.hypot(px, h - py), Math.hypot(w - px, h - py));
  const v = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      v[i] = (Math.hypot(x - px, y - py) / maxD) * 0.74 + n[i] * 0.36;
    }
  }
  return {
    w,
    h,
    v,
    dorso: dorso.data,
    img: base.createImageData(w, h),
    brillo: resplandor.createImageData(w >> 1, h >> 1),
    base,
    resplandor,
  };
}

/** Un cuadro de la quema con avance `p` ∈ [0, 1]. */
function pintarCuadro(q: Quema, p: number) {
  const t = -0.05 + suave(clamp(p)) * 1.25;
  const a = q.img.data;
  const d = q.dorso;
  const v = q.v;
  for (let i = 0, n = q.w * q.h; i < n; i++) {
    const j = i * 4;
    const vi = v[i];
    if (vi < t - BANDA) {
      a[j + 3] = 0; // ya se quemó: se ve la carta
      continue;
    }
    if (vi < t) {
      const k = (t - vi) / BANDA; // 0 en el frente, 1 al consumirse: brasa rosa → blanco
      a[j] = 255;
      a[j + 1] = 107 + 148 * k;
      a[j + 2] = 181 + 74 * k;
      a[j + 3] = 255 * (1 - k * 0.85);
      continue;
    }
    const c = vi < t + CHAMUSCO ? 0.35 + 0.65 * ((vi - t) / CHAMUSCO) : 1; // borde chamuscado
    a[j] = d[j] * c;
    a[j + 1] = d[j + 1] * c * 0.92;
    a[j + 2] = d[j + 2] * c * 0.9;
    a[j + 3] = 255;
  }
  // Resplandor rosa a media resolución: una banda más ancha que la brasa, centrada un poco detrás del frente.
  const gw = q.w >> 1;
  const gh = q.h >> 1;
  const g = q.brillo.data;
  const centro = t - BANDA * 0.4;
  const ancho = BANDA * 1.7;
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const o = (y * gw + x) * 4;
      const k = 1 - Math.abs(v[y * 2 * q.w + x * 2] - centro) / ancho;
      if (k <= 0) {
        g[o + 3] = 0;
        continue;
      }
      g[o] = 228;
      g[o + 1] = 0;
      g[o + 2] = 124;
      g[o + 3] = 175 * k * k;
    }
  }
  q.base.putImageData(q.img, 0, 0);
  q.resplandor.putImageData(q.brillo, 0, 0);
}

function prefiereQuieto(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
}

/** ¿Hay canvas 2D? (jsdom, navegadores con el canvas bloqueado). Sin él ni se monta el lienzo. */
function hayCanvas(): boolean {
  try {
    return !!document.createElement("canvas").getContext("2d");
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------------------------------------------------

export function CartaQuemable({
  carta,
  invertida = false,
  revelada,
  onRevelada,
  etiqueta,
  tamano = "media",
  alt,
  pista,
  dorada = false,
  prioridad = false,
  className,
}: CartaQuemableProps) {
  const t = useTranslations("carta");
  const [estado, setEstado] = useState<Estado>(revelada ? "revelada" : "boca-abajo");
  const [fundido, setFundido] = useState(false);
  const [anunciar, setAnunciar] = useState(false);

  const estadoRef = useRef<Estado>(estado);
  const puntoRef = useRef({ fx: 0.5, fy: 0.62 });
  const turnoRef = useRef<Turno | null>(null);
  const soltarRef = useRef<(() => void) | null>(null);
  const rafRef = useRef(0);
  const avisarRef = useRef(false);
  const onReveladaRef = useRef(onRevelada);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const brilloRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    onReveladaRef.current = onRevelada;
  });

  const cambiar = useCallback((e: Estado) => {
    estadoRef.current = e;
    setEstado(e);
  }, []);

  const soltarTurno = useCallback(() => {
    const soltar = soltarRef.current;
    soltarRef.current = null;
    turnoRef.current = null;
    soltar?.();
  }, []);

  const terminar = useCallback(
    (conFundido: boolean) => {
      soltarTurno();
      avisarRef.current = true;
      setFundido(conFundido);
      setAnunciar(true);
      cambiar("revelada");
    },
    [cambiar, soltarTurno],
  );

  const empezar = useCallback(
    (fx: number, fy: number) => {
      if (estadoRef.current !== "boca-abajo") return;
      if (prefiereQuieto() || !hayCanvas()) {
        terminar(true);
        return;
      }
      puntoRef.current = { fx, fy };
      cambiar("esperando");
      const { turno, soltar } = pedirTurno(() => cambiar("quemando"));
      turnoRef.current = turno;
      soltarRef.current = soltar;
    },
    [cambiar, terminar],
  );

  // Los lienzos existen sólo en «quemando»: se preparan y se pinta el primer cuadro antes de que el navegador pinte,
  // para que entre el reverso y el lienzo no se asome la carta.
  useLayoutEffect(() => {
    if (estado !== "quemando") return;
    const [w, h] = LIENZO[tamano];
    let quema: Quema;
    try {
      const base = baseRef.current?.getContext("2d") ?? null;
      const resplandor = brilloRef.current?.getContext("2d") ?? null;
      if (!base || !resplandor) throw new Error("sin canvas 2D");
      quema = prepararQuema(base, resplandor, w, h, puntoRef.current);
      pintarCuadro(quema, 0);
    } catch {
      terminar(true);
      return;
    }
    const duracionDe = () => (turnoRef.current?.conCola ? DURACION_CON_COLA : DURACION_SOLA);
    let duracion = duracionDe();
    let t0 = performance.now();
    const cuadro = (ahora: number) => {
      const nueva = duracionDe();
      if (nueva !== duracion) {
        // Entró cola a media quema: mismo avance, ritmo nuevo.
        t0 = ahora - clamp((ahora - t0) / duracion) * nueva;
        duracion = nueva;
      }
      const p = clamp((ahora - t0) / duracion);
      pintarCuadro(quema, p);
      if (p < 1) rafRef.current = requestAnimationFrame(cuadro);
      else {
        rafRef.current = 0;
        terminar(false);
      }
    };
    rafRef.current = requestAnimationFrame(cuadro);
    return () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [estado, tamano, terminar]);

  // Aviso único por cada revelación.
  useEffect(() => {
    if (estado !== "revelada" || !avisarRef.current) return;
    avisarRef.current = false;
    onReveladaRef.current?.();
  }, [estado]);

  // `revelada` controlada desde fuera.
  useEffect(() => {
    if (revelada === undefined) return;
    if (revelada) {
      if (estadoRef.current === "boca-abajo") empezar(0.5, 0.62);
    } else if (estadoRef.current !== "boca-abajo") {
      soltarTurno();
      avisarRef.current = false;
      setFundido(false);
      setAnunciar(false);
      cambiar("boca-abajo");
    }
  }, [revelada, empezar, soltarTurno, cambiar]);

  // Al desmontar: suelta el turno y corta el cuadro pendiente.
  useEffect(
    () => () => {
      const soltar = soltarRef.current;
      soltarRef.current = null;
      soltar?.();
      cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const alTocar = (e: MouseEvent<HTMLButtonElement>) => {
    if (estadoRef.current !== "boca-abajo") return;
    const r = e.currentTarget.getBoundingClientRect();
    // Enter/Espacio llegan como click con detail 0: se quema desde abajo del centro, como en la maqueta.
    const teclado = e.detail === 0 || !r.width || !r.height;
    empezar(
      teclado ? 0.5 : clamp((e.clientX - r.left) / r.width),
      teclado ? 0.62 : clamp((e.clientY - r.top) / r.height),
    );
  };

  const [w, h] = LIENZO[tamano];
  const nombreAnunciado = invertida ? `${carta.nombre} · ${t("invertida")}` : carta.nombre;
  const textoPista = pista === false ? "" : (pista ?? t(tamano === "chica" ? "pistaCorta" : "pista"));
  const estaRevelada = estado === "revelada";
  const clases = [
    "cq",
    `cq--${tamano}`,
    invertida && "cq--invertida",
    fundido && "cq--fundido",
    dorada && estaRevelada && "cq--dorada",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={clases} data-estado={estado}>
      <button
        type="button"
        className="cq-boton"
        aria-label={estaRevelada ? nombreAnunciado : etiqueta}
        aria-disabled={estaRevelada || undefined}
        aria-busy={estado === "esperando" || estado === "quemando" || undefined}
        onClick={alTocar}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- WebP autohospedada y ya optimizada (scripts/cartas.py) */}
        <img
          className="cq-cara"
          src={cartaImagen(carta.slug)}
          alt={alt ?? carta.nombre}
          width={MEDIDAS_CARTA.color.width}
          height={MEDIDAS_CARTA.color.height}
          loading={prioridad ? "eager" : "lazy"}
          fetchPriority={prioridad ? "high" : undefined}
          decoding="async"
          draggable={false}
        />
        {(estado === "boca-abajo" || estado === "esperando") && <ReversoCarta className="cq-reverso" />}
        {estado === "quemando" && (
          <>
            <canvas ref={baseRef} className="cq-lienzo" width={w} height={h} aria-hidden="true" />
            <canvas ref={brilloRef} className="cq-brillo" width={w >> 1} height={h >> 1} aria-hidden="true" />
          </>
        )}
        {estado === "boca-abajo" && textoPista ? (
          <span className="cq-pista" aria-hidden="true">
            {textoPista}
          </span>
        ) : null}
      </button>
      <span className="sr-only" aria-live="polite">
        {anunciar && estaRevelada ? nombreAnunciado : ""}
      </span>
    </div>
  );
}

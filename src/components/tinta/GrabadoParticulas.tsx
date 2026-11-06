"use client";

/**
 * <GrabadoParticulas> — escena 2 de la portada: un grabado de 1909 se deshace en partículas al hacer scroll y se
 * recompone en las primeras líneas de una lectura. Port de la escena 2 de design/maqueta/tinta.js.
 *
 * - La escena mide 320svh y el lienzo queda fijo (sticky); el avance sale del scroll.
 * - El grabado se corta de arriba abajo al mismo ritmo en que salen sus partículas, que viajan a los renglones del
 *   texto (lo de arriba del grabado llega a las primeras líneas). El 6 % de las partículas son rosas.
 * - Sólo dibuja en scroll/resize (un rAF por evento): no hay bucle eterno.
 * - En ≤ 820 px, con `prefers-reduced-motion` o sin JS: grabado y texto quietos, uno debajo del otro.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cartaImagen, MEDIDAS_CARTA } from "@/lib/cartas";

export interface GrabadoParticulasProps {
  /** El grabado que se deshace (variante `tinta`). */
  carta: { slug: string };
  /** Los párrafos de la lectura en que se recompone. */
  texto: string[];
  /** Renglón final en mono rosa («Lectura de ejemplo · Arcana»). */
  firma?: string;
  /** Texto alternativo del grabado («El Loco, grabado de Pamela Colman Smith, 1909»). */
  alt?: string;
  /** Columna de texto a la izquierda del lienzo (etiqueta, título, bajada). */
  children?: ReactNode;
  className?: string;
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const suave = (t: number) => t * t * (3 - 2 * t);
const SALIDA = 0.56; // en unidades de avance: cuándo sale el último renglón del grabado
const VIAJE = 0.4; // cuánto tarda cada partícula en llegar

interface Particula {
  sx: number;
  sy: number;
  dx: number;
  dy: number;
  nx: number;
  ny: number;
  rosa: boolean;
  sale: number;
}
interface Caja {
  x: number;
  y: number;
  w: number;
  h: number;
}

function muestrear(
  pintar: (o: CanvasRenderingContext2D, w: number, h: number) => void,
  caja: Caja,
  paso: number,
  umbral: number,
  limite: number,
): [number, number][] {
  const off = document.createElement("canvas");
  off.width = Math.max(1, Math.round(caja.w / paso));
  off.height = Math.max(1, Math.round(caja.h / paso));
  const o = off.getContext("2d", { willReadFrequently: true });
  if (!o) return [];
  pintar(o, off.width, off.height);
  const d = o.getImageData(0, 0, off.width, off.height).data;
  const out: [number, number][] = [];
  for (let y = 0; y < off.height; y++) {
    for (let x = 0; x < off.width; x++) {
      const i = (y * off.width + x) * 4;
      const lum = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
      if (d[i + 3] > 40 && lum < umbral) out.push([caja.x + x * paso, caja.y + y * paso]);
    }
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, limite);
}

const estatico = () =>
  typeof window === "undefined" ||
  !window.matchMedia ||
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
  window.matchMedia("(max-width: 820px)").matches;

export function GrabadoParticulas({ carta, texto, firma, alt = "", children, className }: GrabadoParticulasProps) {
  const t = useTranslations("carta");
  const [activa, setActiva] = useState(false);
  const raizRef = useRef<HTMLDivElement>(null);
  const lienzoRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const grabadoRef = useRef<HTMLImageElement>(null);
  const textoRef = useRef<HTMLDivElement>(null);
  // Los párrafos como clave estable: un arreglo nuevo con el mismo texto no reconstruye las partículas.
  const claveTexto = JSON.stringify(texto);

  // Activa = con movimiento y > 820 px. Se recalcula si cambian las preferencias o el ancho.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const consultas = [window.matchMedia("(prefers-reduced-motion: reduce)"), window.matchMedia("(max-width: 820px)")];
    const revisar = () => setActiva(!estatico());
    revisar();
    consultas.forEach((q) => q.addEventListener?.("change", revisar));
    return () => consultas.forEach((q) => q.removeEventListener?.("change", revisar));
  }, []);

  useEffect(() => {
    const raiz = raizRef.current;
    const lienzo = lienzoRef.current;
    const canvas = canvasRef.current;
    const grabado = grabadoRef.current;
    const textoEl = textoRef.current;
    if (!activa || !raiz || !lienzo || !canvas || !grabado || !textoEl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      lienzo.style.setProperty("--p-corte", "0");
      lienzo.style.setProperty("--p-texto", "1");
      return;
    }
    let pts: Particula[] = [];
    let ancho = 0;
    let alto = 0;
    let raf = 0;
    let vivo = true;

    const fijar = (corte: number, txt: number) => {
      lienzo.style.setProperty("--p-corte", String(corte));
      lienzo.style.setProperty("--p-texto", String(txt));
    };

    function construir() {
      const cr = canvas!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ancho = cr.width;
      alto = cr.height;
      canvas!.width = Math.round(ancho * dpr);
      canvas!.height = Math.round(alto * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts = [];
      if (!grabado!.complete || !grabado!.naturalWidth || !ancho) return;
      const ir = grabado!.getBoundingClientRect();
      const cajaG = { x: ir.left - cr.left, y: ir.top - cr.top, w: ir.width, h: ir.height };
      let origen: [number, number][];
      try {
        origen = muestrear((o, w, h) => o.drawImage(grabado!, 0, 0, w, h), cajaG, 2.4, 118, 5200);
      } catch {
        return; // lienzo bloqueado: sin partículas, el texto aparece igual
      }
      // Destino: las líneas reales del texto, dibujadas con su misma fuente y ancho.
      const tr = textoEl!.getBoundingClientRect();
      const cajaT = { x: tr.left - cr.left, y: tr.top - cr.top, w: tr.width, h: tr.height };
      const cs = getComputedStyle(textoEl!);
      let destino: [number, number][];
      try {
        destino = muestrear(
          (o, w) => {
            const esc = w / cajaT.w;
            o.scale(esc, esc);
            o.fillStyle = "#000";
            o.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
            o.textBaseline = "top";
            const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5;
            let y = 0;
            for (const p of Array.from(textoEl!.querySelectorAll("p"))) {
              if (p.classList.contains("gp-firma")) break;
              const palabras = (p.textContent ?? "").trim().split(/\s+/);
              let linea = "";
              for (const pal of palabras) {
                const prueba = linea ? `${linea} ${pal}` : pal;
                if (o.measureText(prueba).width > cajaT.w && linea) {
                  o.fillText(linea, 0, y);
                  y += lh;
                  linea = pal;
                } else linea = prueba;
              }
              if (linea) {
                o.fillText(linea, 0, y);
                y += lh;
              }
              y += lh * 0.7;
            }
          },
          cajaT,
          1.6,
          140,
          6000,
        );
      } catch {
        return;
      }
      if (!destino.length || !origen.length) return;
      origen.sort((a, b) => a[1] - b[1]);
      destino.sort((a, b) => a[1] - b[1]);
      // Sale primero lo de arriba del grabado y llega primero a las primeras líneas del texto.
      pts = origen.map((o, i) => {
        const d = destino[Math.floor((i / origen.length) * destino.length)];
        const yN = clamp((o[1] - cajaG.y) / cajaG.h);
        return {
          sx: o[0],
          sy: o[1],
          dx: d[0],
          dy: d[1],
          nx: (Math.random() - 0.5) * 2,
          ny: (Math.random() - 0.5) * 2,
          rosa: Math.random() < 0.06,
          sale: yN * SALIDA + Math.random() * 0.03,
        };
      });
    }

    function progreso() {
      const r = raiz!.getBoundingClientRect();
      return clamp(-r.top / Math.max(1, r.height - window.innerHeight));
    }

    function dibujar() {
      raf = 0;
      if (!vivo) return;
      ctx!.clearRect(0, 0, ancho, alto);
      if (!pts.length) {
        fijar(0, 1);
        return;
      }
      const p = progreso();
      const m = clamp((p - 0.06) / 0.76); // avance del viaje
      const tx = clamp((p - 0.84) / 0.12); // aparece el texto real
      fijar(clamp(m / SALIDA), tx);
      if (m <= 0 || tx >= 1) return;
      const alfa = 1 - tx;
      for (const q of pts) {
        if (m < q.sale) continue; // aún es parte del grabado
        const k = suave(clamp((m - q.sale) / VIAJE));
        const arco = Math.sin(k * Math.PI);
        const x = q.sx + (q.dx - q.sx) * k + arco * q.nx * 16;
        const y = q.sy + (q.dy - q.sy) * k + arco * q.ny * 22 - arco * 26;
        ctx!.fillStyle = q.rosa ? `rgba(228,0,124,${alfa})` : `rgba(14,13,12,${alfa * (0.55 + 0.45 * (1 - arco))})`;
        const s = 1.3 + arco * 0.8;
        ctx!.fillRect(x, y, s, s);
      }
    }

    const pedir = () => {
      if (!raf) raf = requestAnimationFrame(dibujar);
    };
    const reconstruir = () => {
      if (!vivo) return;
      construir();
      pedir();
    };
    let espera: ReturnType<typeof setTimeout> | undefined;
    const alRedimensionar = () => {
      clearTimeout(espera);
      espera = setTimeout(reconstruir, 180);
    };

    if (grabado.complete) reconstruir();
    else grabado.addEventListener("load", reconstruir, { once: true });
    document.fonts?.ready.then(reconstruir).catch(() => {});
    window.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", alRedimensionar);
    return () => {
      vivo = false;
      cancelAnimationFrame(raf);
      clearTimeout(espera);
      grabado.removeEventListener("load", reconstruir);
      window.removeEventListener("scroll", pedir);
      window.removeEventListener("resize", alRedimensionar);
      lienzo.style.removeProperty("--p-corte");
      lienzo.style.removeProperty("--p-texto");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [activa, carta.slug, claveTexto]);

  return (
    <div ref={raizRef} className={["gp", activa && "gp--activa", className].filter(Boolean).join(" ")}>
      <div className="gp-fijo">
        <div className={children ? "gp-contenido" : "gp-contenido gp-contenido--solo"}>
          {children ? <div className="gp-texto">{children}</div> : null}
          <div ref={lienzoRef} className="gp-lienzo">
            {/* eslint-disable-next-line @next/next/no-img-element -- WebP autohospedada; hace falta el <img> real para muestrear sus píxeles */}
            <img
              ref={grabadoRef}
              className="gp-grabado"
              src={cartaImagen(carta.slug, "tinta")}
              alt={alt}
              width={MEDIDAS_CARTA.tinta.width}
              height={MEDIDAS_CARTA.tinta.height}
              decoding="async"
            />
            <canvas ref={canvasRef} aria-hidden="true" />
            <div ref={textoRef} className="gp-lectura">
              {texto.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              {firma ? <p className="gp-firma">{firma}</p> : null}
            </div>
          </div>
        </div>
        <p className="gp-progreso" aria-hidden="true">
          {t("desliza")}
        </p>
      </div>
    </div>
  );
}

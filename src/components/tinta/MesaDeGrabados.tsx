"use client";

/**
 * <MesaDeGrabados> — retícula girada de grabados que deriva lento (héroe de la portada y banda del dashboard).
 *
 * - Llena a su contenedor (que debe ser `position: relative` y recortar); el velo de tinta encima lo pone la escena.
 * - Variante `mesa` (200 px, gris horneado): sin `filter` en CSS.
 * - 8 columnas × 5 filas en ≥ 720 px y 4 × 5 abajo (las columnas de más se ocultan y, con `loading="lazy"`, ni se piden).
 * - Perezosos y de baja prioridad, salvo las primeras `inmediatas` filas de las 4 columnas que se ven en móvil: en el
 *   héroe de la portada un grabado de ahí es el LCP en todo ancho de teléfono, y con `lazy` + `low` Chrome lo pide al
 *   final (3,7 s en Slow 4G). Esas van sin `loading` ni `fetchPriority` (las pide el escáner como cualquier imagen).
 * - La deriva es CSS (transform) y se pausa fuera de pantalla (IntersectionObserver) y con reduced-motion.
 * - Decorativa: `aria-hidden`.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CARTAS, cartaImagen, MEDIDAS_CARTA } from "@/lib/cartas";

export interface MesaDeGrabadosProps {
  /** Slugs de `@/lib/cartas`, en orden de lectura por columnas. Si faltan, se repiten; vacío = las 78. */
  slugs: string[];
  /** Columnas en ≥ 720 px (por omisión 8). Abajo de 720 se muestran como mucho 4. */
  columnas?: number;
  /** Filas por columna (por omisión 5). */
  filas?: number;
  /**
   * Filas de arriba (en las 4 columnas que se ven en móvil) que se piden de inmediato, sin `loading="lazy"` ni
   * `fetchPriority="low"`. Por omisión 0: todas perezosas. Sólo para una mesa que se ve al abrir la página.
   */
  inmediatas?: number;
  className?: string;
}

const COLUMNAS_MOVIL = 4;

export function MesaDeGrabados({ slugs, columnas = 8, filas = 5, inmediatas = 0, className }: MesaDeGrabadosProps) {
  const raizRef = useRef<HTMLDivElement>(null);
  const [enPantalla, setEnPantalla] = useState(true);

  useEffect(() => {
    const raiz = raizRef.current;
    if (!raiz || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setEnPantalla(e.isIntersecting), { rootMargin: "120px 0px" });
    io.observe(raiz);
    return () => io.disconnect();
  }, []);

  const lista = slugs.length > 0 ? slugs : CARTAS.map((c) => c.slug);
  const cols = Math.max(1, Math.round(columnas));
  const fil = Math.max(1, Math.round(filas));
  const estilo = {
    "--mdg-columnas": cols,
    "--mdg-columnas-movil": Math.min(cols, COLUMNAS_MOVIL),
  } as CSSProperties;

  return (
    <div
      ref={raizRef}
      className={["mdg", !enPantalla && "mdg--pausada", className].filter(Boolean).join(" ")}
      style={estilo}
      aria-hidden="true"
    >
      <div className="mdg-reticula">
        {Array.from({ length: cols }, (_, c) => (
          <div key={c} className={c >= COLUMNAS_MOVIL ? "mdg-columna mdg-columna--ancha" : "mdg-columna"}>
            {Array.from({ length: fil }, (_, f) => {
              const slug = lista[(c * fil + f) % lista.length];
              const inmediata = c < COLUMNAS_MOVIL && f < inmediatas;
              return (
                // eslint-disable-next-line @next/next/no-img-element -- WebP de 200 px ya optimizada (scripts/cartas.py)
                <img
                  key={f}
                  src={cartaImagen(slug, "mesa")}
                  alt=""
                  width={MEDIDAS_CARTA.mesa.width}
                  height={MEDIDAS_CARTA.mesa.height}
                  loading={inmediata ? undefined : "lazy"}
                  decoding="async"
                  fetchPriority={inmediata ? undefined : "low"}
                  draggable={false}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

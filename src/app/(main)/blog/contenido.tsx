import type { ReactNode } from "react";
import Image from "next/image";
import { CARTAS, cartaImagen, MEDIDAS_CARTA } from "@/lib/cartas";
import { cn } from "@/lib/utils";

/**
 * El cuerpo de un artículo del blog, del Markdown sencillo de `BlogPost.content` a HTML con estilos propios
 * (no hay plugin de typography). Reglas:
 * - La página ya tiene su h1 (el título del post): el `# ` del contenido se rebaja a h2, y si repite el
 *   título se omite (sería el mismo renglón dos veces). `## ` es h2 y `### ` es h3.
 * - Los renglones `- ` y `1. ` seguidos se agrupan en una lista real (<ul>/<ol>). Un renglón en blanco cierra la
 *   lista: dos listas separadas por uno son dos listas. Una numerada empieza en el número de su primer renglón
 *   (`start`), así que la que sigue a un párrafo continúa la cuenta («3. …» tras el párrafo es un 3, no un 1).
 * - `**negritas**` dentro de cualquier renglón.
 */

type Bloque =
  | { tipo: "h2" | "h3" | "p"; texto: string }
  | { tipo: "ul"; items: string[] }
  | { tipo: "ol"; items: string[]; start?: number };

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();

export function bloquesDelArticulo(texto: string, titulo?: string): Bloque[] {
  const bloques: Bloque[] = [];
  let primero = true;
  let enBlanco = false; // hubo un renglón en blanco desde el bloque anterior

  for (const crudo of texto.split(/\r?\n/)) {
    const linea = crudo.trimEnd();
    if (linea.trim() === "") {
      enBlanco = true;
      continue;
    }

    const esPrimero = primero;
    const separado = enBlanco;
    primero = false;
    enBlanco = false;

    if (linea.startsWith("### ")) {
      bloques.push({ tipo: "h3", texto: linea.slice(4) });
      continue;
    }
    if (linea.startsWith("## ")) {
      bloques.push({ tipo: "h2", texto: linea.slice(3) });
      continue;
    }
    if (linea.startsWith("# ")) {
      const encabezado = linea.slice(2);
      // El primer «# » suele repetir el título del post, que ya es el h1 de la página.
      if (esPrimero && titulo && normalizar(encabezado) === normalizar(titulo)) continue;
      bloques.push({ tipo: "h2", texto: encabezado });
      continue;
    }

    const vineta = linea.match(/^\s*[-*] (.+)$/);
    if (vineta) {
      const ultimo = bloques.at(-1);
      if (!separado && ultimo?.tipo === "ul") ultimo.items.push(vineta[1]);
      else bloques.push({ tipo: "ul", items: [vineta[1]] });
      continue;
    }
    const numero = linea.match(/^\s*(\d+)\. (.+)$/);
    if (numero) {
      const ultimo = bloques.at(-1);
      const desde = Number(numero[1]);
      if (!separado && ultimo?.tipo === "ol") ultimo.items.push(numero[2]);
      else bloques.push(desde === 1 ? { tipo: "ol", items: [numero[2]] } : { tipo: "ol", items: [numero[2]], start: desde });
      continue;
    }

    bloques.push({ tipo: "p", texto: linea });
  }

  return bloques;
}

/** `**negritas**` dentro de un renglón. */
function enLinea(texto: string): ReactNode[] {
  return texto.split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
    parte.startsWith("**") && parte.endsWith("**") && parte.length > 4 ? (
      <strong key={i} className="font-semibold text-tinta">
        {parte.slice(2, -2)}
      </strong>
    ) : (
      parte
    )
  );
}

export function ContenidoArticulo({ texto, titulo }: { texto: string; titulo?: string }) {
  return (
    <div className="grid max-w-[66ch] gap-[1.1em] font-lectura text-[1.125rem] leading-[1.7] text-tinta">
      {bloquesDelArticulo(texto, titulo).map((b, i) => {
        switch (b.tipo) {
          case "h2":
            return (
              <h2 key={i} className="mt-[1.1em] text-[clamp(1.5rem,1.2rem+1vw,2rem)] leading-[1.15] first:mt-0">
                {enLinea(b.texto)}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} className="mt-[0.5em] text-[1.3rem] leading-tight first:mt-0">
                {enLinea(b.texto)}
              </h3>
            );
          case "ul":
            return (
              <ul key={i} className="grid list-disc gap-2 pl-6 marker:text-rosa">
                {b.items.map((item, j) => (
                  <li key={j} className="pl-1">
                    {enLinea(item)}
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol
                key={i}
                start={b.start}
                className="grid list-decimal gap-2 pl-7 marker:font-dato marker:text-[0.85em] marker:text-rosa-texto"
              >
                {b.items.map((item, j) => (
                  <li key={j} className="pl-1">
                    {enLinea(item)}
                  </li>
                ))}
              </ol>
            );
          default:
            return <p key={i}>{enLinea(b.texto)}</p>;
        }
      })}
    </div>
  );
}

/** ¿La portada vive en otro dominio? `next/image` sólo optimiza rutas propias: no hay `images.remotePatterns`. */
export function portadaExterna(src: string): boolean {
  return /^(https?:)?\/\//i.test(src.trim());
}

/**
 * La imagen de un artículo, con la misma regla en el índice y en su página: la portada del post si la tiene (una
 * externa va sin optimizar; si no, `/_next/image` contesta 400) y, si no, su grabado en tinta. Decorativa
 * (`alt=""`); llena el ancho de su contenedor.
 */
export function ImagenDelArticulo({
  slug,
  portada,
  sizes,
  perezosa = false,
  claseGrabado,
}: {
  slug: string;
  portada?: string | null;
  /** `sizes` de la portada: el ancho máximo de su contenedor. */
  sizes: string;
  perezosa?: boolean;
  /** Clases extra del grabado en tinta. */
  claseGrabado?: string;
}) {
  if (portada) {
    return (
      <div className="relative aspect-[7/12] w-full overflow-hidden border border-tinta/20">
        <Image
          src={portada}
          alt=""
          fill
          sizes={sizes}
          unoptimized={portadaExterna(portada)}
          loading={perezosa ? "lazy" : undefined}
          className="object-cover"
        />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- WebP autohospedada y ya optimizada (scripts/cartas.py)
    <img
      src={grabadoDelArticulo(slug)}
      alt=""
      width={MEDIDAS_CARTA.tinta.width}
      height={MEDIDAS_CARTA.tinta.height}
      loading={perezosa ? "lazy" : undefined}
      decoding="async"
      className={cn("h-auto w-full", claseGrabado)}
    />
  );
}

/**
 * Arcanos Mayores que acompañan artículos como adorno. Fuera los de imagen dura (el Colgado, la Muerte,
 * el Diablo, la Torre, el Juicio): de adorno junto a una guía se leerían como un mensaje.
 */
const LAMINAS_DEL_BLOG = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 14, 17, 18, 19, 21] as const;

/**
 * Un grabado en tinta para cada artículo (decorativo), fijo por slug: el mismo post siempre lleva la misma
 * lámina en el índice y en su página.
 */
export function grabadoDelArticulo(slug: string): string {
  // FNV-1a de 32 bits: reparte bien slugs parecidos.
  let h = 0x811c9dc5;
  for (const letra of slug) {
    h ^= letra.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return cartaImagen(CARTAS[LAMINAS_DEL_BLOG[h % LAMINAS_DEL_BLOG.length]], "tinta");
}

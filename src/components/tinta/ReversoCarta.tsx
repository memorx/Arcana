/**
 * El reverso de las cartas de Arcana (el de `design/maqueta/img/reverso.svg`), en una sola geometría que comparten
 * el SVG de React y el pintor de canvas de `<CartaQuemable>`:
 * 78 marcas (una larga cada 13: seis), 20 puntos del tonalli (el primero rosa), 13 guiones de la trecena,
 * el anillo rosa con su punto, filetes de papel y «ARCANA» en mono. Lienzo de 300 × 520.
 *
 * No usa hooks: sirve en componentes de servidor y de cliente.
 */
import type { SVGProps } from "react";

const TINTA = "#0E0D0C";
const PAPEL = "#ECEAE6";
const NIEBLA = "#A8A49D";
const ROSA = "#E4007C";

export const REVERSO_ANCHO = 300;
export const REVERSO_ALTO = 520;
const CX = 150;
const CY = 260;

interface Trazo {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  w: number;
}
interface Punto {
  cx: number;
  cy: number;
  r: number;
  rosa: boolean;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

function radial(angulo: number, rIn: number, rOut: number, w: number): Trazo {
  const c = Math.cos(angulo);
  const s = Math.sin(angulo);
  return { x1: r1(CX + rIn * c), y1: r1(CY + rIn * s), x2: r1(CX + rOut * c), y2: r1(CY + rOut * s), w };
}

const ARRIBA = -Math.PI / 2;

/** 78 marcas: las 78 cartas. La primera de cada grupo de 13 es larga. */
const MARCAS: Trazo[] = Array.from({ length: 78 }, (_, i) => {
  const a = ARRIBA + (i * 2 * Math.PI) / 78;
  return i % 13 === 0 ? radial(a, 98, 122, 1.4) : radial(a, 104, 118, 0.7);
});

/** 20 puntos: los signos del tonalpohualli; el primero, rosa. */
const PUNTOS: Punto[] = Array.from({ length: 20 }, (_, i) => {
  const a = ARRIBA + (i * 2 * Math.PI) / 20;
  return { cx: r1(CX + 86 * Math.cos(a)), cy: r1(CY + 86 * Math.sin(a)), r: i === 0 ? 2.6 : 1.6, rosa: i === 0 };
});

/** 13 guiones: los días de la trecena. */
const GUIONES: Trazo[] = Array.from({ length: 13 }, (_, i) => radial(ARRIBA + (i * 2 * Math.PI) / 13, 58, 70, 1));

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export interface ReversoCartaProps extends Omit<SVGProps<SVGSVGElement>, "children" | "viewBox"> {
  /** Si se da, el SVG es una imagen con ese nombre; si no, es decorativo (`aria-hidden`). */
  titulo?: string;
}

/** El reverso como SVG escalable (llena su contenedor; `preserveAspectRatio` recorta al centro). */
export function ReversoCarta({ titulo, className, ...resto }: ReversoCartaProps) {
  const accesible = titulo
    ? { role: "img" as const, "aria-label": titulo }
    : { "aria-hidden": true as const, focusable: "false" as const };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${REVERSO_ANCHO} ${REVERSO_ALTO}`}
      preserveAspectRatio="xMidYMid slice"
      className={["reverso-carta", className].filter(Boolean).join(" ")}
      {...accesible}
      {...resto}
    >
      <rect width="300" height="520" fill={TINTA} />
      <rect x="12" y="12" width="276" height="496" rx="8" fill="none" stroke={PAPEL} strokeWidth="1.2" />
      <rect x="18" y="18" width="264" height="484" rx="5" fill="none" stroke={PAPEL} strokeWidth=".5" opacity=".6" />
      <g stroke={PAPEL}>
        {MARCAS.map((m, i) => (
          <line key={`m${i}`} x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} strokeWidth={m.w} />
        ))}
        {GUIONES.map((m, i) => (
          <line key={`g${i}`} x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} strokeWidth={m.w} />
        ))}
      </g>
      {PUNTOS.map((p, i) => (
        <circle key={`p${i}`} cx={p.cx} cy={p.cy} r={p.r} fill={p.rosa ? ROSA : PAPEL} />
      ))}
      <circle cx={CX} cy={CY} r="128" fill="none" stroke={PAPEL} strokeWidth=".6" />
      <circle cx={CX} cy={CY} r="44" fill="none" stroke={ROSA} strokeWidth="1.4" />
      <circle cx={CX} cy={CY} r="6" fill={ROSA} />
      <text x={CX} y="480" textAnchor="middle" fontFamily={MONO} fontSize="11" letterSpacing="5" fill={PAPEL}>
        ARCANA
      </text>
      <text x={CX} y="44" textAnchor="middle" fontFamily={MONO} fontSize="9" letterSpacing="3" fill={NIEBLA}>
        MCMIX · MMXXVI
      </text>
    </svg>
  );
}

/**
 * Pinta el mismo reverso en un contexto 2D de `ancho × alto` (lo usa el quemado: necesita sus píxeles).
 * Sin imágenes ni fuentes externas, así que el lienzo nunca queda «contaminado».
 */
export function pintarReverso(ctx: CanvasRenderingContext2D, ancho: number, alto: number): void {
  ctx.save();
  ctx.scale(ancho / REVERSO_ANCHO, alto / REVERSO_ALTO);
  // En un lienzo chico (150 px) los filetes de 0.5–0.7 unidades quedarían en un tercio de píxel y se lavarían:
  // ningún trazo baja de ~0.8 px del lienzo, para que el cambio del SVG al lienzo al empezar la quema no se note.
  const grosor = (w: number) => Math.max(w, (0.8 * REVERSO_ANCHO) / ancho);
  ctx.fillStyle = TINTA;
  ctx.fillRect(0, 0, REVERSO_ANCHO, REVERSO_ALTO);

  const marco = (x: number, y: number, w: number, h: number, r: number, trazo: number, alfa: number) => {
    ctx.globalAlpha = alfa;
    ctx.lineWidth = grosor(trazo);
    ctx.strokeStyle = PAPEL;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
    ctx.stroke();
    ctx.globalAlpha = 1;
  };
  marco(12, 12, 276, 496, 8, 1.2, 1);
  marco(18, 18, 264, 484, 5, 0.5, 0.6);

  // Trazos agrupados por grosor y puntos por color: pocas llamadas a stroke()/fill() en lugar de una por trazo.
  ctx.strokeStyle = PAPEL;
  const porGrosor = new Map<number, Trazo[]>();
  for (const m of [...MARCAS, ...GUIONES]) {
    const g = grosor(m.w);
    porGrosor.set(g, [...(porGrosor.get(g) ?? []), m]);
  }
  for (const [g, trazos] of porGrosor) {
    ctx.lineWidth = g;
    ctx.beginPath();
    for (const m of trazos) {
      ctx.moveTo(m.x1, m.y1);
      ctx.lineTo(m.x2, m.y2);
    }
    ctx.stroke();
  }
  for (const rosa of [false, true]) {
    ctx.fillStyle = rosa ? ROSA : PAPEL;
    ctx.beginPath();
    for (const p of PUNTOS.filter((q) => q.rosa === rosa)) {
      ctx.moveTo(p.cx + p.r, p.cy);
      ctx.arc(p.cx, p.cy, p.r, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  const anillo = (r: number, trazo: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = grosor(trazo);
    ctx.beginPath();
    ctx.arc(CX, CY, r, 0, Math.PI * 2);
    ctx.stroke();
  };
  anillo(128, 0.6, PAPEL);
  anillo(44, 1.4, ROSA);
  ctx.fillStyle = ROSA;
  ctx.beginPath();
  ctx.arc(CX, CY, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.fillStyle = PAPEL;
  ctx.font = `11px ${MONO}`;
  ctx.fillText("A R C A N A", CX, 480);
  ctx.fillStyle = NIEBLA;
  ctx.font = `9px ${MONO}`;
  ctx.fillText("MCMIX · MMXXVI", CX, 44);
  ctx.restore();
}

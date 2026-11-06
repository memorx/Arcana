/**
 * @jest-environment node
 *
 * La palabra a pincel usa un subset de Water Brush (src/app/fuentes/water-brush-letras.woff2, lo genera
 * scripts/fuente-pincel.py): sólo letras, acentos del español, ¿?¡!,. y el espacio. Una letra fuera del subset
 * saldría en la fuente de respaldo a media palabra. Este test lee el cmap del .woff2 de verdad (WOFF2 → Brotli →
 * cmap formato 4/12) y revisa cada palabra a pincel de messages/{es,en}.json contra él; también, que el subset
 * lleve su copyright y su licencia (OFL).
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { brotliDecompressSync } from "node:zlib";

const RAIZ = process.cwd();
const FUENTE = path.join(RAIZ, "src/app/fuentes/water-brush-letras.woff2");
const LICENCIA = path.join(RAIZ, "src/app/fuentes/OFL.txt");

/**
 * Cada <Pincel> del sitio y la llave de messages que pinta. Si agregas un <Pincel>, agrégalo aquí: el test de abajo
 * falla mientras haya uno en src/ que no esté en esta lista.
 */
const PALABRAS_A_PINCEL = [
  { archivo: "src/components/landing/EscenaGrabados.tsx", llave: "landing.portada.grabados.pincel" },
  { archivo: "src/components/landing/EscenaTuTurno.tsx", llave: "landing.portada.turno.pincel" },
  { archivo: "src/app/(main)/dashboard/page.tsx", llave: "dashboard.mesa.pincel" },
  { archivo: "src/app/(main)/reading/new/[spreadTypeId]/page.tsx", llave: "reading.ask" },
  { archivo: "src/app/share/[shareId]/page.tsx", llave: "reading.yourTurn" },
  { archivo: "src/app/(main)/daily/page.tsx", llave: "daily.pincel" },
  { archivo: "src/components/dashboard/StreakRewardModal.tsx", llave: "streakReward.pincel" },
  { archivo: "src/components/achievements/AchievementUnlockedModal.tsx", llave: "achievements.unlockModal.pincel" },
  { archivo: "src/components/golden/GoldenCardModal.tsx", llave: "goldenCards.golden" },
  { archivo: "src/components/levels/LevelUpModal.tsx", llave: "levels.level" },
  { archivo: "src/components/challenges/ChallengeCompletedModal.tsx", llave: "challenges.completedModal.pincel" },
];

// ---------------------------------------------------------------------------------------------------------------
// WOFF2 mínimo (https://www.w3.org/TR/WOFF2/): encabezado de 48 bytes, directorio de tablas con UIntBase128 y un
// solo flujo Brotli con las tablas una tras otra, en el orden del directorio. Basta para cmap y name, que nunca
// van transformadas.
// ---------------------------------------------------------------------------------------------------------------

/** Las 63 etiquetas conocidas del directorio WOFF2 (índice 63 = la etiqueta viene escrita). */
const ETIQUETAS =
  "cmap head hhea hmtx maxp name OS/2 post cvt_ fpgm glyf loca prep CFF_ VORG EBDT EBLC gasp hdmx kern LTSH PCLT VDMX vhea vmtx BASE GDEF GPOS GSUB EBSC JSTF MATH CBDT CBLC COLR CPAL SVG_ sbix acnt avar bdat bloc bsln cvar fdsc feat fmtx fvar gvar hsty just lcar mort morx opbd prop trak Zapf Silf Glat Gloc Feat Sill"
    .split(" ")
    .map((t) => t.replace("_", " "));

function tablasWoff2(archivo: Buffer): Map<string, Buffer> {
  if (archivo.toString("latin1", 0, 4) !== "wOF2") throw new Error("no es WOFF2");
  if (archivo.toString("latin1", 4, 8) === "ttcf") throw new Error("colección WOFF2: no soportada aquí");
  const numTablas = archivo.readUInt16BE(12);
  const comprimido = archivo.readUInt32BE(20);
  let p = 48;
  const base128 = () => {
    let valor = 0;
    for (let i = 0; i < 5; i++) {
      const byte = archivo[p++];
      valor = valor * 128 + (byte & 0x7f);
      if (!(byte & 0x80)) return valor;
    }
    throw new Error("UIntBase128 de más de 5 bytes");
  };
  const directorio: { etiqueta: string; largo: number }[] = [];
  for (let i = 0; i < numTablas; i++) {
    const banderas = archivo[p++];
    const indice = banderas & 0x3f;
    const version = banderas >> 6;
    let etiqueta = ETIQUETAS[indice];
    if (indice === 63) {
      etiqueta = archivo.toString("latin1", p, p + 4);
      p += 4;
    }
    const largo = base128();
    // glyf/loca: la versión 3 es «sin transformar»; las demás tablas: la 0.
    const transformada = etiqueta === "glyf" || etiqueta === "loca" ? version !== 3 : version !== 0;
    directorio.push({ etiqueta, largo: transformada ? base128() : largo });
  }
  const flujo = brotliDecompressSync(archivo.subarray(p, p + comprimido));
  const tablas = new Map<string, Buffer>();
  let desde = 0;
  for (const { etiqueta, largo } of directorio) {
    tablas.set(etiqueta, flujo.subarray(desde, desde + largo));
    desde += largo;
  }
  if (desde !== flujo.length) throw new Error(`el flujo Brotli mide ${flujo.length}, el directorio suma ${desde}`);
  return tablas;
}

/** Los códigos que el cmap manda a un glifo real (≠ .notdef), del mejor subtítulo Unicode: formato 12 o 4. */
function codigosDelCmap(cmap: Buffer): Set<number> {
  const subtablas: { formato: number; desde: number }[] = [];
  for (let i = 0; i < cmap.readUInt16BE(2); i++) {
    const registro = 4 + i * 8;
    const plataforma = cmap.readUInt16BE(registro);
    const desde = cmap.readUInt32BE(registro + 4);
    if (plataforma === 0 || plataforma === 3) subtablas.push({ formato: cmap.readUInt16BE(desde), desde });
  }
  const codigos = new Set<number>();
  const f12 = subtablas.find((s) => s.formato === 12);
  if (f12) {
    const grupos = cmap.readUInt32BE(f12.desde + 12);
    for (let g = 0; g < grupos; g++) {
      const r = f12.desde + 16 + g * 12;
      const [inicio, fin, glifo] = [cmap.readUInt32BE(r), cmap.readUInt32BE(r + 4), cmap.readUInt32BE(r + 8)];
      for (let c = inicio; c <= fin; c++) if (glifo + (c - inicio) !== 0) codigos.add(c);
    }
    return codigos;
  }
  const f4 = subtablas.find((s) => s.formato === 4);
  if (!f4) throw new Error("el cmap no tiene subtabla Unicode de formato 4 ni 12");
  const t = f4.desde;
  const segmentos = cmap.readUInt16BE(t + 6) / 2;
  const fines = t + 14;
  const inicios = fines + segmentos * 2 + 2;
  const deltas = inicios + segmentos * 2;
  const rangos = deltas + segmentos * 2;
  for (let s = 0; s < segmentos; s++) {
    const fin = cmap.readUInt16BE(fines + s * 2);
    const inicio = cmap.readUInt16BE(inicios + s * 2);
    const delta = cmap.readInt16BE(deltas + s * 2);
    const rango = cmap.readUInt16BE(rangos + s * 2);
    for (let c = inicio; c <= fin && c !== 0xffff; c++) {
      let glifo: number;
      if (rango === 0) glifo = (c + delta) & 0xffff;
      else {
        glifo = cmap.readUInt16BE(rangos + s * 2 + rango + (c - inicio) * 2);
        if (glifo !== 0) glifo = (glifo + delta) & 0xffff;
      }
      if (glifo !== 0) codigos.add(c);
    }
  }
  return codigos;
}

/** Los registros de la tabla name en Windows, inglés (EE. UU.): nameID → texto. */
function registrosName(name: Buffer): Map<number, string> {
  const base = name.readUInt16BE(4);
  const registros = new Map<number, string>();
  for (let i = 0; i < name.readUInt16BE(2); i++) {
    const r = 6 + i * 12;
    if (name.readUInt16BE(r) !== 3 || name.readUInt16BE(r + 4) !== 0x409) continue;
    const largo = name.readUInt16BE(r + 8);
    const desde = base + name.readUInt16BE(r + 10);
    registros.set(name.readUInt16BE(r + 6), Buffer.from(name.subarray(desde, desde + largo)).swap16().toString("utf16le"));
  }
  return registros;
}

const tablas = tablasWoff2(readFileSync(FUENTE));
const enSubset = codigosDelCmap(tablas.get("cmap")!);

function leer(mensajes: unknown, llave: string): unknown {
  return llave.split(".").reduce<unknown>((nodo, parte) => (nodo as Record<string, unknown> | undefined)?.[parte], mensajes);
}

/** Todos los .tsx de src/ menos las pruebas. */
function archivosTsx(dir: string, salida: string[] = []): string[] {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name !== "__tests__") archivosTsx(ruta, salida);
    } else if (entrada.name.endsWith(".tsx")) salida.push(ruta);
  }
  return salida;
}

describe("subset de Water Brush (palabra a pincel)", () => {
  it("el cmap se lee: letras, acentos del español, ¿?¡!,. y el espacio; nada de cifras", () => {
    const esperados = " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁÉÍÓÚÑÜáéíóúñü¿?¡!,.";
    const codigos = [...esperados].map((c) => c.codePointAt(0) ?? -1);
    expect([...enSubset].sort((a, b) => a - b)).toEqual(codigos.sort((a, b) => a - b));
    expect(enSubset.has(0x30)).toBe(false); // «0»
  });

  it("lleva su copyright y su licencia (OFL, sin «Reserved Font Name»), dentro del archivo y en OFL.txt", () => {
    const name = registrosName(tablas.get("name")!);
    expect(name.get(1)).toBe("Water Brush");
    expect(name.get(0)).toMatch(/^Copyright 2004-2021 The Water Brush Project Authors/);
    expect(name.get(13)).toMatch(/SIL Open Font License, Version 1\.1/);
    expect(name.get(14)).toBe("https://scripts.sil.org/OFL");

    const ofl = readFileSync(LICENCIA, "utf8");
    expect(ofl.split(/\r?\n/)[0]).toBe(name.get(0));
    expect(ofl).toMatch(/SIL OPEN FONT LICENSE Version 1\.1/);
    // Con un nombre reservado, el subset (una «Modified Version») tendría que cambiar de familia.
    expect(ofl.split("This Font Software is licensed")[0]).not.toMatch(/Reserved Font Name/);
  });

  it("la lista de palabras a pincel cubre cada <Pincel> de src/ (y nadie más usa la fuente)", () => {
    const encontradas: string[] = [];
    const ajenas: string[] = [];
    for (const ruta of archivosTsx(path.join(RAIZ, "src"))) {
      const relativa = path.relative(RAIZ, ruta).split(path.sep).join("/");
      const codigo = readFileSync(ruta, "utf8");
      for (const [, interior] of codigo.matchAll(/<Pincel\b[^>]*>([\s\S]*?)<\/Pincel>/g)) {
        const llamada = interior.match(/^\s*\{\s*\w+\(\s*"([\w.]+)"\s*\)\s*\}\s*$/);
        encontradas.push(`${relativa} → ${llamada ? llamada[1] : `texto sin llave: ${interior.trim()}`}`);
      }
      if (/font-pincel|--font-pincel|fuente-water-brush/.test(codigo) && !relativa.endsWith("tinta/Pincel.tsx")) {
        if (!relativa.endsWith("app/layout.tsx")) ajenas.push(relativa);
      }
    }
    // La llave sin su espacio de nombres (el de useTranslations/getTranslations): lo que va dentro de t("…").
    const declaradas = PALABRAS_A_PINCEL.map(({ archivo, llave }) => `${archivo} → ${llave.split(".").slice(1).join(".")}`);
    expect(encontradas.sort()).toEqual(declaradas.sort());
    expect(ajenas).toEqual([]);
  });

  it.each(["es", "en"])("las palabras a pincel de messages/%s.json sólo usan caracteres del subset", (idioma) => {
    const mensajes = JSON.parse(readFileSync(path.join(RAIZ, "messages", `${idioma}.json`), "utf8"));
    const fuera = PALABRAS_A_PINCEL.flatMap(({ llave }) => {
      const valor = leer(mensajes, llave);
      if (typeof valor !== "string" || !valor.trim()) return [`${llave}: no es un texto`];
      const faltan = [...valor].filter((c) => !enSubset.has(c.codePointAt(0)!));
      return faltan.length ? [`${llave} «${valor}»: ${[...new Set(faltan)].join(" ")}`] : [];
    });
    expect(fuera).toEqual([]);
  });
});

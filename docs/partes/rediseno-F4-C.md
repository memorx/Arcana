## Parte F4-C · Fuentes y carga inicial (Fase 4 del rediseño «Dos tintas»)

Worktree `C:/Users/guill/dev/arcana-lotes/f2-L1`, rama `rediseno/f4-C` (renombrada de `fable-exp`), sale de `rediseno/dos-tintas`
en `6a89d0d` con el experimento de Fable sin commit (los tres cambios medidos: local 81–82, FCP ~2,0 s, LCP real 1,2 s). 6 nov 2026.
Sin `git push`. Base sólo `arcana_e2e_l1` del clúster local (vía `scripts/e2e-db.mjs serve` y `npm run test:e2e`, web en `:3011`);
no corrí `npm run build`, `npm run dev` ni nada de Prisma contra producción. `BITACORA.md` no se tocó. Al terminar, `:3011` queda
libre (maté sólo mi `e2e-db.mjs serve` y su `next start -p 3011`; el `serve` de Fable en `:3000` sigue vivo, no es mío).

### 1 · Hecho

| Commit | Qué |
|---|---|
| `678cb1c` | **Newsreader estática 400** (cambio 1 de Fable): `weight: "400"`, `style: ["normal", "italic"]`, sin `axes`. 22,5 + 24,4 KB en vez de 132 + 147 KB |
| `7e5411b` | **Water Brush como `next/font/local`** (cambio 2): `src/app/fuentes/water-brush-letras.woff2`, el subset de Fable tal cual (34 800 B). Sigue `preload: false` y `adjustFontFallback: false`. Comentario del layout al día (ya no dice 65 KB) |
| `e0643bc` | **`loading="lazy"` en El Loco** de `GrabadoParticulas` (cambio 3): React 19 ya no emite su `<link rel=preload>`. La escena sigue armándose con el `load` de la imagen (comprobado en las capturas a 1440 y 360) |
| `9805bf0` | **Licencia y regeneración del subset.** `scripts/fuente-pincel.py` (nuevo), `src/app/fuentes/OFL.txt` (nuevo), el subset regenerado (34 972 B, con la tabla `name` completa) y la prueba `src/__tests__/app/fuente-pincel.test.ts` (nueva, 5 pruebas). Detalle en §2 |
| `6fff4f2` | **Negritas con Newsreader 400.** La `<strong>` del blog pasa a Gloock (`font-titulo font-normal`); fuera el `font-medium` muerto de los 4 enlaces de `(auth)`; la red responsiva reporta texto en Newsreader ≥ 600 (`negritasSinteticas` en `e2e/helpers/responsivo.ts`, en `revisarMaqueta`) con su prueba fija en `e2e/red-desbordes.spec.ts`; `l6-textos.test.tsx` comprueba la clase. Detalle en §3. (También trae el ajuste de tipos estrictos de `fuente-pincel.test.ts` que pidió `tsc`: debió ir en `9805bf0`) |
| `5ac99e3` | **Plan §5.7**: nota con fecha (6 nov 2026, decisión de Fable por rendimiento): Newsreader estática 400 y Water Brush subset local, con dónde va el énfasis y qué cuida el subset |
| este | el parte |

### 2 · Water Brush: licencia, origen y subset

- **Licencia**: SIL OFL 1.1. El `OFL.txt` oficial (google/fonts, `ofl/waterbrush/`) empieza con «Copyright 2004-2021 The Water Brush
  Project Authors (https://github.com/googlefonts/water-brush)» **sin «with Reserved Font Name …»**, y el registro `name` 0 de la
  fuente tampoco lo declara. El subset es una *Modified Version* y puede seguir llamándose «Water Brush»; no hizo falta renombrar
  la familia. El script se detiene si una versión futura declarara un nombre reservado.
- **Lo que tenía el subset de Fable**: salió del woff2 «latin» de la API de Google Fonts (`wb.woff2`, 65 212 B) con los
  `name` por omisión de fontTools (0–6): conservaba el copyright (0) pero perdía la URL de la licencia (14); la API ya no traía
  diseñador, proveedor ni texto de licencia (8–13).
- **Origen del script**: `WaterBrush-Regular.ttf` y `OFL.txt` del repositorio oficial de Google Fonts fijado en el commit
  `fe95a02e4f1052603e566cc4339ea97d80df5bea` (el último que tocó el TTF, 13 abr 2022), con SHA-256 fijos
  (`2cbdccbc…71a7` y `eaa2e23b…4610`). Los baja a una caché temporal y los valida; con `--origen RUTA` usa un TTF ya bajado
  (también validado). `--comprobar` no escribe: compara tabla por tabla el subset del repo y el `OFL.txt` con lo que generaría.
- **Mismo resultado que el experimento**: con `--layout-features='*'` sobre el TTF entran `aalt`, `case`, `onum`, `ordn` y `sups`
  (que la API quita) y salen 89 glifos / 36 492 B. El script usa los rasgos que deja la API (`ccmp frac init liga lnum locl kern
  mark mkmk`), sin hinting como la API, y `--name-IDs='*'`: **86 glifos; `glyf`, `hmtx`, `cmap`, `GSUB`, `GPOS`, `GDEF`, `OS/2`,
  `hhea`, `post`, `gasp`, `maxp` idénticos al subset de Fable**; sólo cambian `head` (suma de control) y `name` (+ 8, 9, 11, 12, 13,
  14). 34 972 B (+172 B). Mismo juego de 73 caracteres: espacio, A–Z, a–z, ÁÉÍÑÓÚÜ, áéíñóúü, ¿?¡!,.
- **Determinista**: dos corridas (descarga y `--origen`) dieron el mismo archivo byte a byte (fontTools 4.61.1, brotli de pip);
  igual al de `pyftsubset` con las mismas opciones. Con un TTF falso aborta por SHA-256 (exit 1).
- **Prueba** (`fuente-pincel.test.ts`, entorno node): lee el WOFF2 de verdad (encabezado, directorio con UIntBase128, flujo
  Brotli con `zlib.brotliDecompressSync`, `cmap` formato 4/12 y `name`), y comprueba: (1) el cmap es exactamente el juego del
  script y no trae cifras; (2) copyright, licencia (13) y URL (14) dentro del archivo, `OFL.txt` con el mismo copyright y sin
  nombre reservado; (3) cada `<Pincel>` de `src/` (sin pruebas) pinta una llave `t("…")` de la lista, la lista no sobra ni falta,
  y nadie más usa `font-pincel`/`--font-pincel`/`--fuente-water-brush` fuera de `Pincel.tsx`, `globals.css` y `layout.tsx`;
  (4) en `es` y `en`, cada valor usa sólo caracteres del cmap. **Las 11 llaves de Fable eran todas** (11 `<Pincel>` en `src/`, ningún
  otro uso de la fuente): `landing.portada.grabados.pincel`, `landing.portada.turno.pincel`, `dashboard.mesa.pincel`,
  `reading.ask`, `reading.yourTurn`, `daily.pincel`, `streakReward.pincel`, `achievements.unlockModal.pincel`,
  `goldenCards.golden`, `levels.level`, `challenges.completedModal.pincel`.
  Mutaciones comprobadas (y revertidas): `daily.pincel` = «Hoy 1º» → falla con «1 º»; el woff2 de Fable → falla la de licencia
  (sin registro 13); un `<Pincel>` con texto literal en `LevelUpModal` → falla la de la lista.

### 3 · Negritas con Newsreader 400: inventario y decisión por caso

Antes, la variable cubría `wght` 200–800 y cualquier `font-medium`/`semibold`/`<strong>` en Newsreader salía en su peso real. Con
sólo 400, desde 600 el navegador la ensancha (negrita sintética); por debajo de 600 pinta la 400 tal cual.

| Dónde | Fuente que hereda | Antes | Ahora |
|---|---|---|---|
| `blog/contenido.tsx` `<strong className="font-semibold">` (las `**negritas**` del blog) | Newsreader 600 → **sintética** | Newsreader 600 real | **Gloock 400** (`font-titulo font-normal`). En el blog marcan rótulos («**Bastos**:», «**Mejor para**:», pasos numerados): Gloock es la letra de los títulos y **ya la carga cada página** → 0 bytes nuevos. Medido en `/blog/[slug]`: familia `Gloock`, peso 400, 4 fuentes (88 032 B), sin Newsreader 600 |
| `(auth)/{login,register,forgot-password,reset-password}` enlaces `${ENLACE_PLIEGO} font-medium` | Newsreader 500 → pinta la 400 (sin síntesis) | Newsreader 500 | sin `font-medium`: la clase ya no hacía nada |
| `reading/Tirada.tsx` `<b className="font-medium">` | Martian Mono (está en un `font-dato`) | 500 real | igual: Martian Mono es variable (medido en `/share`: `Martian Mono` 500) |
| los otros 14 `font-medium` (botones, rótulos, enlaces de sección) y `portada.css` `font: 500 … var(--p-dato)` | todos Martian Mono | — | sin cambio |
| `h1`–`h3` | Gloock 400 con `font-synthesis-weight: none` | — | sin cambio; no hay `h4`–`h6`, `th`, `optgroup` ni otras negritas del navegador; los `dt` no son negritas |
| **Texto de la IA**: lectura (`Interpretacion` → `partirInterpretacion` → `<p>`), carta del día (`split("\n")` → `<p>`), seguimiento (`paragraphs` → `<p>`), síntesis del Mapa (`synthesis-blocks` quita `**`), compatibilidad (quita `**`), resumen mensual (el prompt prohíbe markdown) | Newsreader 400 | — | **nunca se renderiza `<strong>`**: no hay negrita sintética. Ver deuda 6 |

No hizo falta una segunda Newsreader 600 con `preload: false`: ningún caso la pide. **La portada no pide bytes de fuente nuevos**:
Lighthouse ve las mismas 5 que el experimento (Gloock 17,7 KB, Newsreader 22,5, itálica 24,4, Martian Mono 23,5, Water Brush
34,7) = **122,9 KB contra 122,7 KB de `exp1`** (los +0,2 KB son los registros de licencia del subset). En navegador, `/` y
`/share/[id]` piden esas 5 (123 004 B) a 1440 y 360, con y sin desplazarse.

**Red**: `negritasSinteticas(page)` reporta texto visible con texto propio, peso calculado ≥ 600, primera familia `Newsreader` y
`font-synthesis-weight` distinto de `none`. Corre en el chequeo «maqueta» de `responsivo.spec.ts` (cada página × 5 anchos, `es`, y
`en` a 390; WebKit 390 en las públicas). Prueba fija en `red-desbordes.spec.ts` (Chromium y WebKit 1440): de una `<strong>`, una
`<b>` con `font-synthesis-weight: none`, un 500, una `<strong>` en Gloock y un 600 oculto, sólo reporta la primera. Mutación sobre
el build real: la `<strong>` del blog con la clase vieja → `strong «Bastos» (600)`, `«Copas»`, `«Espadas»`…; tal cual → `[]`.

### 4 · Decisiones

- **Gloock y no Newsreader 600 para el blog**: semántica de rótulo, 0 bytes (ya cargada), y era la sugerencia de Fable. Una 600
  sólo para el blog sería ~22 KB y otra familia en el CSS.
- **El original del script viene de google/fonts fijado en un commit + SHA-256**, no de la API CSS de Google Fonts: sus URLs y su
  respuesta dependen del navegador y de la versión, y su woff2 no trae los registros 8–13. Los rasgos son los que deja la API, para
  reproducir el subset que Fable midió.
- **La red reporta en vez de poner `font-synthesis-weight: none` global**: una negrita nueva en Newsreader se ve en las pruebas en
  lugar de desaparecer en silencio.
- **El `font-medium` de `(auth)` se quitó** en lugar de dejarlo: no hacía nada y hacía creer que el enlace va en 500.
- **Commits**: los tres de Fable van separados y sin retoques salvo el comentario de Water Brush; el subset de `7e5411b` es el suyo
  y `9805bf0` lo reemplaza, para que el cambio de licencia quede a la vista.

### 5 · Deuda para el lote de rendimiento

La que dejó Fable, sin tocar aquí:
1. **`messages` recortados**: el HTML de la portada lleva todos los mensajes (1 091 llaves por idioma).
2. **framer-motion fuera del JS inicial de la portada** (Lighthouse: 188 KB de JS transferidos en `/`).
3. **Grabados `mesa` a q40 o `fetchPriority="low"` en las celdas laterales** (301 KB de imágenes en `/`). Lighthouse además marca
   que el elemento LCP (`wands10-mesa.webp`, celda de la columna 0) no lleva `fetchpriority="high"`.
4. **Anotar PSI real tras publicar** (PageSpeed Insights de `readarcana.com` móvil), para comparar con el 98–99 del diseño viejo
   y con los 80–81 locales de abajo.

Además, visto en este lote:
5. **El LCP simulado sigue en 4,8–4,9 s** (real 1,2 s): Lantern lo reparte entre los 3 CSS que bloquean el render
   (`645144325a2322db.css` ~755 ms estimados), el JS y las imágenes; las fuentes ya no son el cuello.
6. **Asteriscos del modelo a la vista**: lectura, carta del día y seguimiento muestran el texto de la IA tal cual; si el modelo escribe
   `**…**` se ven los asteriscos (los prompts de `anthropic.ts` y `ai/followup.ts` no prohíben markdown, y `ReadAloud` los limpia
   «porque el modelo a veces los usa»). No es de fuentes ni de rendimiento; lo dejo anotado. Si se quisiera énfasis, iría en Gloock
   como el blog, nunca en Newsreader ≥ 600.
7. Los dos saltos chicos que siguen (§7): 0,0026–0,0029 al llegar Martian Mono (cabecera, ya descrito por F4-A) y 0,0013–0,0015 al
   llegar Water Brush («Pregunta», sin precarga a propósito).

### 6 · Archivos tocados

`src/app/layout.tsx`, `src/app/fuentes/{water-brush-letras.woff2,OFL.txt}` (nuevos), `src/components/tinta/GrabadoParticulas.tsx`,
`scripts/fuente-pincel.py` (nuevo), `src/app/(main)/blog/contenido.tsx`, `src/app/(auth)/{login,register,forgot-password,reset-password}/page.tsx`,
`e2e/helpers/responsivo.ts`, `e2e/responsivo.spec.ts`, `e2e/red-desbordes.spec.ts`, `docs/PLAN-2026-11-05-rediseno.md`; pruebas:
`src/__tests__/app/fuente-pincel.test.ts` (nueva) y `src/__tests__/app/l6-textos.test.tsx`.

### 7 · Comandos y resultados

Todo sobre `5ac99e3` (el árbol final sin este parte).

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | **0 errores** |
| `npm run lint` | **0 errores, 7 avisos** (los mismos 7 de antes) |
| `npm test` | `check-messages: ok (1091 keys)` · **127 suites / 1 624 pruebas, todo verde**. Sigue el aviso previo del worker de Jest |
| `python scripts/fuente-pincel.py` · `--comprobar` · `--origen <TTF>` · `--origen <falso>` | 34 972 B, 86 glifos, 73 caracteres · `OK` · mismo archivo byte a byte · `ABORTADO` por SHA-256 |
| `npm run test:e2e` **desde cero** (`.env.e2e` de :3011: reset de `arcana_e2e_l1` + seeds + `next build` a `.next-e2e` + `next start -p 3011`) | **1 114 ✓ · 0 ✘ · 0 inestables · 4 omitidas** (las de siempre) en 11,3 min (`stats`: expected 1114, unexpected 0, flaky 0). La red de desbordes no encontró nada con la estática |
| `ARCANA_E2E_SKIP_BUILD=1 node scripts/e2e-db.mjs serve` + `ARCANA_E2E_REUSE=1 ARCANA_E2E_DEFECTOS=0 npm run test:e2e:responsivo` | **926 ✓ · 0 ✘ · 0 inestables** en 7,7 min, sobre ese mismo build |
| Lighthouse 13.4.1 móvil (`--only-categories=performance --form-factor=mobile`, headless), 3 corridas contra ese `serve` | **80 · 81 · 81**; **FCP 2,12 · 1,96 · 2,11 s**; LCP 4,89 · 4,89 · 4,80 s; TBT 29–37 ms; CLS 0,010–0,015; SI = FCP. Fuentes 122,9 KB. Meta (≥ 80 y FCP ≤ 2,2 s): **cumple**, igual que `exp1` de Fable (82 · 81 · 81; FCP 2,12 · 2,12 · 1,96; LCP 4,60–4,88) |
| LCP/CLS reales, método de Fable (`scratchpad/fase4/C/lcp3.mjs` = copia de `fase4/final/lcp3.mjs` de F4-A, :3011: Slow 4G 150 ms / 1,6 Mb/s / 750 kb/s, CPU ×4, caché fría, alto 823, DPR 1,75, SW bloqueado) | ver tabla |
| Capturas (`scratchpad/fase4/C/capturas.mjs`) | `portada`, `lectura` (`/share/e2eShare04`) y `blog` a 1440 y 360: primera pantalla y página completa con movimiento reducido, más el detalle de las negritas del blog. Revisadas: sin cortes ni desbordes, «Pregunta» y «Tu turno» a pincel completas, El Loco carga, las negritas del blog en Gloock |

| Ancho (corridas) | LCP mediana (máx) | CLS mediana (máx) | Elemento LCP | `exp1` de Fable (412) |
|---|---|---|---|---|
| 412 (5) | **1 208 ms (1 404)** | **0,0039 (0,0039)** | `wands10-mesa.webp` en todas | 1 204 ms (1 376), CLS 0,0039 |
| 390 (3) | **1 212 ms (1 212)** | **0,0041 (0,0041)** | `wands10-mesa.webp` | — |
| 360 (3) | **1 196 ms (1 216)** | **0,0043 (0,0043)** | `wands10-mesa.webp` | — |

Criterio (LCP ≤ 2,5 s y CLS ≤ 0,05 en 412, 390 y 360): **cumple**. Saltos: ~1,8 s Martian Mono en la cabecera (0,0026–0,0029) y
~2,0 s Water Brush (0,0013–0,0015).

Salidas en `scratchpad/fase4/C/`: `e2e.log`, `e2e-resultados.json`, `e2e-responsivo.log`, `serve.log`, `lh/f4c-{1,2,3}.json`,
`lh-resumen.mjs`, `lcp/lcp3-f4c-{412,390,360}.json`, `capturas.json`, `*.png`, `negritas-real.mjs`, `wb/` (TTF, OFL y pruebas
del subset).

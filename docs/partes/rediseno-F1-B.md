## Parte F1-B · Firma y cartas (rediseño «Dos tintas»)

Rama `rediseno/f1-B` (worktree `C:/Users/guill/dev/arcana-lotes/f1-B`), base `969bf7b`. Sin `git push`, sin `prisma`,
sin dependencias nuevas (`package.json` intacto). Las imágenes salieron de los 78 grabados ya bajados en
`C:/Users/guill/dev/arcana/design/cartas/original/` (no se volvió a pedir nada a Wikimedia).

### Hecho

| Ficha | Commit | Qué |
|---|---|---|
| Cartas autohospedadas (§2.3, §5.6) | `a71d8dd` | `scripts/cartas.py` genera `public/cartas/<slug>-{color,tinta,mesa}.webp` para las 78 + `reverso.svg`. **9.22 MB** en 235 archivos (color 4.67 MB ≈ 61 KB/carta · tinta 3.62 MB ≈ 47 KB · mesa 0.93 MB ≈ 12 KB). `src/lib/cartas.ts` con `CARTAS`, `slugCarta`, `cartaImagen`, `MEDIDAS_CARTA`, `CARTA_REVERSO`. «The Lovers» ya tiene imagen (`rws-tarot-06-lovers-*`). Test `src/__tests__/lib/cartas.test.ts` (84): las 78 del seed leídas con fs + regex, mismo orden, slug y los tres archivos de cada una, vectores del plan, alias, desconocida → reverso, ≤ 14 MB, ningún archivo de más. |
| `<CartaQuemable>` + `<ReversoCarta>` + `tinta.css` + `messages.carta` | `78e063e`, `37101ca` | Port de `quemar()` de la maqueta con los límites de §5.6 (detalle abajo). El reverso de la maqueta como SVG de React y como pintor de canvas con la misma geometría (78 marcas con una larga cada 13, 20 puntos del tonalli con el primero rosa, 13 guiones, anillo rosa, «ARCANA» y «MCMIX · MMXXVI»). `tinta.css` define además `golden-card-border` / `golden-card-glow` / `golden-shimmer-effect` (brasa rosa persistente; sin animación con reduced-motion). Test `CartaQuemable.test.tsx` (17). |
| `<GrabadoParticulas>`, `<MesaDeGrabados>`, `<TransicionPincel>` | `82836b4` | Escena 2 de la maqueta, la mesa girada de grabados y la barra de tinta. Tests `GrabadoParticulas.test.tsx` (5), `MesaDeGrabados.test.tsx` (7), `TransicionPincel.test.tsx` (3). |
| `TarotCard`/`TarotCardStatic`/`CardPlaceholder`/`CardBack`/`SavedReadingCard`/`ShareButton` | `049ea6a` | Dos tintas, mismas props. La imagen sale de `cartaImagen(card)` (no de `card.imageUrl`). Reverso = `<ReversoCarta>`. Insignias de invertida y dorada en mono. Se fue el `<style jsx global>` dorado. `TarotCard.test.tsx` reescrito conservando cada intención (22). |
| Marca (§5.7) | `05c9b9c` | `python scripts/cartas.py marca`: `og-image.jpg` 1200×630 (grabados en tinta regados en retícula girada, «Arcana» en Gloock, la tesis en tres líneas con la última en rosa, «Pregunta» a pincel seco, `READARCANA.COM` en mono), `favicon.svg` (anillo rosa con su punto del reverso, sobre tinta), `icon-192.png` / `icon-512.png` (anillo, 20 puntos del tonalli con el primero rosa, centro rosa; dentro de la zona segura *maskable*). |
| Banco de rendimiento y capturas | `0aff5fa`, `c97e75e` | `node scripts/tinta-banco.mjs [--salida DIR]`: esbuild empaqueta los componentes reales con React de producción (calzas de next-intl y next/image), Tailwind 4 con los tokens de §2.1, servidor local + Chrome (puppeteer-core de lant). Fuera del build de Next. |

#### `<CartaQuemable>` en detalle (§2.2 con §5.6)

- `<button type="button">` con la carta a color (`<img>` 480×822, `loading="lazy"` o `eager` + `fetchpriority="high"` con `prioridad`) y el reverso encima. Toque → se quema desde el punto tocado; Enter/Espacio (click con `detail === 0`) → desde (0.5, 0.62), como la maqueta.
- Lienzo fijo **150×260** (**90×156** en `chica`) sin importar el DPR; resplandor en otro lienzo **75×130** (45×78) escalado por CSS, **sin** `filter` ni `mix-blend-mode` (hay un test que lo revisa en `tinta.css`). Ruido de valor de dos octavas (6×10 y 18×30) + distancia al punto, brasa `#FF6BB5 → blanco`, borde chamuscado.
- **Cola global de módulo**: como mucho **3** quemas a la vez y **una que arranca por cuadro**. Una quema dura **1700 ms**; en cuanto alguna carta tiene que esperar, las que corren y las que esperan pasan a **1100 ms** (la que ya corría ajusta su reloj sin salto).
- La preparación (campo de quema, píxeles del reverso) corre en el **primer cuadro de animación**, no en el commit de React: los lienzos nacen debajo del reverso («tapa») y en ese mismo cuadro se pinta el lienzo y se esconde la tapa, así que la carta nunca se asoma. Los píxeles del reverso se leen una vez por página y por tamaño.
- Fundido corto (240 ms, sólo opacidad) en lugar de quema cuando: no hay canvas 2D (sonda previa, ni se montan lienzos), `getContext` devuelve `null`, `getImageData` lanza, o `prefers-reduced-motion: reduce`.
- `revelada` controlada; `onRevelada` una vez por revelación; `aria-label={etiqueta}` boca abajo y el nombre (+ «· invertida») al revelarse, con `aria-disabled` y una región `aria-live="polite"` hermana que lo anuncia; `aria-busy` mientras espera o se quema.
- **Sin JS** la carta se ve revelada: el servidor manda la cara y la tapa, y `@media (scripting: none)` esconde tapa y pista (verificado en Chrome con JS apagado por CDP: tapa y pista `display: none`, cara `block`).
- `requestAnimationFrame` sólo mientras se quema; se cancela al desmontar y suelta su lugar en la cola.

### Props exactas

```ts
// src/components/tinta/CartaQuemable.tsx  ("use client")
export type TamanoCarta = "chica" | "media" | "grande";
export interface CartaQuemableProps {
  carta: { nombre: string; slug: string };  // nombre en el idioma de la página; slug de @/lib/cartas (slugCarta(card.name))
  invertida?: boolean;                       // false · gira la imagen 180°
  revelada?: boolean;                        // true al montar: revelada sin animar ni avisar · false→true: se quema (cola) · true→false: boca abajo (corta la quema)
  onRevelada?: () => void;                   // una vez por revelación (toque, teclado o `revelada`)
  etiqueta: string;                          // aria-label boca abajo ("Voltear la carta del pasado"); messages: carta.voltear / carta.voltearPosicion
  tamano?: TamanoCarta;                      // "media" · chica ≈ 92 px · media clamp(132px, 30vw, 220px) · grande min(360px, 78vw)
  alt?: string;                              // alt de la imagen a color (por omisión, carta.nombre)
  pista?: string | false;                    // pista visible; por omisión carta.pista ("Toca para voltear") o carta.pistaCorta en chica
  dorada?: boolean;                          // brasa rosa persistente al revelarse
  prioridad?: boolean;                       // carga la cara de inmediato (carta del día)
  className?: string;
}
export const MAX_QUEMAS = 3, DURACION_SOLA = 1700, DURACION_CON_COLA = 1100;
// Ancho a la medida: style={{ "--cq-ancho": "100%" }} o className="[--cq-ancho:100%]". Estado en data-estado:
// "boca-abajo" | "esperando" | "quemando" | "revelada".

// src/components/tinta/ReversoCarta.tsx  (sin hooks: sirve en servidor y cliente)
export interface ReversoCartaProps extends Omit<SVGProps<SVGSVGElement>, "children" | "viewBox"> {
  titulo?: string;   // con título: role="img" + aria-label; sin título: aria-hidden (decorativo)
}
export function pintarReverso(ctx: CanvasRenderingContext2D, ancho: number, alto: number): void;
export const REVERSO_ANCHO = 300, REVERSO_ALTO = 520;

// src/components/tinta/GrabadoParticulas.tsx  ("use client")
export interface GrabadoParticulasProps {
  carta: { slug: string };   // grabado (variante tinta)
  texto: string[];           // párrafos de la lectura en que se recompone
  firma?: string;            // renglón final en mono rosa ("Lectura de ejemplo · Arcana")
  alt?: string;              // alt del grabado ("" por omisión)
  children?: ReactNode;      // columna de texto a la izquierda (etiqueta, h2, bajada)
  className?: string;
}
// Activa (JS + > 820 px + movimiento): 320svh con el lienzo sticky; si no, grabado y texto quietos. Var: --gp-suelo.

// src/components/tinta/MesaDeGrabados.tsx  ("use client")
export interface MesaDeGrabadosProps {
  slugs: string[];       // en orden de lectura por columnas; se repiten si faltan; [] = las 78
  columnas?: number;     // 8 (en < 720 px se ven como mucho 4)
  filas?: number;        // 5
  className?: string;
}
// Llena a su contenedor (position: relative + overflow: clip lo pone la escena), aria-hidden, opacidad .62 (.8 en
// < 720) ajustable con --mdg-opacidad. El velo de tinta encima es de la escena. Banda del dashboard (≤ 16): columnas={8} filas={2}.

// src/components/tinta/TransicionPincel.tsx  ("use client")
export interface TransicionPincelProps {
  onTerminar?: () => void;   // al terminar el barrido (o de inmediato con reduced-motion)
  className?: string;
}
// Barre una vez al montar (450 ms); para repetir, cambiar su key. Sólo /reading/new/* (paso revealing) y /daily (§5.4).

// src/lib/cartas.ts
export type VarianteCarta = "color" | "tinta" | "mesa";
export interface CartaRWS { name: string; slug: string }
export const CARTAS: readonly CartaRWS[];              // las 78 en el orden de prisma/seed.ts
export const MEDIDAS_CARTA: Record<VarianteCarta, { width: number; height: number }>; // 480×822 · 360×616 · 200×342
export const CARTA_REVERSO = "/cartas/reverso.svg";
export function slugCarta(nombreEnIngles: string): string;   // "The Lovers" → "rws-tarot-06-lovers"; acepta slugs, mayúsculas,
                                                             // "Judgment", "The Wheel of Fortune", "of Coins"; "" si no es una de las 78
export function cartaImagen(c: { name: string } | string, v?: VarianteCarta): string; // "/cartas/<slug>-<v>.webp" o CARTA_REVERSO

// src/components/ui/* — mismas props que antes. Únicos agregados (opcionales, compatibles):
// ShareButton translations.shareLink?: string, translations.close?: string (si faltan, los textos fijos de antes).
// TarotCardProps.card.imageUrl sigue en el tipo pero ya no se usa.
```

`messages/{en,es}.json`, namespace nuevo **`carta`** (append-only, 8 llaves; `check-messages: ok (1004 keys)`):
`pista`, `pistaCorta`, `invertida`, `desliza`, `reverso`, `voltear`, `voltearPosicion` (`{posicion}`), `voltearTodas`.

### Falso o ya hecho

- §5.5 «`golden-card-*` usados 12 veces y **no definidos** en ningún CSS»: sí estaban definidos, pero sólo en un `<style jsx global>` dentro de `TarotCard` cuando `isGolden` (y su `.golden-card-border` con `mask-composite: exclude` sobre el `content-box` habría enmascarado la propia imagen). Hoy las tres clases sólo las usa `TarotCard`; `GoldenCardModal` usa las suyas (`animate-golden-shimmer`, `golden-border-gradient`) y la colección las suyas (`golden-*-collection`), todas en styled-jsx de sus lotes. Las tres ya viven en `tinta.css`.
- §3 F1-B pedía `color` 400 q72 / `tinta` 400 / `mesa` 220 q60 y ≤ 12 MB: lo sustituye §5.6 (480 q65 / 360 q55 / 200 q50, ≤ 14 MB). Hecho por §5.6 y aun así quedó en 9.22 MB.
- §3 F1-B listaba el test de `HoraDelDia`: es componente de F1-A (instrucción del coordinador: no crearlo aquí).
- «10 cartas … todo termina en < 2.5 s»: con la cola de §5.6 (3 a la vez, 1100 ms) diez cartas juntas son 4 rondas ≈ 4.4 s por diseño (§5.6 mismo: «voltear todas de 12 ≈ 4.5 s»). Lo que sí se cumple: **cada quema** termina en < 2.5 s (máx. 1.32 s con cola, 1.86 s sola, peor de 3 corridas con CPU ×4); las 10 terminan a los ≈ 4.6–4.7 s.

### Rendimiento (Chromium 1440×900, `Emulation.setCPUThrottlingRate` ×4, peor de 3 corridas)

| Escenario | Tarea larga máx. | Cada quema | Total | Simultáneas máx. |
|---|---|---|---|---|
| 10 cartas («voltear todas») | **64–78 ms** | 1.10–1.32 s | 4.60–4.70 s | 3 |
| 3 cartas (sin cola) | 69–106 ms | 1.70–1.86 s | 1.86–1.93 s | 3 |
| 12 cartas | 69–194 ms ¹ | 1.09–1.46 s | 4.66–5.11 s | 3 |

¹ Una corrida de 12 coincidió con otra carga en la máquina (8 tareas largas en esa sola corrida); las demás, 69–89 ms.
Lo que bajó la tarea larga de hasta 277 ms a menos de 110: una quema nueva por cuadro, la preparación fuera del commit
de React, `Math.sqrt` en lugar de `Math.hypot`, pesos del ruido precalculados, píxeles del reverso en caché y trazos del
reverso agrupados. La única tarea larga que queda es el render de React del toque (≈ 70 ms con ×4).

Hallazgo del banco: **el primer lienzo 2D de un Chrome headless recién abierto cuesta ~9.6 s** aunque la CPU no esté
acelerada (SwiftShader; 326 ms con `--disable-software-rasterizer`, 17 ms en la segunda pestaña). No es del código: el
banco lo calienta en una pestaña aparte antes de medir (`arranque_lienzo_headless_ms` en el informe). Para F1-C: si un
spec de Playwright mide tiempos de la quema, que caliente el lienzo igual o esa primera prueba saldrá lenta.

Otros datos del banco: `MesaDeGrabados` 8 columnas visibles a 1440 (22 grabados pedidos de 40; los de fuera de pantalla
no se piden) y 4 a 390 (15 pedidos; las columnas ocultas no se piden), 0 elementos con `filter`, sin scroll horizontal;
`TarotCard` sin scroll horizontal a 1440 y 390; `GrabadoParticulas` activa a 1440, quieta a 390; 0 errores de consola.

Capturas revisadas (en la carpeta de salida del banco): quema boca abajo / a media quema / revelada, mesa a 1440 y 390,
TarotCard a 1440 y 390, partículas en 4 puntos del scroll a 1440 y quieta a 390, carta sin JS.

### Decisiones

1. **Sin JS = revelada, con el reverso ya en el HTML.** El plan decía «el reverso sólo aparece hidratado»; eso hace que,
   con JS, la carta del día de la portada se vea a color hasta que hidrate y luego se tape (spoiler y salto visual). En
   cambio el servidor manda cara + tapa y `@media (scripting: none)` esconde la tapa sin JS. Navegadores sin soporte de
   `scripting` (Chrome < 120, Safari < 17, Firefox < 113) **y** con JS apagado verían el reverso: caso despreciable.
2. **Cola:** «con cola» = en cuanto alguna carta espera, todas (corriendo y en espera) van a 1100 ms; una por cuadro.
3. **`TarotCard` con la proporción del grabado (≈ 7:12):** mismos anchos (`w-16`/`w-20`/`w-[120px]`), alto 110/137/206 px
   (antes 2:3: 96/120/180). A 2:3 el `object-cover` cortaba el título impreso («THE LOVERS.»). Las cartas en las
   pantallas de los consumidores quedan ≈ 14 % más altas.
4. **Desconocidas:** `TarotCard` muestra el marcador si el nombre no es una de las 78 o la imagen falla; `cartaImagen`
   devuelve el reverso (nunca un `src` vacío).
5. **Mediana de 3 px antes de redimensionar:** quita la trama de medios tonos del escaneo; el color bajó de 108 a 61 KB por
   carta y se ve más limpio (comparado lado a lado). `mesa` quedó en ≈ 12 KB (el plan decía ≈ 10).
6. **`tinta.css` fuera de capa** (gana a las utilidades sin importar el orden de los CSS) y con variables para ajustar
   desde fuera: `--cq-ancho`, `--mdg-opacidad`, `--gp-suelo`. Colores y fuentes leen los tokens de §2.1 con respaldo.
7. **Lienzos `willReadFrequently`** (en memoria): la quema es trabajo de píxeles.
8. **`GrabadoParticulas`**: la escena alta (320svh) sólo existe activa; sin JS en escritorio es una escena de alto normal.
   El grabado conserva `mix-blend-mode: multiply` (quieto, no se anima) y el panel sticky lleva suelo papel para que el
   multiply tenga papel detrás.
9. **OG en español** (la tesis es la voz de la marca) aunque `openGraph.locale` sea `en_US`.
10. **`CardPlaceholder` sin emojis a color**: numeral en Gloock, glifo del palo en línea de grabado con punto rosa, nombre en mono.
11. Las fuentes de la marca (Gloock, Martian Mono, Water Brush; OFL) se bajan una vez de `github.com/google/fonts` a una
    carpeta temporal; nada de fuentes en el repo.

### Handoffs

- **F1-C · `next.config.ts`**: ya no hacen falta `images.remotePatterns` de `upload.wikimedia.org` ni la entrada de
  `runtimeCaching` de Wikimedia (`tarot-images`). Si quieren caché offline de cartas: `urlPattern: /\/cartas\/.*\.webp$/`,
  `CacheFirst`, ~250 entradas, 30 días.
- **F1-C · e2e**: calentar el lienzo antes de medir (ver hallazgo); `CartaQuemable` expone `data-estado` para esperar
  `"revelada"`; con `reducedMotion: "reduce"` se revela al instante.
- **F1-A · `tinta.css`**: §5.5 dice que F1-A lo crea vacío e importado desde `globals.css`; aquí lo creé con contenido y
  lo importan mis componentes (`CartaQuemable`, `GrabadoParticulas`, `MesaDeGrabados`, `TransicionPincel`, `TarotCard`).
  Al integrar: quedarse con el archivo de F1-B. El `@import` desde `globals.css` puede quedarse o quitarse (las reglas
  están fuera de capa; incluirlo dos veces no cambia nada).
- **F1-A · tokens**: mis componentes usan las utilidades de §2.1 `bg-tinta`, `bg-papel`, `bg-papel-hondo`, `text-tinta`,
  `text-papel`, `text-grafito`, `text-niebla`, `text-rosa`, `text-rosa-luz`, `bg-rosa`, `bg-rosa-luz`, `border-tinta/…`,
  `border-papel/…`, `font-titulo`, `font-lectura`, `font-dato`, `font-pincel`; y `tinta.css` lee `--color-*`, `--font-*`
  y `--gutter` (opcional). `Badge variant="warning"` (SavedReadingCard) y `Button variant="secondary"|"primary"`,
  `size="sm"`, `isLoading` (ShareButton) deben seguir existiendo. `ShareButton` asume el `Modal` sobre tinta (texto
  `papel`/`niebla`).
- **F1-A · `manifest.json`/`layout.tsx`**: los íconos y la OG conservan nombre, ruta y medidas (`/og-image.jpg`
  1200×630, `/icon-192.png`, `/icon-512.png`, `/favicon.svg`); no hay que tocar rutas, sólo los colores de §5.7.
- **L1 Portada**: escena 1 = `<MesaDeGrabados slugs=…/>` + velo de la escena (el de `.e1::after` de la maqueta); escena 2 =
  `<GrabadoParticulas carta={{ slug: "rws-tarot-00-fool" }} texto={…} firma={…} alt={…}>` con la columna de texto como
  `children`; escena 3 = `<CartaQuemable tamano="grande" prioridad …/>`.
- **L2 Lectura**: revelar con `CartaQuemable` (ya es `<button>` con `aria-live`; sustituye el `div onClick` de
  `[spreadTypeId]/page.tsx:606-609`); «voltear todas» = poner `revelada` en `true` en todas; `carta.slug = slugCarta(card.name)`;
  `etiqueta = t("carta.voltearPosicion", { posicion })`; `<TransicionPincel />` al entrar al paso «revealing». Pasar a
  `ShareButton` `translations.shareLink` y `translations.close` (hoy caen en «Share link:» / «Close» fijos).
  `NewCardDiscoveredModal` aún lee `card.imageUrl` con `next/image`: cambiar a `cartaImagen(card)`.
- **L3 Día y mesa**: `/daily` con `CartaQuemable` + `<TransicionPincel />`; banda del dashboard
  `<MesaDeGrabados slugs={recientes} columnas={8} filas={2} />` (≤ 16).
- **L5 Colección**: `GoldenCardModal` aún lee `card.imageUrl` → `cartaImagen(card)`; la colección puede cambiar sus
  `golden-*-collection` de styled-jsx por `golden-card-glow`/`golden-shimmer-effect` de `tinta.css`.
- **Todos los lotes de Fase 2**: quedan usos de `imageUrl` en archivos ajenos; la regla es `cartaImagen()`.

### Pendientes

- Durante la quema, el reverso en el lienzo de 150×260 se ve más suave que el SVG en cartas grandes (compromiso de §5.6).
  Si Fable lo quiere más nítido: `grande` a 200×347 (+78 % de píxeles; el banco dice que hay margen).
- `ShareButton` sigue con «Share link:» / «Close» en inglés hasta que L2 pase las traducciones.
- `mesa` ≈ 12 KB por carta (meta ≈ 10 KB); si hace falta, q45 o 190 px.
- OG sólo en español; una variante en inglés sería otra imagen y otro `metadata`.
- No probado en WebKit (para el caso sin JS, Safari ≥ 17 por `scripting`); Lighthouse de `/` es aceptación de Fase 4.
- `design/maqueta/scripts/cartas.py` (el que baja de Wikimedia) quedó intacto; `scripts/cartas.py` no baja nada.

### Comandos y resultados

```
python scripts/cartas.py --origen C:/Users/guill/dev/arcana/design/cartas/original
  → color 4.67 MB · tinta 3.62 MB · mesa 0.93 MB · total 9.22 MB en 234 archivos (presupuesto 14 MB)
python scripts/cartas.py marca
  → favicon.svg 0.3 KB · icon-192.png 15.3 KB · icon-512.png 44.9 KB · og-image.jpg 121.4 KB
node scripts/tinta-banco.mjs --salida <dir>        → tabla de rendimiento de arriba, 0 errores de consola
npx tsc --noEmit                                   → 0 errores
npm run lint                                       → 0 errores, 17 advertencias (todas en archivos ajenos y previas)
npm test  (check-messages + jest)                  → check-messages ok (1004 keys) · 93 suites / 1253 tests verdes
                                                     (base: 88 suites; +5 nuevas: cartas, CartaQuemable, GrabadoParticulas,
                                                     MesaDeGrabados, TransicionPincel)
npm run build                                      → exit 0 · «Compiled with warnings» (las mismas advertencias de lint ajenas)
                                                     · 63/63 páginas estáticas · el CSS minificado conserva
                                                     @media (scripting:none){.cq-pista,.cq-tapa{display:none}}
```

## Parte F4-A · Rendimiento e infraestructura (Fase 4 del rediseño «Dos tintas»)

Worktree `C:/Users/guill/dev/arcana-lotes/f2-L1`, rama `rediseno/f4-A`, sale de `rediseno/dos-tintas` en `971eb03`. 6 nov 2026.
Sin `git push`. Base sólo `arcana_e2e_l1` del clúster local (vía `scripts/e2e-db.mjs serve`, web en `:3011`); `npm run build`
leyó producción sólo para el sitemap, como en I1/I2. `BITACORA.md` no se tocó. Al terminar, `:3011` queda libre.

Fuentes: dictamen de Fable (`scratchpad/fase4/inspeccion-fable.md`, puntos 1, 2 y 10 y su anexo), revisión de infraestructura
(`scratchpad/fase4/code-review-infra.md`, puntos 1–9) y de flujos (`code-review-flujos.md`, punto 11).

### 1 · Hecho

| Commit | Qué |
|---|---|
| `c11c523` | **LCP de la portada en celular** (Fable 1). `MesaDeGrabados` gana `inmediatas?: number` (0 por omisión): las filas `< inmediatas` de las columnas 0–3 van sin `loading` ni `fetchPriority` (conservan `decoding="async"`, `width`/`height`, `alt=""`). El héroe pasa `inmediatas={3}` (12 grabados, 165 KB medidos); la banda del dashboard no pasa nada. Tests: `MesaDeGrabados.test.tsx` (sin prop: 40 `lazy`+`low`; con 3: 12 sin atributos en las filas 0–2 de las columnas 0–3 y 28 `lazy`+`low`), `landing.test.tsx` (12/28 en el héroe) y `dashboard-page.test.tsx` (la banda, todas perezosas) |
| `61c9520` | **CLS de la portada** (Fable 2). `.portada-tesis { max-width: 13.2em }`; bajo 480 px `.portada-nota { flex-basis: 100%; min-height: 2.25rem }` y la etiqueta del héroe con clase `portada-grabados__etiqueta` y `min-height: 2.1rem`. **Además** (lo pedía el criterio de `medir-hero` a 360, §3): bajo 480 px `font-size: min(1.6rem, calc((100vw - 2 * var(--spacing-gutter, 16px)) / 13.2))` en la tesis. Test en `landing.test.tsx` (las reglas y la clase) |
| `0482b60` | **La cabecera no salta para invitados** (Fable 10). El layout raíz hace `await auth()` y pasa la sesión (`null` sin sesión) a `<Providers session>` → `<SessionProvider session>`. Test nuevo `providers.test.tsx` (el layout entrega a `<Providers>` la sesión que da `auth()`, también `null`; `Providers` la pasa tal cual) |
| `7ca4c05` | **Correo diario sin imagen** (infra 1, ALTA). El cron manda `cardImage: cartaImagen(selectedCard.name)` (`/cartas/<slug>-color.webp`); `email.ts` sigue armando la URL absoluta `https://www.readarcana.com/_next/image?url=%2Fcartas%2F…&w=384&q=80` (sólo cambió su comentario). Nada más del cron. Tests: `cron-daily-readings.test.ts` (ya no usa `imageUrl` de la base) y nuevo `cron-daily-email.test.ts` (cron → correo real con Resend simulado: The Lovers, The Sun, Ace of Cups y King of Pentacles dan su `src` exacto, sin Wikimedia, y el archivo existe en `public/`). No se mandó ningún correo |
| `45a8e46` | **El service worker ya no precarga las cartas** (infra 2). `publicExcludes: ["!noprecache/**/*", "!cartas/**/*", "!screenshots/**/*"]` y regla `CacheFirst` `cartas` para `/cartas/` del mismo origen (función con `sameOrigin`, 300 entradas, 30 días). Los tipos locales de next-pwa aceptan la función. Test nuevo `next-config.test.ts` (opciones de next-pwa, la regla casa `/cartas/` propio y no `_next/image` ni otro origen, es autocontenida, no queda `tarot-images`) |
| `c237229` | **Caché de `/cartas/*`** (infra 3). `headers()`: `Cache-Control: public, max-age=2592000, stale-while-revalidate=604800` (sin `immutable`). Test en `next-config.test.ts` |
| `88033f4` | **Caché huérfana `tarot-images`** (infra 7). `worker/index.js` (next-pwa lo compila a `public/worker-<buildId>.js` y `sw.js` lo importa) borra `tarot-images` en `activate`. `public/worker-*.js` a `.gitignore` y a los `ignores` de ESLint. Test nuevo `service-worker.test.ts` (ejecuta el worker en un `vm`: sólo borra esa caché y la espera con `waitUntil`) |
| `e2b14c6` | **Blog** (infra 4, flujos 11). Nuevo `ImagenDelArticulo` en `blog/contenido.tsx`, usado por el índice y el artículo: portada si existe (con `unoptimized` si empieza con `http`/`https`/`//`), si no el grabado. Parser: un renglón en blanco cierra la lista; una numerada empieza en el número de su primer renglón (`start`), así que tras un párrafo continúa. Test nuevo `blog.test.tsx` (11; las dos pruebas de portada externa fallan sin `unoptimized`, comprobado) |
| `b019eeb` | **`useMedia`** (infra 8). `subscribe` estable con `useCallback([consulta])`. Test nuevo `useMedia.test.tsx` (10 re-renders = 1 suscripción; sigue los cambios; cambiar de consulta da de baja la vieja). Con el código anterior la primera prueba falla (comprobado) |
| `19d9244` | **Levantar al pasar el ratón** (infra 9). `button-classes.ts`: `transition-[translate,background-color,color,border-color]`; `card.tsx`: `transition-[translate,border-color]`. Tests en `Button.test.tsx` y `Card.test.tsx` |
| `6f7c9c1` | **`GrabadoParticulas` por cubetas de alfa** (infra 5). Medido primero (tabla §7): el costo era real. `pintarParticulas()` agrupa las negras en 8 niveles de opacidad (`globalAlpha`) y las rosas en uno; 2 `fillStyle` y ≤ 9 `globalAlpha` por cuadro; posiciones en arreglos tipados reusados. Mismo movimiento y tamaños. 3 pruebas nuevas en `GrabadoParticulas.test.tsx` (5200 partículas: 2 colores, ≤ 10 cambios de alfa, 5200 rectángulos; error de opacidad ≤ 1/16; no pinta las que siguen en el grabado) |
| `5783282` | **Capturas de la PWA** (infra 6). `scripts/generate-pwa-screenshots.ts` ya no dibuja el maqueta morada: captura la portada real de un build (`ARCANA_SCREENSHOTS_URL`, invitado, es-MX, movimiento reducido, mesa del héroe cargada) y guarda WebP: `portada-ancha.webp` 1440×900 (`wide`, 112 KB) y `portada-angosta.webp` 780×1688 (390×844 a 2×, `narrow`, 112 KB). `manifest.json` las lista con `label`; fuera `home.png` y `reading.png`. Test nuevo `pwa-manifest.test.ts` (existen, miden lo que dice el manifest, reglas de Chrome de 320–3840 px y proporción ≤ 2,3, < 250 KB, no moradas, no sobra ningún archivo) |
| este | el parte |

### 2 · Falso o ya hecho

- **«13.2em = 320 px a 24,2 px»** (Fable 2): en teléfono la tesis mide 25,6 px (el `clamp` se queda en su mínimo de 1.6rem bajo 500 px),
  así que 13.2em = 338 px. Con eso «Quien las lee hoy es una IA.» cabe con las dos fuentes (317 px en Gloock, 333 px con la de
  respaldo) en 390–430, **pero no a 360**: allí la caja mide 328 px (360 − 2 × 16) y sólo la de respaldo partía el renglón (alto
  del h1 115 → 143 px en `medir-hero`). Por eso la regla extra de `font-size` bajo 480 px (24,85 px a 360; sin efecto desde ~370 px).
  Fable midió esa diferencia como CLS 0,0186 a 360 en su E6.
- **Fable 10, «ningún salto con fuente `div.ml-auto`»**: el salto de la sesión (hueco de 112 px → «Iniciar sesión», 0,0015–0,0017
  a los 3,3–4,5 s) ya no existe. Queda otro, menor, en el que `div.ml-auto` también es fuente: al llegar Martian Mono (~1,9 s) el
  lado derecho de la cabecera se angosta 26 px (233 → 207) y la flecha del CTA se mueve 47 px (0,0026 en total). Antes quedaba
  escondido porque a esa hora la cabecera era un hueco. No es de la sesión (`scratchpad/fase4/A/saltos.mjs`). Ver handoff 2.
- **`Header.test.tsx`** no necesitó otro mock: simula `useSession` directamente. Verde sin tocarlo.
- **Infra 3 proponía `max-age=31536000, immutable`** y **infra 2, 150 entradas**: se siguió el encargo (30 días + 7 de
  `stale-while-revalidate`, sin `immutable` porque los nombres no llevan hash; 300 entradas, alcanza para las 234 cartas).
- **El optimizador sí manda JPEG a clientes sin WebP**: `curl` a `/_next/image?url=%2Fcartas%2Frws-tarot-06-lovers-color.webp&w=384&q=80`
  con `Accept: image/png,image/jpeg` → 200 `image/jpeg` (66 KB); con `image/webp` → 200 `image/webp`; con la URL de Wikimedia → 400.

### 3 · Decisiones

- **Tesis a 360** (§2): ajustar la letra 3 % en vez de reservar un renglón más (que dejaría un hueco de 28 px con Gloock) o de
  tocar las fuentes (Fable: no tocarlas). Es `min()`: en ≥ 370 px no cambia nada.
- **`ImagenDelArticulo`** en `contenido.tsx` y no dos copias: así «la misma regla en los dos» queda en un solo lugar. El grabado del
  artículo ahora va dentro de un `div` (el `hidden md:block`, el ancho y el giro pasaron al envoltorio): se ve igual.
- **Número de la lista numerada**: el del primer renglón escrito (como CommonMark), no una cuenta acumulada: «3.» tras un párrafo
  es 3; una lista que el autor vuelve a empezar en «1.» empieza en 1.
- **Capturas en español** (es el idioma por omisión y el del público), a movimiento reducido para que la mesa salga quieta. El
  script fuerza `eager` sólo en los grabados del héroe al capturar (con `lazy` algunos de la derecha no se habían pedido).
- **`worker/index.js` en JS** (no TS): next-pwa lo compila aparte con su babel; así `tsc` no lo revisa con los tipos del DOM.
- **Amend/autosquash local**: dos commits se rehicieron antes de entregar (una `\b` que la shell convirtió en carácter de
  retroceso en una regex de prueba, y la regla de 360 dentro del commit del CLS). Nada estaba publicado.

### 4 · Handoffs

1. **F4-B (`collection/page.tsx:327`)**: el mismo error de infra 9 — `transition-[transform,border-color]` con
   `group-hover:-translate-y-0.5`; cambiar `transform` por `translate`. Es de su lote; no lo toqué.
2. **F4-B (cabecera), opcional**: el salto de 0,0026 al llegar Martian Mono (§2) sale de que la respaldo de Martian (Arial al
   157 %) es más ancha en mayúsculas con tracking. Si se quiere en cero, reservar el ancho de «Iniciar sesión»/«Registrarse» en
   la cabecera. Con el CLS total en ≤ 0,0043 no lo considero necesario.
3. **Integrador**: `src/components/reading/useMedia.ts` está bajo el glob de F4-B (`src/components/reading/**`), pero el encargo
   me asignó la corrección 10. Cambio de 9 líneas, sin tocar su firma; si F4-B también lo editó, quedarse con `useCallback`.
4. **Fable / deuda**: Lighthouse simulado (Lantern) da LCP 5,6–6,1 s con FCP 3,46 s: lo limita el render bloqueante (3 CSS, Lantern
   estima 2,48 s) y el HTML con todos los `messages` (deuda 11a de Fable), ya no el grabado (que se descubre a los 10 ms). Con
   Lighthouse en modo `devtools` el LCP es 2,40–2,52 s y queda pegado al FCP. Ver §7.
5. **320 px** (fuera del criterio 360–430): sin Martian Mono el bloque del héroe sube 12 px (`contTop` 132 → 120). No lo investigué.
6. **Correo**: si algún día una carta de la base no fuera una de las 78, `cartaImagen` da `/cartas/reverso.svg`, que
   `/_next/image` rechaza (SVG). Hoy no pasa: los 78 nombres del seed tienen slug (infra, Foco A). Y los correos siguen con el
   diseño morado (pendiente declarado de §5.5, sin dueño).

### 5 · Archivos tocados

`src/components/tinta/MesaDeGrabados.tsx`, `src/components/landing/{EscenaGrabados.tsx,portada.css}`, `src/app/layout.tsx`,
`src/components/providers.tsx`, `src/app/api/cron/daily-readings/route.ts`, `src/lib/email.ts` (comentario), `next.config.ts`,
`src/types/next-pwa.d.ts`, `worker/index.js` (nuevo), `.gitignore`, `eslint.config.mjs`, `src/app/(main)/blog/{page.tsx,[slug]/page.tsx,contenido.tsx}`,
`src/components/reading/useMedia.ts`, `src/components/ui/{button-classes.ts,card.tsx}`, `src/components/tinta/GrabadoParticulas.tsx`,
`public/manifest.json`, `public/screenshots/*`, `scripts/generate-pwa-screenshots.ts`; pruebas en `src/__tests__/**` (7 archivos
nuevos: `components/providers`, `components/useMedia`, `api/cron-daily-email`, `app/blog`, `lib/next-config`, `lib/service-worker`,
`lib/pwa-manifest`). Ninguno de F4-B salvo `useMedia.ts` (handoff 3).

### 6 · Comandos y resultados

Todo sobre el árbol final (`5783282`), salvo lo marcado.

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | **0 errores** |
| `npm run lint` | **0 errores, 7 avisos** (los mismos 7 previos de I2) |
| `npm test` | `check-messages: ok (1085 keys)` · **123 suites / 1,591 pruebas, todo verde** (I2: 116 / 1,547). Sigue el aviso previo del worker de Jest |
| `node scripts/e2e-db.mjs serve` (reset + `next build` + `next start -p 3011`) | build **exit 0** · **79 rutas: 78 ƒ + `/sitemap.xml` ○, idénticas en nombre y tipo a las de `971eb03`** (ninguna estática se volvió dinámica ni al revés) |
| `sw.js` generado | antes: 235 entradas `/cartas/*` (243 de `public/`); después: **0 en la precarga** (6 de `public/`: favicon, íconos, manifest, og-image, robots), la regla `registerRoute(function(e){var s=e.url;return e.sameOrigin&&s.pathname.startsWith("/cartas/")}, new e.CacheFirst({cacheName:"cartas", … maxEntries:300, maxAgeSeconds:2592e3}))` y `importScripts("worker-<buildId>.js")`; el worker es `self.addEventListener("activate",e=>{e.waitUntil(caches.delete("tarot-images"))})` |
| `curl -sI :3011/cartas/wands10-mesa.webp` (y `reverso.svg`) | `Cache-Control: public, max-age=2592000, stale-while-revalidate=604800`; `/og-image.jpg` sigue `public, max-age=0` |
| HTML de `/` para invitado | 12 `<img …-mesa.webp>` sin `loading`; `wands10` sin `fetchpriority`; la cabecera trae `href="/login"` «Iniciar sesión» desde el servidor |
| `ARCANA_E2E_REUSE=1 ARCANA_E2E_DEFECTOS=0 npx playwright test e2e/responsivo.spec.ts --grep "portada\|dashboard\|blog"` | **112 ✓** (2.5 min) |
| `ARCANA_E2E_REUSE=1 npx playwright test e2e/home.spec.ts e2e/auth.spec.ts e2e/flujos/registro.spec.ts e2e/smoke.spec.ts` | 1ª corrida: 50 ✓ · **2 ✘** · 2 omitidas, en 2.4 min (`home` «switch to English» y «mobile menu»: «Application error: a client-side exception», con las fuentes y un grabado sin cargar en la captura: la máquina estaba saturada). Repetidas: las 2 aisladas `--repeat-each 3` **6/6**; las 4 specs **52 ✓ · 2 omitidas** (36 s); las 4 specs `--repeat-each 2` **104 ✓ · 4 omitidas**. Omitidas: las de siempre (Google apagado, email sin `@`) |
| Lighthouse 13.4.1 (caché de npx, sin instalar) móvil de `/`, 3 corridas, Chromium de Playwright | simulado: perf 67–72, **LCP 5,56–6,08 s**, CLS 0,0076, FCP 3,46 s, TBT 66–237 ms; `--throttling-method=devtools`: perf 77–88, **LCP 2,40–2,52 s**, CLS 0,005–0,007, FCP 2,33–2,44 s. Elemento LCP: `wands10-mesa.webp` (eager). Sin medición de antes con Lighthouse |

### 7 · Medidas

**LCP/CLS de `/` en celular**, método de I2/Fable (`scratchpad/fase4/A/lcp3.mjs`, copia de `fase4-fable/lcp3.mjs` con puerto 3011
y sin reescribir HTML: Slow 4G 150 ms / 1,6 Mb/s / 750 kb/s, CPU ×4, caché fría, alto 823, DPR 1,75, SW bloqueado). «Antes» =
build de `971eb03` en esta máquina; «después» = build final.

| Ancho (corridas) | LCP mediana (máx) antes | LCP mediana (máx) después | CLS mediana (máx) antes | CLS mediana (máx) después | Elemento LCP |
|---|---|---|---|---|---|
| 412 (5) | 3 716 ms (4 204) | **1 204 ms (1 392)** | 0,0302 (0,0555) | **0,0026 (0,0039)** | `wands10-mesa.webp` en todas |
| 390 (3) | 3 708 ms (3 756) | **1 220 ms (1 228)** | 0,0500 (0,0668) | **0,0027 (0,0041)** | `wands10-mesa.webp` |
| 360 (3) | 3 720 ms (3 728) | **1 232 ms (1 248)** | 0,0064 (0,0177) | **0,0029 (0,0029)** | `wands10-mesa.webp` |

Criterio (LCP mediana y máx ≤ 2 500 ms, CLS máx ≤ 0,05 en los tres anchos): **cumple**. Un build intermedio (sin la regla de 360)
dio 412: 1 276 ms (máx 2 172), CLS máx 0,0039; 390: 1 264 (1 268); 360: 1 224 (1 228). Saltos que quedan: 0,0026–0,0029 a ~1,9 s
(llega Martian Mono, §2) y 0,0013–0,0015 a ~2,9 s («Pregunta» al llegar Water Brush, sin precarga a propósito). Ya no aparecen el
de 0,025 (Gloock/Martian en el héroe), el de 0,017–0,031 (bloque del héroe) ni el de la sesión en la cabecera.

**Alturas del héroe con y sin cada fuente** (`scratchpad/fase4/A/medir-hero.mjs`: `fase4-fable/medir-hero.mjs` con puerto 3011 y los
`woff2` de cada familia leídos del CSS del build): antes, **7 combinaciones con diferencias** (sin Gloock el h1 115 → 143 px en los
4 anchos; sin Martian la etiqueta 17 → 34 px a 390–430 y la nota 36 → 18 px a 412–430); después, **sin diferencias de alto entre
fuentes en 360/390/412/430** (spans [28,28,56] a 360 y [29,29,57] en el resto; etiqueta 34; nota 36).

**`GrabadoParticulas`** (`scratchpad/fase4/A/particulas.mjs`: Chromium 1440×900, CPU ×4, la escena 2 recorrida a 10 px por cuadro,
227 cuadros, lienzo 733×628; tiempo de JS de cada rAF de la página, intervalo entre cuadros, tareas largas y long-animation-frames),
3 vueltas:

| | Cuadro p50 / p95 / máx | Cuadros > 34 ms | JS por rAF p50 / p95 / máx | Tareas largas (máx) | LoAF > 50 ms |
|---|---|---|---|---|---|
| Antes | 33,3 / 66,7–83,4 / 250–283 ms | 59–89 | 11,8–13,4 / 49,2–54,3 / 136–248 ms | 38–60 (238–277 ms) | 15–21 |
| Después | **16,7** / 33,4–50 / 50–83 ms | **11–16** | **3,0–3,7 / 8,1–11,5 / 22–25 ms** | **1–4 (50–65 ms)** | **0** |

Scripts y salidas: `scratchpad/fase4/A/` (`lcp3.mjs`, `medir-hero.mjs`, `particulas.mjs`, `saltos.mjs`, `anchos-tesis.mjs`,
`medidas-{antes,despues,final}.log`, `lcp/*.json`, `particulas/*.json`, `lighthouse/*.json`, `e2e-*.log`, `npm-test.log`,
`serve-*.log`).

# PLAN 2026-11-05 — Rediseño «Dos tintas» en toda la app

Concepto y tokens: `docs/DISENO-2026-11-05.md` (§0 no se relitiga). **La §5 (revisión de Fable) manda sobre §1–§4 donde choquen.** Maqueta aprobada por Memo («me encanta»):
`design/maqueta/` y https://claude.ai/artifact/Adhhvs3S2AGmwbvaqYtZyA. Pedido de Memo para esta ronda: **«al 100%,
100% responsivo, con todos los tests»**. Rama base: `rediseno/dos-tintas`.

## 0. Línea base (5 nov 2026)

| Medida | Valor |
|---|---|
| Páginas (`page.tsx`) | 41 · ~8,600 líneas |
| Componentes | ~70 · ~8,600 líneas |
| Clases de color del tema viejo (`slate/purple/amber/violet/…-NNN`) | 1,743 |
| Usos de `imageUrl` en UI | 61 en 27 archivos (Wikimedia en caliente; «Los Enamorados» da 404 en producción) |
| Tests | 88 suites / 1,129 (Jest) · Playwright sólo páginas públicas |
| Postgres local | PostgreSQL 18.6 (scoop) instalado, sin servicio; 5432 y 54329 libres |

## 1. Decisiones

1. **Suelos.** Las pantallas de la app usan **papel** como suelo (como la pantalla de lectura de la maqueta), con la
   **cabecera en franja de tinta** fija con la hora del día. Los **momentos firma** van sobre **tinta**: el escenario
   donde se revelan cartas, la carta del día, los modales de logro/nivel/carta dorada, el cierre de la portada.
   La portada alterna tinta/papel por escenas como la maqueta.
2. **Tipografía** con `next/font/google` (autohospedada por Next): Gloock (títulos), Newsreader (lectura y cuerpo),
   Martian Mono (datos), Water Brush (sólo pincel). Nada de Inter/Geist/Fraunces.
3. **Cartas autohospedadas** en `public/cartas/<slug>-{color,tinta,mesa}.webp` y helper `cartaImagen()`; la UI deja
   de leer `card.imageUrl`. Arregla «Los Enamorados» sin tocar la base y quita la dependencia de Wikimedia (429).
4. **Red de seguridad de color**: en `globals.css` la paleta vieja de Tailwind (`slate`, `purple`, `violet`,
   `indigo`, `amber`, `pink`, `fuchsia`) se **remapea** a tokens de Dos tintas, para que cualquier pantalla que un lote
   no alcance a reescribir siga legible. Cada lote **reescribe** sus archivos a los tokens nuevos; al final no debe
   quedar ninguna clase vieja (`grep` en el integrador).
5. **Pruebas con sesión sin tocar producción**: clúster Postgres local de pruebas en `C:/Users/guill/dev/arcana-e2e-pg`
   (puerto 54329), esquema con `prisma db push`, semilla real (cartas, tiradas, logros, retos) y un usuario de prueba.
   La IA se sustituye por respuestas fijas con `ARCANA_AI_FAKE=1` (sólo fuera de producción).
6. **Movimiento**: sólo `transform`/`opacity` (+ `clip-path` donde se mide), CSS con `animation-timeline` cuando sirve,
   Canvas 2D sólo en momentos firma, ningún `rAF` eterno, `prefers-reduced-motion` respetado, todo completo sin JS.

## 2. Contratos compartidos (los escribe la Fase 1; los consumen todos)

### 2.1 Tokens y utilidades (`src/app/globals.css`, Tailwind 4 `@theme`)

```
--color-tinta #0E0D0C · --color-papel #ECEAE6 · --color-papel-hondo #E2DFD9 · --color-grafito #55524D
--color-niebla #A8A49D · --color-rosa #E4007C · --color-rosa-texto #B10061 · --color-rosa-luz #F43D97 · --color-brasa #FF6BB5
--font-titulo (Gloock) · --font-lectura (Newsreader) · --font-dato (Martian Mono) · --font-pincel (Water Brush)
```
Reglas de contraste (medidas): texto chico sobre papel → `tinta`, `grafito` o `rosa-texto`; sobre tinta → `papel`,
`niebla` o `rosa-luz`. `rosa` puro sólo para gráficos, pincel y texto ≥ 24 px. Botón primario: fondo `rosa-luz`,
texto `tinta`. Semánticos: error `#B3261E` sobre papel / `#FF8A80` sobre tinta; éxito `#1F6B3A` / `#7BD88F`.

### 2.2 Componentes firma (`src/components/tinta/`)

```ts
<HoraDelDia variante="larga" | "corta" />            // fecha local · tonalli · señor de la noche · luna; usa @/lib/systems
<Pincel as?="p" | "span" className? children />      // palabra a pincel con el filtro de pincel seco (SVG en el layout)
<CartaQuemable                                        // carta boca abajo que se quema al tocarla (Canvas 2D)
  carta={{ nombre: string; slug: string }} invertida?: boolean
  revelada?: boolean                                  // controlada desde fuera (p. ej. "voltear todas")
  onRevelada?: () => void  etiqueta: string          // aria-label antes de revelar
  tamano?: "chica" | "media" | "grande" />            // sin JS o con reduced-motion: aparece revelada con fundido corto
<GrabadoParticulas carta={{ slug }} texto={string[]} />  // el grabado se deshace y escribe el texto (escena de la portada)
<MesaDeGrabados slugs={string[]} columnas?={number} />   // retícula girada que deriva (héroe de portada y fondo del dashboard)
<Escena suelo="tinta" | "papel" className? children />    // sección con su suelo y scroll-margin
<Etiqueta>…</Etiqueta>                                // dato en mono con el punto rosa
```

### 2.3 Cartas (`src/lib/cartas.ts`)

```ts
export type VarianteCarta = "color" | "tinta" | "mesa";
export function slugCarta(nombreEnIngles: string): string          // "The Lovers" → "rws-tarot-06-lovers", "Two of Cups" → "cups02"
export function cartaImagen(c: { name: string } | string, v?: VarianteCarta): string  // "/cartas/<slug>-<v>.webp"
export const CARTAS: readonly { name: string; slug: string }[]      // las 78, en el orden del seed
```
Test: las 78 de `prisma/seed.ts` tienen slug y archivo en `public/cartas/` para las tres variantes.

### 2.4 Pruebas e2e (`e2e/`)

- `npm run e2e:db` (levanta/crea/llena el Postgres local), `npm run test:e2e` usa `.env.e2e` (base local, `ARCANA_AI_FAKE=1`, `AUTH_TRUST_HOST=true`).
- `e2e/helpers/sesion.ts`: inicia sesión con el usuario de prueba (credenciales en `e2e/fixtures/usuario.ts`, sólo para la base local).
- `e2e/responsivo.spec.ts`: **todas** las rutas (públicas y con sesión) × **5 anchos** (1440, 1024, 820, 390, 360):
  status 200, sin scroll horizontal, ningún elemento fuera de pantalla (salvo recortado por ancestro), sin errores de
  consola, imágenes cargadas, un solo `h1`, árbol de accesibilidad con encabezados; y dos pases: `reduced-motion`
  (nada corriendo, nada invisible) y sin JS en las públicas.
- Flujos: registrar e iniciar sesión, tirada de 3 cartas → quemar → interpretación, carta del día, mazo propio,
  lectura de dos, Mapa Arcano (síntesis falsa), calendario (teclado), historial.

## 3. Lotes

### Fase 1 (en paralelo, tres lotes)

**F1-A Base visual** — dueño de: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/(main)/layout.tsx`,
`src/app/(auth)/layout.tsx`, `src/app/(legal)/layout.tsx`, `src/components/ui/{button,card,badge,input,modal,LanguageSelector}.tsx`,
`src/components/SoundToggle.tsx`, `src/components/layout/{Header,footer}.tsx`, `src/components/animations/**`,
`src/components/providers.tsx`, `messages/*.json` (sólo llaves `nav.*`, `common.*` nuevas).
- Tokens §2.1 + remapeo de la paleta vieja (§1.4) + fuentes con `next/font` + filtro SVG de pincel en el layout.
- Primitivas: `Button` (variantes `primario` rosa-luz/tinta, `linea`, `fantasma`; mono en mayúsculas; mismo API que hoy +
  alias de variantes viejas), `Card` (papel con filete tinta, sin sombras genéricas), `Badge`, `Input` (filete inferior,
  Newsreader), `Modal` (sobre tinta, foco atrapado, Esc), `LanguageSelector`, `SoundToggle`.
- `Header`: franja de tinta fija con marca (Gloock), `<HoraDelDia>` (larga en ≥ 1024, corta abajo), navegación,
  créditos, menú de usuario y **menú móvil** a pantalla completa en tinta (hoy no hay menú móvil de navegación);
  `Footer` en tinta con créditos de Pamela Colman Smith.
- Transición entre pantallas «a pincel» (una barra de tinta que barre, 450 ms, sólo con motion) reemplazando `PageTransition`.
- Tests: contraste AA calculado de los tokens; Header (navegación, menú móvil con teclado y Esc); Button/Modal.

**F1-B Firma y cartas** — dueño de: `src/components/tinta/**` (nuevo), `src/lib/cartas.ts` (nuevo), `public/cartas/**`
(nuevo), `scripts/cartas.py` (desde `design/maqueta/scripts/cartas.py`), `src/components/ui/{TarotCard,CardPlaceholder,SavedReadingCard,ShareButton}.tsx`.
- Componentes §2.2 portados de `design/maqueta/tinta.js` a React (client components; limpieza de efectos; sin `rAF` eterno).
- Cartas §2.3: 78 × 3 variantes en WebP (`color` 400 px q72, `tinta` 400 px, `mesa` 220 px q60) — presupuesto ≤ 12 MB total.
- `TarotCard`/`TarotCardStatic` usan `cartaImagen()`; reverso nuevo (el de la maqueta, como SVG/componente).
- Tests: `cartas.test.ts` (78 slugs + archivos), `CartaQuemable` (teclado, reduced-motion → revelada sin canvas,
  `revelada` controlada), `HoraDelDia` (vector 5 nov 2026 → «1 Mázatl», Tláloc).

**F1-C Pruebas e2e** — dueño de: `scripts/e2e-db.mjs` (nuevo), `.env.e2e.example`, `playwright.config.ts`, `e2e/**`,
`package.json` (scripts y devDeps), `src/lib/ai/config.ts` (sólo el modo falso), `.gitignore`.
- Clúster Postgres de pruebas (initdb en `C:/Users/guill/dev/arcana-e2e-pg`, puerto 54329, trust local), `db push`,
  semilla (`prisma/seed.ts`, `seed-achievements`, `seed-challenges`, `seed-themed-spreads`) y usuario de prueba con perfil y créditos.
- `ARCANA_AI_FAKE=1`: `complete()` devuelve textos fijos plausibles (en es/en según el prompt) **sólo si
  `process.env.NODE_ENV !== "production"`**; test que lo garantice.
- Playwright: proyecto `chromium` con los 5 anchos como proyectos o parámetros; `webServer` = `next build && next start`
  con `.env.e2e`; `responsivo.spec.ts` y flujos §2.4. Las specs viejas siguen pasando.

### Fase 2 (en paralelo, seis lotes; parten de la Fase 1 integrada)

Cada lote: reescribe sus archivos a tokens/primitivas/componentes firma, quita **todas** las clases de la paleta vieja,
usa `cartaImagen()` en lugar de `imageUrl`, verifica sus rutas en los 5 anchos con `e2e/responsivo.spec.ts` y agrega sus flujos.

- **L1 Portada** — `src/app/page.tsx`, `src/components/landing/**`: las seis escenas de la maqueta con datos reales
  (hora, carta del día de ejemplo, pulso colectivo si hay datos, «Más que tarot», tonalli de hoy con marquesina, «Tu turno»);
  metadata/OG intactos.
- **L2 Lectura** — `src/app/(main)/reading/**`, `src/components/reading/**`, `src/components/manual/**`, `src/app/share/[shareId]/**`:
  elegir tirada como mesa de láminas; intención como pliego; barajar = `MesaDeGrabados` que se reacomoda; **revelar con
  `CartaQuemable`** sobre escenario de tinta (posiciones de cada tirada, de 1 a 12 cartas, responsivo); interpretación en
  Newsreader como pliego; seguimiento, voz, resonancia; mazo propio; página compartida.
- **L3 Día y mesa** — `src/app/(main)/{dashboard,daily,calendar,history}/**`, `src/components/{dashboard,calendar,energies,insights}/**`:
  dashboard como mesa (grabados de tus cartas recientes, la hora, energías, Mapa, retos); carta del día con `CartaQuemable`;
  calendario en dos tintas (hoy en rosa, teclado intacto); historial e insights como archivo.
- **L4 Sistemas** — `src/app/(main)/{blueprint,compatibility,profile}/**`, `src/app/share/blueprint/**`,
  `src/components/{blueprint,compatibility}/**`: Mapa Arcano y lectura de dos en el lenguaje de láminas y datos en mono.
- **L5 Colección y juego** — `src/app/(main)/{collection,achievements,challenges,cards}/**`,
  `src/components/{achievements,challenges,levels,golden}/**`: colección como índice de grabados (las no descubiertas en
  tinta tenue), carta dorada = la única con brasa rosa persistente; modales sobre tinta.
- **L6 Cuenta, dinero y textos** — `src/app/(auth)/**`, `src/app/(main)/{credits,subscribe,settings,referral,blog}/**`,
  `src/app/(legal)/**`, `src/app/{not-found,error}.tsx`, `src/components/ui/InstallPWA.tsx`: formularios en pliego,
  precios en mono, 404 «carta perdida».

### Fase 3 — Integrador

Funde L1–L6, resuelve `messages`, `grep` de clases viejas = 0 (luego se quita el remapeo de §1.4), corre **todo**:
`tsc`, `lint`, `jest`, `build`, `test:e2e` completo (5 anchos × todas las rutas + flujos). Parte en `docs/partes/rediseno-I.md`.

### Fase 4 — Fable inspecciona

Diff ficha por ficha, capturas en 5 anchos de cada ruta, `/code-review`, correcciones, preview de Vercel verificado,
merge a `main`, producción verificada por HTTP, bitácora.

## 4. Reglas para Opus (todas las fases)

1. Sólo tus archivos. Lo ajeno va como handoff en el parte.
2. **No cambies lógica**: datos, rutas de API, cobros, permisos y textos de negocio se quedan; esto es piel y movimiento.
   Si un componente necesita reorganizarse para verse bien, conserva sus props y su comportamiento.
3. No borres tests; actualiza aserciones conservando la intención (los tests de clases CSS se reescriben a la clase nueva).
4. Nunca `git push`, `prisma db push/migrate` contra producción, ni scripts que escriban en la base de producción.
   La base local de pruebas sí (Fase 1-C la crea).
5. Textos nuevos en `messages/en.json` y `messages/es.json` con las mismas llaves; español de México, cálido, sin sermonear.
6. Responsivo medido: 1440, 1024, 820, 390, 360. Sin scroll horizontal, nada fuera de pantalla, objetivos táctiles ≥ 44 px.
7. Accesibilidad: foco visible (rosa), `aria-label` en botones de icono, texto partido con `aria-label`/`aria-hidden`,
   `prefers-reduced-motion`, contenido completo sin JS en páginas públicas.
8. Commits por ficha en tu rama/worktree, Conventional Commits en inglés, con pie
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
9. Parte final en `docs/partes/rediseno-<lote>.md`: hecho / falso o ya hecho / handoffs / decisiones / pendientes / comandos y resultados.


## 5. Revisión de Fable (5 nov 2026) — obligatoria, manda sobre lo anterior

Veredicto de Fable: «lanzar con estos cambios». Texto que sustituye o se añade, en orden de importancia.

### 5.1 Guardas contra producción (BLOQUEANTE, F1-C, con test cada una)
- `.env` de la raíz es PRODUCCIÓN y lo cargan solos Next, Prisma CLI y `@prisma/client`. `prisma/seed.ts:1122-1125`
  hace `deleteMany()` de `creditTransaction`, `reading`, `card` y `spreadType`.
- `scripts/e2e-db.mjs` fija `DATABASE_URL` y `DIRECT_URL` en `process.env` antes de cualquier prisma/tsx/next y aborta
  si no casan con `/@(localhost|127\.0\.0\.1):54329\//`. Aborta también si alguna llave de `.env` falta en `.env.e2e`
  (paridad de llaves: nada se hereda de producción).
- `prisma/seed.ts`: los `deleteMany` sólo corren con `ARCANA_SEED_ALLOW_WIPE=1` **y** host local; si no, aborta.
- `src/lib/ai/config.ts`: el modo falso se activa con `ARCANA_AI_FAKE=1` y `!process.env.VERCEL` (no por `NODE_ENV`).
  `.env.e2e` lleva `ANTHROPIC_API_KEY=sk-ant-e2e-invalid` como segundo candado. Textos falsos: lectura/diaria/
  seguimiento/recap en prosa; síntesis = 4 líneas + 2 que terminan en «?» (`synthesis-blocks.ts:27-34`).
- `src/middleware.ts` (`:13-15`): el nombre de cookie según `request.nextUrl.protocol === "https:"` (en Vercel no cambia
  nada); hoy bajo `next start` en http busca `__Secure-authjs.session-token` y toda ruta protegida redirige a `/login`.

### 5.2 `.env.e2e` y Playwright (F1-C)
`.env.e2e.example` completo: DATABASE_URL, DIRECT_URL, AUTH_SECRET y NEXTAUTH_SECRET (mismo valor), AUTH_TRUST_HOST=true,
NEXTAUTH_URL=http://localhost:3000, GOOGLE_CLIENT_ID/SECRET vacíos, NEXT_PUBLIC_GOOGLE_ENABLED=false,
STRIPE_SECRET_KEY=sk_test_e2e, STRIPE_WEBHOOK_SECRET=whsec_e2e, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_e2e,
RESEND_API_KEY=re_e2e, CRON_SECRET=e2e, ARCANA_AI_FAKE=1, ARCANA_SEED_ALLOW_WIPE=1, ARCANA_DIST_DIR=.next-e2e
(`next.config`: `distDir` desde env, para no chocar con `next dev`). Carga con `process.loadEnvFile(".env.e2e")` en
`playwright.config` (Node 22, sin dependencia). Semilla: `seed`, `seed-achievements`, `seed-challenges`,
`seed-themed-spreads`, `seed-blog`, `add-slugs` (la base debe estar arriba y sembrada **antes** de `next build`:
el sitemap la consulta). Fixtures: usuario `nuevo` (estados vacíos) y `con-historia` (10 lecturas con shareId,
2 compatibilidades, blueprint compartido, logros). Usuario por worker (`e2e-w{n}@arcana.local`, 1000 créditos) con
`storageState` de un login por worker; flujos con mutación en `serial`. Playwright: `workers: 4`,
`use.serviceWorkers: "block"` (next-pwa cachea `/api/*`), `timezoneId: "America/Mexico_City"`,
`page.clock.setFixedTime` para la aserción «1 Mázatl»; `/credits/success` y `/subscribe/success` sin `session_id`.
`HoraDelDia` usa `todayUtc()` de `@/lib/systems`, nunca `new Date()` local (hidratación y acuerdo con /calendar).
WebKit: `npx playwright install webkit` y un pase a 390 de las rutas públicas; si no se puede, iPhone real en Fase 4.

### 5.3 Remapeo de la paleta (sustituye §1.4)
`src/app/remapeo-paleta.css` (nuevo, importado al final de `globals.css`; la Fase 3 lo borra con una línea) redefine
en `@theme` las familias slate, purple, violet, indigo, fuchsia, pink, amber, yellow, orange, red, rose, emerald,
green, teal, blue, sky, cyan. No es una inversión mecánica: es esta tabla.

```
slate: 950 #ECEAE6 · 900 #E2DFD9 · 800 #D6D2CB · 700 #C4BFB7 · 600 #8C8780 · 500 #6B6761 ·
       400 #55524D · 300 #3A3835 · 200 #262422 · 100 #0E0D0C · 50 #0E0D0C
purple/violet/indigo/fuchsia/pink/amber/yellow/orange: 950–700 #F7D6E8 · 600 #B10061 · 500 #E4007C · 400–100 #B10061
red/rose: 950–700 #F6DAD7 · 600–100 #B3261E
emerald/green/teal: 950–700 #D7E8DC · 600–100 #1F6B3A
blue/sky/cyan: 950–700 #DADEE6 · 600–100 #55524D
```

`white` y `black` no se tocan (`bg-black/60` del modal sigue oscuro). Deuda conocida mientras dure el remapeo (sus
lotes la cierran): 12 `text-slate-900/950` sobre ámbar (`button.tsx:30`, `compatibility/page.tsx:23`,
`compatibility/[id]/page.tsx:19`, `DayDetail.tsx:117`, `TodayEnergiesWidget.tsx:67`, `TodayEnergies.tsx:78`,
`GoldenCardModal.tsx:192`, `CardPicker.tsx:213`, `TarotCard.tsx:142,280`, `collection/page.tsx:192,274`) y 26
`text-white`. Las clases `prose*` se **borran** (no hay plugin typography). `globals.css:28-61` (degradado y radiales
morados), `:128-144` (scrollbar oscura) y `:153-156` (`::selection` morado) los rehace F1-A. Gate del integrador:
`grep` = 0 de TODAS las familias de arriba.

### 5.4 Suelos (sustituye §1.1)
Pantallas de la app en papel con cabecera **sticky** (no fixed) en tinta (dos filas en < 720). Tinta sólo en momentos
firma: carta del día (/daily y escena 3), modales de logro/nivel/carta dorada/reto/racha/carta nueva/créditos, banda
superior del dashboard (`MesaDeGrabados` ≤ 16 grabados, altura fija, nunca fondo de página) y cierre de la portada.
**La tirada se revela sobre papel, como en `lectura.html`.** Transición a pincel sólo al entrar a `/reading/new/*`
(paso «revealing») y a `/daily`, no en cada cambio de ruta.

### 5.5 Dueños adicionales (añade a §3)
F1-A → `src/components/ui/index.ts`, `public/manifest.json`, `src/components/tinta/tinta.css` (lo crea vacío e
importado desde `globals.css`; dueño del contenido F1-B), `viewport` en `layout.tsx`. F1-B → `public/{og-image.jpg,
favicon.svg,icon-192.png,icon-512.png}` (dos tintas) y `tinta.css` (incluye los estilos de carta dorada
`golden-card-border`/`golden-shimmer-effect`/`golden-card-glow`, hoy usados 12 veces y **no definidos** en ningún CSS:
la brasa rosa persistente). F1-C → `src/middleware.ts` (sólo nombre de cookie), `next.config.ts` (distDir por env;
quita `remotePatterns` y `runtimeCaching` de Wikimedia con el handoff de F1-B), `prisma/seed.ts` (sólo la guarda).
L6 excluye `(auth)/layout.tsx` y `(legal)/layout.tsx`. Sin dueño y sin tocar: `src/app/api/**`, `src/lib/**` salvo
`cartas.ts` y `ai/config.ts`, `sitemap.ts`, `email.ts` (pendiente declarado: los correos siguen morados). Tests: cada
lote es dueño de los `src/__tests__/**` que importan sus módulos; un test que importe de dos lotes lo toca el
integrador. `messages`: sólo llaves de tu namespace, append-only; `npm run pretest` (`check-messages`) es el gate. Los
7 modales que encadena `reading/new/[spreadTypeId]/page.tsx:779-858`: la regla «modal sobre tinta» vive en
`ui/modal.tsx` (F1-A); los lotes sólo restilizan contenido y conservan props. `components/animations/*` conserva sus
exportaciones (`FadeIn`, `AnimatedCard`, `NumberTicker`, `StaggerContainer/Item`). `framer-motion` se queda, sin usos
nuevos, con `useReducedMotion` donde esté.

### 5.6 Rendimiento (sustituye las líneas de cartas de F1-B)
- `CartaQuemable`: lienzo fijo 150×260 (90×156 en `chica`) sin importar DPR; resplandor en lienzo a mitad de
  resolución (75×130) escalado por CSS, **sin** `filter: blur` ni `mix-blend-mode`; cola global con máximo 3 quemas
  simultáneas y 1100 ms cuando hay cola («voltear todas» de 12 ≈ 4.5 s); `try/catch` en `getImageData` y `getContext`
  nulo → revelada con fundido (así corre en jsdom). Test: Chromium con CPU ×4 (`Emulation.setCPUThrottlingRate`) y 10
  cartas, ninguna tarea larga > 200 ms y la quema termina en < 2.5 s.
- `MesaDeGrabados`: grises horneados en la variante `mesa` (sin `filter` en CSS); 8 × 5 en ≥ 720 y 4 × 5 abajo;
  `fetchpriority="low"`, `decoding="async"`, width/height; la deriva se pausa fuera de pantalla (IntersectionObserver).
  El LCP de la portada es la tesis (texto).
- Cartas: `mesa` 200 px q50 gris (≈ 10 KB), `tinta` 360 px q55, `color` 480 px q65; `cartas.test.ts` suma los bytes
  de `public/cartas` y falla si pasa de 14 MB.
- `GrabadoParticulas` desactivado en ≤ 820 y con reduced-motion, como la maqueta.
- Aceptación en Fase 4: Lighthouse móvil de `/` con LCP ≤ 2.5 s y CLS ≤ 0.05.

### 5.7 Fuentes, marca y accesibilidad
- `next/font`: Gloock 400; Newsreader variable (`opsz`, `wght`, itálica); Martian Mono variable; Water Brush 400 con
  `adjustFontFallback: false`. Si `--font-titulo` referencia otra variable va en **`@theme inline`**; las clases
  `.variable` van en `<html>`.
  - **Nota del 6 nov 2026 (decisión de Fable por rendimiento, lote F4-C):** Newsreader pasa a **estática 400**
    (`weight: "400"`, normal e itálica, sin `axes`): 22.5 + 24.4 KB en vez de 132 + 147 KB de la variable, porque
    Lighthouse móvil simulado cuenta esos bytes antes del FCP/LCP (la portada bajó de 98–99 a 69–71). Sin `wght` no hay
    negritas en Newsreader: el énfasis va en Gloock (las `**negritas**` del blog) o en Martian Mono, y la red
    responsiva reporta cualquier texto en Newsreader ≥ 600 (`negritasSinteticas`). Water Brush deja
    `next/font/google` y es un **subset local** (`src/app/fuentes/water-brush-letras.woff2`, 35 KB en vez de 65: A–Z,
    a–z, ÁÉÍÓÚÑÜ/áéíóúñü, ¿?¡!,. y el espacio), con su `OFL.txt`; lo regenera `scripts/fuente-pincel.py` y
    `src/__tests__/app/fuente-pincel.test.ts` comprueba contra su cmap que cada palabra a pincel quepa.
- `export const viewport = { themeColor: "#0E0D0C", colorScheme: "light" }` y `color-scheme: light` en `:root`;
  `manifest.json` con `theme_color #0E0D0C` y `background_color #ECEAE6`; OG/favicon/íconos en dos tintas (F1-B).
- `Modal`: trampa de foco, foco inicial, `aria-labelledby`, bloqueo de scroll, foco de regreso al disparador. Test:
  Tab no sale, Esc cierra, el foco vuelve.
- Estados por lote (vacío, carga, error) con los fixtures `nuevo`/`con-historia`: esqueletos en papel-hondo sin pulso
  con reduced-motion; `error.tsx`, `aiError`, `/reading/[id]` inexistente, `/share` 404.
- Revelado de cartas como `<button>` (hoy es `div onClick`, `[spreadTypeId]/page.tsx:606-609`) con `aria-live`.
- Bilingüe: `HoraDelDia` (labels en/es de `@/lib/systems`), `Pincel` («Pregunta»/«Ask», «Tu turno»/«Your turn»), la
  marquesina y todo texto nuevo a `messages`; el pase responsivo corre en `es` y además a 390 en `en`.
- Calendario a 360: celdas de ~44 px; vigilar la etiqueta de día en `text-xs`.
- Tests que valen (no sólo clases): pase de 5 anchos, contraste calculado, `CartaQuemable` con `getContext` nulo,
  trampa de foco, `HoraDelDia` SSR = cliente, presupuesto de bytes, guardas contra producción.

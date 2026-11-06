# PLAN 2026-11-05 — Rediseño «Dos tintas» en toda la app

Concepto y tokens: `docs/DISENO-2026-11-05.md` (§0 no se relitiga). Maqueta aprobada por Memo («me encanta»):
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
| Postgres local | PostgreSQL 17 (scoop) instalado, apagado |

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

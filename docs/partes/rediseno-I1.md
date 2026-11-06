## Parte I1 · Integración de la Fase 1 (rediseño «Dos tintas»)

Árbol principal `C:/Users/guill/dev/arcana`, rama `rediseno/dos-tintas`, base `969bf7b`. 5–6 nov 2026. Sin `git push`. Ninguna
base tocada salvo la local (`127.0.0.1:54329`, siempre vía `scripts/e2e-db.mjs`); `npm run build` leyó producción sólo
para el sitemap. Jest corrió con `DATABASE_URL`/`DIRECT_URL` muertas en la línea.

### 1 · Fusiones y conflictos

| Orden | Commit | Resultado |
|---|---|---|
| `git merge --no-ff rediseno/f1-A` | `7e44a68` | limpio |
| `git merge --no-ff rediseno/f1-B` | `8c55ee1` | conflicto en `messages/en.json` y `messages/es.json` |
| `git merge --no-ff rediseno/f1-C` | `66d7916` | limpio |

- **`messages/*.json`**: los dos lotes agregaron un namespace al final (`hora` de F1-A, `carta` de F1-B). Se resolvió con una
  fusión profunda de JSON (orden de HEAD; llaves nuevas de F1-B al final; ningún valor en choque). Diff contra HEAD:
  +10 líneas por archivo, sólo el bloque `carta`. `check-messages: ok (1019 keys in en and es)`.
- Sin conflicto (sólo un lote los tocó): `package.json` (scripts de F1-C), `.gitignore` (F1-C), `src/components/ui/index.ts`
  (F1-A), `next.config.ts` (F1-C), `globals.css` (F1-A).
- **`package-lock.json` sin cambios** frente a la base: no hizo falta `npm ci`. `npx prisma generate` → Prisma Client 6.19.3.
- `.env.e2e` del árbol principal creado como copia de `.env.e2e.example` (idéntico al del worktree de F1-C; está en
  `.gitignore`). `node scripts/e2e-db.mjs check` → «guards OK … 21 keys».

### 2 · Handoffs aplicados (`60d64b1`)

- **eslint**: `".next-e2e/**"` en `ignores` de `eslint.config.mjs`; el script `lint` vuelve a ser `eslint .` (sin `--ignore-pattern`).
- **`tinta.css`**: F1-A no dejó ningún `@import` (tampoco uno roto); F1-B lo importaba desde 5 componentes
  (`CartaQuemable`, `GrabadoParticulas`, `MesaDeGrabados`, `TransicionPincel`, `TarotCard`). Ahora entra **una sola vez**, desde
  `globals.css` (antes del remapeo, como pide §5.5), y salieron las 5 importaciones de los componentes para que no se empaquete
  dos veces. Así la Fase 2 puede usar `golden-card-*`, `.cq`, `.mdg` en cualquier pantalla sin importar nada.
  `scripts/tinta-banco.mjs` (el banco de F1-B, que empaqueta con esbuild) ahora copia `tinta.css` como `banco.css`.
  Los tests que leen `tinta.css` del disco siguen verdes.
- **`card.imageUrl`**: ningún componente de F1-A/F1-B lo lee. `SavedReadingCard` todavía se lo pasaba a `TarotCardStatic` (que
  lo ignora): quité esa línea. El tipo `imageUrl` se queda en las props de `SavedReadingCard` y `TarotCard` (opcional, sin uso)
  para no romper a los llamadores de la Fase 2.
- **`next.config.ts`**: sin `remotePatterns` ni `runtimeCaching` de Wikimedia (sólo queda un comentario). `distDir` por env.
- **`ShareButton`**: su único consumidor es `src/app/(main)/reading/[id]/page.tsx` (L2): **queda como handoff a L2**
  (pasar `translations.shareLink` y `translations.close`).
- **`h1` y textos que señaló F1-A**: sin tocar (Fase 2).
- **`tsconfig.json`** (handoff de F1-C): lo dejé como está; `e2e-db.mjs serve` lo restaura después de cada build y el árbol
  quedó limpio tras las dos corridas.
- Handoffs de F1-C a F1-A comprobados en vivo: el flujo de registro encuentra «Abrir menu de usuario» y «Cerrar sesion»;
  `cerrarModales()` cierra con Escape el `Modal` nuevo; `aria-label="Change language"` se conserva (`home.spec` verde).

### 3 · `DEFECTOS` con la cabecera nueva (`79aea26`)

Agregué a `e2e/responsivo.spec.ts` el interruptor **`ARCANA_E2E_DEFECTOS=0`**: ignora la tabla (sin `fixme` ni errores de consola
filtrados). Sirve para que cada lote y el integrador vean qué entradas ya se arreglaron. Corrida completa con él sobre la Fase 1
integrada (`ARCANA_E2E_REUSE=1 ARCANA_E2E_DEFECTOS=0 npx playwright test`): **932 ✓ · 86 ✘ · 2 omitidas**, 18.5 min. Las 86 se
explican así:

| Grupo | Fallas | Qué pasó |
|---|---|---|
| L6 · sin `h1` (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/about`, `/privacy`, `/terms`) | 49 | se quedan |
| L6 · dos `h1` en `/blog/[slug]` | 7 | se queda |
| L6 · `/subscribe/success` sin `h1` | 6 | se queda |
| L3 · `/progress` 404 en consola (`/dashboard` y `/dashboard (vacío)`) | 11 | se queda (filtro anotado, no `fixme`) |
| **Nuevas, L2** (abajo) | 13 | agregadas |

**Borradas (las arregló la Fase 1):**

| Entrada | Lote anotado | Por qué ya pasa |
|---|---|---|
| `CABECERA_360` en `/`, `/blog`, `/blog/[slug]`, `/cards`, `/cards/[slug]`, `/calendar` (maqueta a 360) | F1-A | la cabecera nueva cabe a 360 de invitado (un solo «Iniciar sesión» + menú; «Registrarse» va al menú móvil) |
| `/` · movimiento reducido (orbes con `animation: float` infinita) | L1 | la red de reduced-motion de `globals.css` (F1-A) lleva toda animación CSS a su estado final. L1 igual debe quitar los orbes y los ☾ ★ ✡ |
| `/collection` · movimiento reducido (`golden-glow-collection`, `golden-shimmer-sweep-collection`) | L5 / F1-B | la misma red de F1-A. L5 igual debe pasar a `golden-card-glow`/`golden-shimmer-effect` de `tinta.css` |

**Agregadas (páginas de Fase 2 rotas por la base).** Las primitivas nuevas son más anchas (mono en mayúsculas, tracking .1em) y
desbordan filas de la página que no tienen `flex-wrap`. Revisé si convenía arreglarlo en la primitiva y no: `Badge` debe seguir
sin partirse (es un sello; la cabecera depende de eso) y `Button` ya permite partir su texto. El defecto es la fila de la página.

| Ruta | Chequeo | Anchos | Elementos fuera de pantalla | Lote |
|---|---|---|---|---|
| `/share/[shareId]` | maqueta y sin JS | 390, 360 (Chromium y WebKit; en inglés a 390) | «Compartido por: Ana» x 235→424 y la fecha x 436→503 (fila `flex items-center gap-3` de `Badge`) | L2 |
| `/reading/[id]` | maqueta | 390, 360 (es y en) | «Hacer otra lectura» x −33→84 y «Ver historial» x 287→423 (fila `flex justify-center gap-4` de `<Link><Button/></Link>` + `ShareButton`) | L2 |
| `/reading/new (vacío)` | maqueta | 390, 360 (es y en) | «3 lecturas gratis» x −57→159 y «0 creditos disponibles» x 175→447 (`Badge` con `text-sm` en fila sin wrap) | L2 |

`DEFECTOS` queda con 14 rutas: 11 de L6/L3 que ya estaban y 3 nuevas de L2. Ninguna falla nueva cayó en archivos de la Fase 1
(cabecera, pie, primitivas, modal, cartas): no hubo nada que arreglar ahí.

### 4 · Comandos y resultados (al final, en serie, sobre `79aea26`)

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | 0 errores (9 s) |
| `npm run lint` | **0 errores**, 16 avisos, todos previos y fuera de la Fase 1 (`prisma/{add-subscriber,add-tester-credits,seed}.ts`, `scripts/generate-images.ts`, páginas `cards`, `collection`, `profile/setup`, `referral`, `settings`, `AchievementUnlockedModal`, `lib/challenges.ts`, `types/next-auth.d.ts`) |
| `DATABASE_URL=postgresql://nadie@127.0.0.1:1/ninguna DIRECT_URL=… npm test` | `check-messages: ok (1019 keys)` · **99 suites / 1,363 pruebas, todo verde** (23 s). Cuadra con los lotes: base 88/1,129 + A 2/53 + B 5/124 + C 4/57. Sigue el aviso «A worker process has failed to exit gracefully» (previo; probable `setInterval` de `src/lib/rate-limit.ts`, sin dueño) |
| `npm run build` | exit 0 (50 s). 79 rutas: 78 ƒ + `/sitemap.xml` ○. «Compiled with warnings»: sólo el aviso previo de `jose` (CompressionStream) en el Edge Runtime del middleware |
| `npm run test:e2e` (desde cero: arranca el clúster, resetea y siembra, `next build` en `.next-e2e`, `next start` :3000) | **943 ✓ · 0 ✘ · 0 inestables · 77 omitidas** (75 `fixme` de `DEFECTOS` + Google apagado + email inválido en `smoke`). 9.3 min de pruebas, 561 s con el arranque |
| `node scripts/e2e-db.mjs stop` | «cluster stopped»; **:3000 y :54329 libres** |

`npm run test:e2e` por spec y ancho:

| Spec | 1440 | 1024 | 820 | 390 | 360 | WebKit 390 |
|---|---|---|---|---|---|---|
| `auth` | 17 ✓ · 1 skip | — | — | — | — | — |
| `home` · `legal` · `reading` · `smoke` | 12 · 17 · 13 · 20 ✓ (+1 fixme) | — | — | — | — | — |
| `flujos/*` (registro 3, lectura 1, mazo propio 1, lectura de dos 1, mapa arcano 2, carta del día 2, calendario 1, historia 2) | 13 ✓ | — | — | — | — | — |
| `responsivo` | 145 ✓ · 9 | 145 ✓ · 9 | 145 ✓ · 9 | 221 ✓ · 25 (incl. `@en`) | 141 ✓ · 13 | 54 ✓ · 10 |

### 5 · Capturas

`C:/Users/guill/AppData/Local/Temp/claude/C--Users-guill-dev-arcana/ba3d8826-c8e4-418f-8b14-19f131c84e14/scratchpad/fase1/` (15 PNG,
página completa, Playwright contra el servidor e2e, `es-MX`, America/Mexico_City; script `scratchpad/capturas-fase1.mjs`):
`portada`, `login`, `dashboard` (sesión `con-historia`), `lectura-04` (`/reading/e2e-lectura-04`), `daily`, `collection`, cada una
en `-1440` y `-390`; `menu-movil-sesion-390`, `menu-movil-invitado-390` y `menu-usuario-1440` (a 1440 no existe menú móvil:
aparece en < 1024, así que va el menú de usuario abierto). La base se sostiene: papel, cabecera de tinta con la hora, pie con
el crédito de Pamela Colman Smith, primitivas nuevas y contenido viejo legible bajo el remapeo. `lectura-04-390.png` mide
423 px de ancho por el defecto de L2 de `/reading/[id]`. Las pantallas de Fase 2 que aún leen `imageUrl` piden a Wikimedia y
en las capturas reciben el PNG local de e2e (como en las pruebas).

### 6 · Para la Fase 2 y para Fable

- **Hora del día en UTC.** A las 23:19 de CDMX del 5 nov, la cabecera ya decía «vie 6 nov 2026 · 2 Tochtli». Es lo que pide
  §5.2 (`todayUtc()`, de acuerdo con `/calendar` y la carta del día), pero de noche un usuario en México ve la fecha de mañana.
  Conviene que Memo lo vea.
- **Textos sin acentos más visibles** con la cabecera en mono y el menú en Gloock grande: «Carta del Dia», «Coleccion»,
  «Desafios», «Oraculo Diario», «Iniciar sesion», «creditos» (pendiente de F1-A). Es un cambio de texto: pide el visto bueno de Memo.
- **Specs que pasan sin probar nada**: `smoke.spec.ts:264` (`nav.hidden.md\:flex`) y `home.spec.ts:112`
  (`[aria-label*="menu"]`, que en español no casa con «menú») ya no encuentran nada en la cabecera nueva. Apuntarlas a
  `header nav[aria-label]` y `button[aria-controls="menu-movil"]`.
- Deuda que sigue (gate de la Fase 3): **1,673** clases de las 17 familias en **86** archivos de `src` (regex
  `-(familia)-NNN`, sin tests ni `remapeo-paleta.css`), **0** en archivos de la Fase 1; `lime-400` 1 vez
  (`insights/SuitBars.tsx`); `imageUrl` 39 usos en 20 `.tsx`; `prose*` en 8 archivos.
- L2: `ShareButton` con `translations.shareLink`/`close`; las tres filas de `DEFECTOS` de arriba (`flex-wrap` o `buttonClasses()`).
- `BITACORA.md` no se tocó (la cierra Fable en la Fase 4 con los partes).
- Al cerrar quedaban tres `next start` ajenos a esta sesión (puertos 3456, 3466 y 4329). No los toqué.

Commits de la integración: `7e44a68`, `8c55ee1`, `66d7916` (fusiones) · `60d64b1` (handoffs) · `79aea26` (`DEFECTOS`) · este parte.

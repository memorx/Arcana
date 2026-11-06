## Parte F1-C · Pruebas e2e (rediseño «Dos tintas»)

Rama `rediseno/f1-C` (worktree `C:/Users/guill/dev/arcana-lotes/f1-C`), base `969bf7b` (`rediseno/dos-tintas`).
Sólo archivos del lote (§3 F1-C + §5.5): `scripts/e2e-db.mjs`, `.env.e2e.example`, `playwright.config.ts`, `e2e/**`,
`package.json` (scripts), `src/lib/ai/config.ts` (modo falso), `src/middleware.ts` (nombre de cookie), `next.config.ts`,
`prisma/seed.ts` (sólo la guarda), `.gitignore`, sus tests en `src/__tests__/lib/` y este parte. Sin `git push`, sin
dependencias npm nuevas (sí se instaló el navegador WebKit de Playwright) y sin tocar producción (ver «Producción
intacta», al final).

### Hecho

**1 · Guardas contra producción (§5.1), cada una con su test, antes de tocar ninguna base**

- **IA falsa** (`src/lib/ai/config.ts`, `dbce2fa`). `isAIFakeMode(env)` = `ARCANA_AI_FAKE === "1" && !VERCEL`, sin
  mirar `NODE_ENV` (el servidor e2e es un build de producción). `complete()` devuelve `fakeCompletion()` antes de
  tocar el SDK. Textos fijos en `FAKE_AI_TEXTS` (es/en), uno por función, reconocida por su system prompt:
  - lectura, diaria, seguimiento y resumen del mes: prosa;
  - síntesis del Mapa Arcano: 4 líneas + 2 que terminan en «?» (lo que espera `splitSynthesis`);
  - lectura de dos: sus 4 partes con título (lo que espera `toTextBlocks`).

  Test `src/__tests__/lib/ai-fake.test.ts` (24):
  - con `VERCEL=1` (y `NODE_ENV=production` o `development`) nunca entra al modo falso aunque `ARCANA_AI_FAKE=1`, y llama a la API;
  - sin la bandera también llama a la API;
  - con la bandera no toca la red;
  - forma e idioma de cada texto, construidos con los prompt builders reales;
  - ningún texto lleva Markdown;
  - las frases que buscan los flujos e2e existen en los textos.
- **Seed** (`prisma/seed.ts`, `0382660`). `seedWipeRefusal(env)` es pura y exige dos cosas: `ARCANA_SEED_ALLOW_WIPE=1`
  y que `DATABASE_URL` (y `DIRECT_URL`, si existe) tengan host `localhost` o `127.0.0.1`. Se comprueba antes de
  `main()`, así que un rechazo nunca abre conexión (mensaje «Seed aborted before connecting: …»), y otra vez dentro de
  `main()`, antes de los `deleteMany`. `main()` sólo corre con `require.main === module`.

  Test `seed-guard.test.ts` (14), con `@prisma/client` simulado, sin conectarse a nada:
  - rechaza las URLs de Supabase (pooler y directa) aunque lleve la bandera, sin imprimir la contraseña;
  - rechaza una local sin la bandera, un `DIRECT_URL` remoto, URLs rotas y hosts parecidos (`localhost.supabase.com`, `127.0.0.1.nip.io`);
  - acepta la local;
  - importarlo no ejecuta nada.

  Comprobado además con `tsx` real (URL local, sin la bandera): sale con código 1 y el mensaje de la guarda.
- **Cookie de sesión** (`src/middleware.ts`, `4b189cd`). `sessionCookieName(protocol)` devuelve
  `__Secure-authjs.session-token` en https y `authjs.session-token` en http. El middleware pasa
  `request.nextUrl.protocol`.

  Test `middleware-cookie.test.ts` (6): https con `NODE_ENV=production` → `__Secure-…`; http bajo build de producción
  y en desarrollo → `authjs.session-token`; con sesión en http no rebota a `/login`. El `middleware.test.ts` de antes
  sigue verde.

  Verificado en vivo: con `next start` en http, `/dashboard`, `/reading/[id]`, `/blueprint`, `/daily`, etc. dan 200 con
  la sesión del usuario e2e. Antes daban 307 a `/login`.
- **`scripts/e2e-db.mjs`** (`04cb16f`, `057dc79`, `9408b9d`). Antes de lanzar cualquier hijo:
  - lee `.env.e2e` con `util.parseEnv`;
  - exige `DATABASE_URL` y `DIRECT_URL` que casen con `/@(localhost|127\.0\.0\.1):54329\//` **y** que, parseadas, den host local y puerto 54329 (así una URL remota con `?x=@127.0.0.1:54329/` en la query no pasa);
  - exige que la base sea `arcana_e2e`;
  - exige **paridad de llaves**: cada llave de `.env`, `.env.local`, `.env.production*` y `prisma/.env` debe estar en `.env.e2e` con valor no vacío. De esos archivos sólo se leen los nombres; nunca se imprime un valor.

  Luego escribe esos valores sobre `process.env` (ganan al shell) y le pasa ese `env` explícito a cada hijo,
  revalidando las URLs antes de cada `spawn`. Los hijos de Node (`prisma`, `tsx`, `next`) se lanzan con
  `process.execPath` + su CLI, sin shell.

  Subcomandos:

  | Subcomando | Qué hace |
  |---|---|
  | `start` | `initdb` en `C:/Users/guill/dev/arcana-e2e-pg` (trust, UTF8, `--no-locale`) si no existe; se niega a usar la carpeta de datos de scoop; `pg_ctl start` en `127.0.0.1:54329` con log en `…/e2e-server.log` |
  | `reset` | `DROP DATABASE … WITH (FORCE)`, `CREATE`, `prisma db push --skip-generate`, `seed`, `seed-achievements`, `seed-challenges`, `seed-themed-spreads`, `seed-blog`, `add-slugs` y `e2e/fixtures/sembrar.ts` |
  | `serve` | `start` + `reset` + `next build` + `next start -p 3000`. Exige `ARCANA_DIST_DIR` distinto de `.next` y restaura `tsconfig.json`, porque `next build` le añade `.next-e2e/types/**/*.ts` |
  | `stop` | detiene el clúster |
  | `status` | dice si el clúster corre y contesta |
  | `check [--root dir]` | sólo las guardas |

  Test `e2e-db-guard.test.ts` (13). Ejecuta el script real con `check --root <tmp>`, sin base:
  - acepta el caso bueno sin imprimir valores de producción;
  - aborta sin `.env.e2e`;
  - aborta con `DATABASE_URL` o `DIRECT_URL` de Supabase, puerto 5432, host remoto en el puerto 54329, o URL con la trampa de la query;
  - aborta si la base no es `arcana_e2e`;
  - aborta si falta una llave de `.env` o está vacía, nombrándola sin su valor;
  - revisa también `.env.local` y `.env.production.local`;
  - el `.env.e2e.example` commiteado pasa contra los 13 nombres de llave reales de producción.

**2 · `.env.e2e.example`** (`04cb16f`, `057dc79`) completo según §5.2:
- base: `DATABASE_URL`/`DIRECT_URL` locales con `connect_timeout=60&pool_timeout=60`;
- auth: `AUTH_SECRET` = `NEXTAUTH_SECRET`, `AUTH_TRUST_HOST=true`, `NEXTAUTH_URL=http://localhost:3000`;
- Google apagado: `GOOGLE_CLIENT_ID`/`SECRET` vacíos, `NEXT_PUBLIC_GOOGLE_ENABLED=false`;
- servicios: `STRIPE_SECRET_KEY=sk_test_e2e`, `STRIPE_WEBHOOK_SECRET=whsec_e2e`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_e2e`, `RESEND_API_KEY=re_e2e`, `CRON_SECRET=e2e`;
- IA: `ARCANA_AI_FAKE=1`, `ANTHROPIC_API_KEY=sk-ant-e2e-invalid`;
- las tres llaves de Supabase que hay en el `.env` de producción, con marcadores (`http://127.0.0.1:9`);
- `ARCANA_SEED_ALLOW_WIPE=1`, `ARCANA_DIST_DIR=.next-e2e`.

`.env.e2e` real creado como copia; `.gitignore` lo excluye junto con `/.next-e2e/`, `/test-results/`,
`/playwright-report/`, `/e2e/.auth/` y `/e2e/.generado/`.

**3 · Fixtures** (`e2e/fixtures/usuarios.ts` + `sembrar.ts`, `d922615`). Contraseña única `CONTRASENA_E2E`, sólo
para esta base. Se crean con Prisma + bcryptjs desde `reset`. `sembrar.ts` tiene su propia guarda: aborta si
`DATABASE_URL` no es el clúster local.

| Usuario | Datos |
|---|---|
| `nuevo@arcana.local` (`nuevo`) | sin perfil, sin lecturas, 0 créditos, 3 lecturas gratis |
| `historia@arcana.local` (`con-historia`, Ana) | ver abajo |
| `e2e-w0…w7@arcana.local` | uno por worker: 1000 créditos, 0 gratis, perfil «Sofía Prueba Ruiz» (1992-08-21) |

`con-historia` lleva:
- perfil 1990-05-17 «Ana Lucía López»;
- 10 lecturas, todas públicas con `shareId` fijo (`e2eShare01…10`):
  - edades 2 h a 25 días, para que haya mes actual y mes anterior;
  - una Cruz Celta, una de mazo propio, y la 1 con Los Enamorados;
  - resonancias en 3; notas, un seguimiento y la forma de resonancia en la lectura 4 (30 h);
- 2 lecturas de dos (Luis, Marta) con `summary` real (`computeCompatibility` + `buildCompatibilitySummary`);
- Mapa Arcano con síntesis (hash vigente, así que no se regenera) y `shareId` `e2eMapaAna1`;
- 4 logros, 32 cartas en colección y una carta dorada (La Estrella);
- suscripción activa pagada con créditos, con la carta de hoy (La Estrella) y las de los 3 días anteriores;
- transacciones de crédito.

Los ids que no se pueden fijar (tiradas del seed) quedan en `e2e/.generado/datos.json`.

**4 · Playwright** (`playwright.config.ts`, `d922615`, `057dc79`)
- **Entorno.** `process.loadEnvFile(".env.e2e")` y luego `parseEnv` + asignación explícita, porque `loadEnvFile` no pisa el shell. Si las URLs no son locales, aborta.
- **Ejecución.** `workers: 4`, `fullyParallel`, `serviceWorkers: "block"`, `locale: "es-MX"`, `timezoneId: "America/Mexico_City"`. Tiempos de espera: 120 s por prueba, 20 s por `expect`, 60 s por navegación (ver Decisiones).
- **Reportes.** list + html + json (`test-results/resultados.json`).
- **Servidor.** `webServer` = `node scripts/e2e-db.mjs serve`, con espera de 15 min y `reuseExistingServer: false`. Sólo con `ARCANA_E2E_REUSE=1` reutiliza un `serve` propio.
- **Global setup.** Inicia sesión como el usuario sembrado: si :3000 no es el servidor e2e, no corre nada.
- **Proyectos:**

  | Proyecto | Viewport | Qué corre |
  |---|---|---|
  | `chromium-1440` | 1440×900 | todo |
  | `chromium-1024` | 1024×768 | `responsivo` |
  | `chromium-820` | 820×1180, táctil | `responsivo` |
  | `chromium-390` | 390×844, táctil | `responsivo` + el pase en inglés `@en` |
  | `chromium-360` | 360×740, táctil | `responsivo` |
  | `webkit-390` | 390×844 (iPhone 13) | sólo `@publica` |
- **Helpers** (`e2e/helpers/sesion.ts`):
  - opción `cuenta` (`"worker" | "historia" | "nuevo" | null`); el `storageState` sale de **un login por worker y por cuenta** vía el endpoint de credenciales de Auth.js, guardado en `e2e/.auth/`;
  - `x-forwarded-for` único por prueba, porque el rate limit en memoria va por IP + ruta;
  - las imágenes de `upload.wikimedia.org` se sirven con un PNG local (`e2e/fixtures/carta-e2e.png`);
  - una prueba falla si el navegador pide un host de producción (Supabase o `readarcana.com`);
  - `cerrarModales()` cierra con Escape la cadena de modales de celebración.
- **Specs viejas** (`b2255de`). `home`, `legal`, `smoke`, `auth` y `reading` siguen y ahora corren contra la base local:
  - `auth` y `reading` ya no se saltan los casos con sesión;
  - selectores que nunca casaban con la UI se corrigieron sin cambiar la intención (etiqueta «Contrasena», texto del 404, Tab hasta el botón);
  - Google se salta si está apagado en el build;
  - el email inválido queda `fixme` por un defecto real (ver Handoffs).

**5 · `e2e/responsivo.spec.ts`** (`013b6d1`)

Cubre las 36 `page.tsx` + el 404 en **46 entradas**: 16 públicas, 22 con `con-historia` y 8 estados vacíos con
`nuevo`. Corre en los 5 anchos.

| Pase | Qué comprueba |
|---|---|
| `maqueta` | status esperado; sin rebote a `/login`; sin scroll horizontal real (`scrollTo(1e5)` → `scrollX`); ningún elemento fuera de la vista salvo recortado por un ancestro (no cuentan `html` ni `body`); imágenes con `naturalWidth > 0`, forzando las lazy a eager y recorriendo la página; sin errores de consola (se ignora favicon y el propio 404 del documento 404) |
| `encabezados` | exactamente un `h1` por rol; `locator("body").ariaSnapshot()` contiene `heading … [level=1]`; ningún encabezado visible escondido del árbol |
| `movimiento reducido` (`contextOptions.reducedMotion`) | `getAnimations()` en `running` = 0, tras dar 3 s a las finitas; nada en `.revelar`/`[data-revelar]` con opacidad < 0.99 |
| `sin JS` (públicas) | hay encabezados en el HTML del servidor; ningún texto con opacidad efectiva < 0.1; sin scroll ni desbordes |
| `en inglés` (`@en`) | `maqueta` y `encabezados` a 390 |

Total: **926 pruebas**. Los defectos de hoy están en `DEFECTOS`:
- como `test.fixme` por chequeo, ancho, idioma y motor, con el lote dueño;
- los errores de consola conocidos se filtran y se anotan, para que el resto de la maqueta de esa página siga vigilada;
- una llave mal escrita en `DEFECTOS` rompe la carga del archivo.

**6 · Flujos** (`e2e/flujos/*.spec.ts`, `e560519`). Selectores por rol y texto accesible (es/en). Los que mutan van en
`test.describe.serial` con el usuario del worker. Corren a 1440.

| Spec | Flujo |
|---|---|
| `registro` | cuenta nueva → dashboard «Hola, Lucía» → cerrar sesión desde el menú de usuario → `/dashboard` rebota a `/login` → iniciar sesión con `callbackUrl=/history` → `/login` manda al dashboard → cerrar sesión; contraseña equivocada → «Credenciales invalidas» |
| `lectura` | Tirada de Tres Cartas → intención (< 10 caracteres deshabilita) → barajar → revelar las 3 (hoy `div` «Toca»; acepta también el futuro `<button>` «Revelar…») → modales → «Ver interpretación» → texto falso → lectura guardada → aparece en el historial |
| `mazo-propio` | tirada → buscador + «Elegir El Loco / La Estrella / La Luna» → Presente invertida → intención → `/reading/[id]` «Con tu mazo» + texto falso |
| `lectura-de-dos` | Luis 1988-11-02 → `/compatibility/[id]` «Sofía y Luis», «Cómo se encuentran», medidores, −2 créditos exactos, listada de vuelta |
| `mapa-arcano` | «Generar mi síntesis» → texto falso + «Preguntas para tu año» + las 2 preguntas → compartir → crear enlace → un invitado ve `/share/blueprint/<id>`; y `con-historia` ve la síntesis guardada sin el botón |
| `carta-del-dia` | `con-historia` ve «Tu Carta Diaria», La Estrella y el texto falso; el worker se suscribe con créditos y la página espera la primera carta |
| `calendario` | `page.clock.setFixedTime(2026-11-05T12:00-06:00)`; desde el «hoy» del servidor llega con PageUp/PageDown y flechas al 5 nov 2026 → «1 Mázatl», Tláloc; → 6 nov «2 Tochtli»; ← vuelve; ↓ 12 nov; ↑ vuelve |
| `historia` | 10 enlaces de lectura; abre «etapa de mudanza» con su seguimiento y la pregunta de resonancia; en insights, las 5 secciones y el selector de mes con «Escribir mi mes» (no se pulsa: la cuenta es compartida) |

**7 · `next.config.ts`** (`afedb8d`). `distDir: process.env.ARCANA_DIST_DIR || ".next"`. Se quitó
`images.remotePatterns` de Wikimedia y el `runtimeCaching` de `upload.wikimedia.org`. Queda la regla `api-cache`,
y `next-pwa` sigue igual para producción. Hoy no se rompe nada: todo `<Image>` de Wikimedia lleva `unoptimized`, y
el blog no tiene portadas.

**8 · `package.json`** (`04cb16f`). Scripts nuevos:
- `e2e:db` (`node scripts/e2e-db.mjs`);
- `test:e2e` (`playwright test --config playwright.config.ts`);
- `test:e2e:responsivo`.

Además, `lint` ignora `.next-e2e/**`. `npx playwright install webkit` se hizo bien (WebKit 26.0, build 2227).

### Falso o ya hecho

- `page.accessibility.snapshot()` ya no existe en Playwright 1.57. Lo sustituye `locator("body").ariaSnapshot()`, que da el mismo árbol en YAML.
- `reducedMotion` no es una opción de `test.use`. Se pasa por `contextOptions: { reducedMotion: "reduce" }`.
- El archivo de la síntesis es `src/components/blueprint/synthesis-blocks.ts`, no `src/lib/ai/`. El contrato (4 + 2 «?») es el mismo.
- §3 decía que el modo falso dependía de `NODE_ENV`; §5.1 manda `!VERCEL`, y así quedó.
- El calendario toma «hoy» de `todayUtc()` en el **servidor**, así que `page.clock` no lo mueve. El flujo fija el reloj del navegador y llega al 5 nov con el teclado desde el hoy del servidor: no depende de la fecha en que corra.
- La carta del día no tiene botón: la saca el cron. Por eso el flujo usa la carta sembrada para `con-historia` y, para el worker, suscribirse con créditos.

### Handoffs

- **Integrador · `eslint.config.mjs`**: añadir `".next-e2e/**"` a `ignores`. Mientras, el script `lint` lleva `--ignore-pattern ".next-e2e/**"`; cuando esté en la config, se puede quitar.
- **Integrador · `tsconfig.json`**: `next build` con `distDir=.next-e2e` añade `.next-e2e/types/**/*.ts` a `include`, y `e2e-db.mjs` lo restaura al terminar el build. Si se prefiere tenerlo fijo, se añade a mano y la restauración no hace nada.
- **Sin dueño · `src/app/api/auth/register`**: no valida el formato del email; `{email:"invalid"}` crea la cuenta (200). Prueba en `fixme` en `smoke.spec.ts` («register rejects an invalid email format»).
- **F1-A**:
  - la cabecera de invitado se sale a 360 (ver tabla);
  - el flujo de registro busca el menú de usuario por `/men[uú] de usuario|user menu/` y la salida por `/cerrar sesi[oó]n|sign out/`: hay que conservar nombres accesibles parecidos;
  - `Modal` debe seguir cerrando con Escape (lo usa `cerrarModales`) y conviene darle `aria-labelledby` (§5.7).
- **F1-B**:
  - mientras las cartas sigan en Wikimedia, e2e sirve una imagen local; con `cartaImagen()` esa ruta deja de usarse sola;
  - los brillos de carta dorada son infinitos con movimiento reducido (ver tabla).
- **L2**:
  - el flujo de lectura acepta la carta boca abajo como `<button>` con nombre `/revela|voltea|reveal|flip/`;
  - el progreso «N de 3 cartas reveladas» y el botón «Ver interpretación» son los anclajes;
  - si cambian, que conserven el texto accesible.
- **L3**: `LevelWidget` enlaza a `/progress`, que no existe (prefetch 404 en consola del dashboard).
- **Todos los lotes de Fase 2**:
  - corran `npm run test:e2e:responsivo` (o con `--grep "<ruta>"`) sobre sus pantallas;
  - al arreglar un defecto, borren su entrada de `DEFECTOS` (si no, `fixme` lo esconde);
  - el integrador revisa que `DEFECTOS` quede vacío.

**Defectos reales de la UI de hoy** (todos `test.fixme`, salvo el de consola, que es filtro anotado):

| Ruta | Chequeo | Anchos | Defecto | Lote |
|---|---|---|---|---|
| `/`, `/blog`, `/blog/[slug]`, `/cards`, `/cards/[slug]`, `/calendar` (invitado) | maqueta | 360 | Cabecera de invitado: idioma + «Iniciar sesion» + «Registrarse» se salen (div.flex.items-center.gap-3, x 94→370 de 360) | F1-A |
| `/` | movimiento reducido | todos + WebKit | Tres orbes con `animation: float` infinita ignoran `prefers-reduced-motion` | L1 |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | encabezados | todos, es y en, WebKit | Sin `h1` (el título es el h3 de `CardTitle`) | L6 |
| `/about`, `/privacy`, `/terms` | encabezados | todos, es y en, WebKit | Sin `h1` (títulos en h3) | L6 |
| `/blog/[slug]` | encabezados | todos, es y en, WebKit | Dos `h1`: el de la cabecera y el «# » inicial del contenido | L6 |
| `/subscribe/success` sin `session_id` | encabezados | todos, es y en | Sin `h1` | L6 |
| `/dashboard` (con historia y vacío) | consola (filtro anotado) | todos, es y en | `LevelWidget` → `/progress` inexistente, 404 en el prefetch | L3 |
| `/collection` | movimiento reducido | todos | `golden-glow-collection` y `golden-shimmer-sweep-collection` infinitas con movimiento reducido | L5 / F1-B |

Nada falló en el pase **sin JS**: no hay texto invisible sin JavaScript en las públicas de hoy. Tampoco hubo scroll
horizontal ni imágenes rotas en ningún ancho, salvo la cabecera a 360.

### Decisiones

- **`webServer` = `e2e-db.mjs serve`** en vez de la cadena `start && reset && next build && next start`. Así el build y el `next start` también pasan por la guarda y reciben el env explícito. El orden se respeta: base arriba y sembrada antes del build (el sitemap la consulta).
- **No reutilizar :3000.** Ahí podría haber un `next dev` con el `.env` de producción. `ARCANA_E2E_REUSE=1` existe para iterar, y el global setup frena cualquier servidor que no tenga al usuario sembrado.
- **Login por API para el `storageState`**, una vez por worker y por cuenta. El login por la UI se prueba en el flujo de registro y no ata la sesión al diseño de la pantalla de login.
- **Imágenes de Wikimedia servidas localmente** en las pruebas: evita el 429 de Wikimedia y la red. El 404 real de Los Enamorados lo resuelve F1-B con cartas propias.
- **«Recortado por un ancestro».** Cuenta `overflow-x` `hidden`, `clip`, `auto` o `scroll`; un carrusel también contiene su contenido. Nunca cuentan `html` ni `body`, porque un `overflow-x:hidden` en el body taparía todo.
- **Pase sin JS.** Exige encabezados presentes y texto visible; cuántos `h1` hay es asunto del chequeo `encabezados`, para no contar dos veces el mismo defecto.
- **Error de consola conocido.** Se filtra y anota en vez de poner `fixme` a toda la maqueta del dashboard: así el resto de la página sigue vigilada.
- **Paridad estricta.** Una llave de producción vacía en `.env.e2e` también aborta, porque un valor vacío podría recaer en el `.env`.
- **Tiempos de espera holgados.** En esta máquina crear un proceso tardó 10–11 s (medido: `node -e 1` = 11.5 s, `psql --version` = 10.5 s). Postgres en Windows abre un proceso por conexión, así que una conexión nueva tardaba 15–31 s, y el `connect_timeout` de 5 s de Prisma daba P1001 intermitente. Por eso: `connect_timeout=60&pool_timeout=60`, `pg_isready -t 60`, y Playwright con 120 s por prueba, 20 s por `expect` y 60 s por navegación.
- **Créditos exactos** sólo se comparan donde no hay recompensas: lectura de dos, −2. En la tirada y el mazo propio, el logro «Primera lectura» devuelve 1 crédito.
- **`con-historia` es de sólo lectura** (pase responsivo e historial). Lo que escribe usa el usuario de su worker, y la base se recrea en cada corrida.

### Pendientes

- **`BITACORA.md`** no se tocó: no es archivo del lote y lo cierra Fable en la Fase 4 con este parte.
- **Iteración rápida.** Cada corrida completa hace reset + build (≈ 10 min de arranque en esta máquina). Para iterar: deja `ARCANA_E2E_SKIP_BUILD=1 node scripts/e2e-db.mjs serve` corriendo en otra terminal y corre `ARCANA_E2E_REUSE=1 npx playwright test …`.
- **Aviso de Jest.** Sale «A worker process has failed to exit gracefully» al final de `npm test`. No lo meten los tests de este lote; lo más probable es que venga del `setInterval` sin `unref` de `src/lib/rate-limit.ts` (sin dueño).

### Comandos y resultados (5–6 nov 2026, esta máquina)

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | 0 errores |
| `npm run lint` | 0 errores, 18 advertencias (todas ya existían; ninguna en archivos nuevos de este lote) |
| `DATABASE_URL=postgresql://nadie@127.0.0.1:1/ninguna DIRECT_URL=… npm test` | `check-messages` ok (996 llaves), **92 suites / 1186 tests verdes** (base 88 / 1129; las 4 suites nuevas, con 57 tests, son de este lote). La URL muerta impide que Jest (que carga el `.env` de producción vía `next/jest`) alcance cualquier base |
| `node scripts/e2e-db.mjs check` | «guards OK … 21 keys in .env.e2e cover the inheritable env files» |
| `tsx prisma/seed.ts` con URL local y sin `ARCANA_SEED_ALLOW_WIPE` | exit 1, «Seed aborted before connecting: ARCANA_SEED_ALLOW_WIPE=1 is not set…» |
| `node scripts/e2e-db.mjs stop` y luego **`npm run test:e2e`** (desde cero: clúster apagado; arranca, resetea, siembra, `next build` y `next start`) | **939 pasan, 0 fallan, 0 inestables, 81 omitidas** (80 `fixme` de defectos reales + 1 skip de Google apagado); 16.3 min de pruebas más el arranque |
| `node scripts/e2e-db.mjs stop` | clúster detenido; :3000 y :54329 libres |

Resultado de `npm run test:e2e` por spec y ancho:

| Spec | chromium-1440 | chromium-1024 | chromium-820 | chromium-390 | chromium-360 | webkit-390 |
|---|---|---|---|---|---|---|
| `auth.spec.ts` | 17 ✓ · 1 skip (Google) | — | — | — | — | — |
| `home.spec.ts` | 12 ✓ | — | — | — | — | — |
| `legal.spec.ts` | 17 ✓ | — | — | — | — | — |
| `reading.spec.ts` | 13 ✓ | — | — | — | — | — |
| `smoke.spec.ts` | 20 ✓ · 1 fixme (email) | — | — | — | — | — |
| `flujos/registro.spec.ts` | 3 ✓ | — | — | — | — | — |
| `flujos/lectura.spec.ts` | 1 ✓ | — | — | — | — | — |
| `flujos/mazo-propio.spec.ts` | 1 ✓ | — | — | — | — | — |
| `flujos/lectura-de-dos.spec.ts` | 1 ✓ | — | — | — | — | — |
| `flujos/mapa-arcano.spec.ts` | 2 ✓ | — | — | — | — | — |
| `flujos/carta-del-dia.spec.ts` | 2 ✓ | — | — | — | — | — |
| `flujos/calendario.spec.ts` | 1 ✓ | — | — | — | — | — |
| `flujos/historia.spec.ts` | 2 ✓ | — | — | — | — | — |
| `responsivo.spec.ts` | 143 ✓ · 11 fixme | 143 ✓ · 11 fixme | 143 ✓ · 11 fixme | 226 ✓ · 20 fixme (incluye `@en`) | 137 ✓ · 17 fixme | 55 ✓ · 9 fixme |

Antes de anotar `DEFECTOS`, el pase completo sin `fixme` dio 92 fallos: 13/13/13/24/19 en Chromium y 10 en WebKit.
Todos fueron los defectos de la tabla de Handoffs y uno del arnés: WebKit emite el 404 del documento antes de que
cambie `page.url()`, y se corrigió comparando contra la ruta. No hubo pruebas inestables.

### Producción intacta

- **Guardas.** Todo comando que tocó una base pasó por `e2e-db.mjs`: guardas, env explícito y URLs revalidadas antes de cada `spawn`. La única excepción fue `psql` a mano contra `127.0.0.1:54329`. La verificación de la guarda del seed se hizo con `DATABASE_URL`/`DIRECT_URL` locales en la misma línea.
- **Prisma CLI.** Dice «Environment variables loaded from .env», pero su datasource es `PostgreSQL database "arcana_e2e" … at "127.0.0.1:54329"` (una sola línea `Datasource` en la corrida final). Las variables del proceso ganan al `.env`.
- **Logs.** En los de esta sesión no aparece `supabase`, `pooler` ni `www.readarcana.com`. Revisados: `e2e-final.log` (incluye la salida `[WebServer]`), reset, serve, Jest, lint y la salida de las corridas de Playwright. En los JSON de Playwright, `supabase` aparece sólo como el nombre de las llaves marcador del env del webServer (`http://127.0.0.1:9`). El log del Postgres local tampoco lo menciona.
- **Navegador.** El único host externo que pidió fue `upload.wikimedia.org` (232 pruebas), y esas peticiones se contestaron en local con `route.fulfill`. La comprobación de hosts de producción no saltó nunca.
- **Otros servicios.** Ni Resend ni Stripe recibieron llamadas en la corrida final; no hay errores suyos en el log.

### Rutas cubiertas por `responsivo.spec.ts` (46 entradas × 5 anchos)

- **Públicas** (`@publica`: también sin JS y en WebKit 390). Son 16:
  - `/`, `/login`, `/register`, `/forgot-password`, `/reset-password` (sin token);
  - `/about`, `/privacy`, `/terms`;
  - `/blog`, `/blog/beginners-guide-tarot-interpretation`, `/cards`, `/cards/the-fool`, `/calendar`;
  - `/share/e2eShare04`, `/share/blueprint/e2eMapaAna1`;
  - `/esta-carta-no-existe` (404 esperado).
- **Con `con-historia`.** Son 22:
  - `/dashboard`, `/reading/new`, `/reading/new/<id de Three Card Spread>`, `/reading/manual`, `/reading/e2e-lectura-04`;
  - `/history`, `/history/insights`, `/daily`, `/calendar` (con sesión);
  - `/blueprint`, `/compatibility`, `/compatibility/e2e-compat-01`, `/profile/setup`;
  - `/collection`, `/achievements`, `/challenges`;
  - `/credits`, `/credits/success` (sin `session_id`), `/subscribe`, `/subscribe/success` (sin `session_id`), `/referral`, `/settings`.
- **Con `nuevo`** (estados vacíos). Son 8: `/dashboard`, `/reading/new`, `/history`, `/history/insights`, `/daily`, `/blueprint`, `/compatibility`, `/collection`.

Así quedan las 36 `src/app/**/page.tsx` más la página 404.

### Cómo correr todo desde cero

```bash
# Una vez: dependencias, navegadores y el env local (gitignored)
npm ci
npx playwright install chromium webkit
cp .env.e2e.example .env.e2e
# Requiere PostgreSQL en C:/Users/guill/scoop/apps/postgresql/current/bin (o ARCANA_PG_BIN=<carpeta bin>).

# Todo: arranca el clúster si hace falta, resetea y siembra arcana_e2e, build en .next-e2e,
# next start :3000, 1020 pruebas (Chromium 5 anchos + WebKit 390). Postgres queda arriba al final.
npm run test:e2e
npm run test:e2e:responsivo                                 # sólo la red responsiva
npx playwright test --project=chromium-390 --grep "/daily"  # una ruta en un ancho
npx playwright show-report                                  # reporte HTML

# La base a mano
npm run e2e:db -- start | reset | status | stop | check

# Iterar sin rehacer base ni build (otra terminal deja el servidor arriba)
ARCANA_E2E_SKIP_BUILD=1 node scripts/e2e-db.mjs serve
ARCANA_E2E_REUSE=1 npx playwright test e2e/flujos

# Al terminar
npm run e2e:db -- stop
```

Los lotes de la Fase 2 sólo necesitan `npm run test:e2e:responsivo`. Cuando una pantalla quede bien, borran su
entrada de `DEFECTOS` en `e2e/responsivo.spec.ts`.


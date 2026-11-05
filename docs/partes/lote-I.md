## Parte Lote I (Integrador, F-80…F-91)

Rama `capataz/2026-11-04`, árbol principal. Base de la integración: `2c6d52c` (revisión de Fable). Sin push, sin `prisma db push/migrate`, sin scripts que escriban en la base.

### Hechas

- **F-80 Fusión.** `git merge --no-ff` de `capataz/lote-B`, `lote-C`, `lote-D`, `lote-E` y `lote-F`, en ese orden (`f2b27f9`, `de47077`, `16674d0`, `dac54dd`, `6e57a61`). Ningún `npm-ci.log` versionado. `npx prisma generate` corrido después. Nuevo `scripts/check-messages.ts` (falla si un JSON no parsea o si una llave existe sólo en un idioma) como `"pretest": "tsx scripts/check-messages.ts"`; probado en verde y forzando una llave de más y una de menos (sale 1 y lista ambas). · `d25c1cf`
- **F-81 Navegación.** `src/components/layout/Header.tsx`: escritorio con sesión = Mi espacio · Nueva lectura · Carta diaria · Calendario · Historial (Carta diaria y Calendario desde `lg`; ver Decisiones). Menú de usuario: Calendario, Mi Mapa Arcano, Mi historia y Lectura de dos junto a los existentes. Invitados: Calendario en la barra de escritorio. Llaves `nav.blueprint/calendar/insights/compatibility` en en/es con los textos de la ficha. `src/middleware.ts`: `/blueprint`, `/compatibility`, `/history/insights` y `/reading/manual` en `protectedRoutes`; `/blueprint/:path*` y `/compatibility/:path*` en el matcher; `/share/blueprint/*` y `/calendar` siguen públicas. Tests nuevos: `src/__tests__/components/Header.test.tsx` (orden de la barra, enlaces del menú, invitado) y `src/__tests__/lib/middleware.test.ts` (redirige a login con `callbackUrl` en las 4 rutas nuevas, deja pasar con sesión y no toca `/calendar` ni `/share/blueprint/…`). Los dos fallan sin el cambio (6 de 12). · `977e112`
- **F-82 Dashboard.** `src/app/(main)/dashboard/page.tsx`: `BirthdayBanner` arriba de todo; fila `grid gap-4 md:grid-cols-2` con `TodayEnergiesWidget` y `BlueprintWidget` bajo la racha; `InsightsWidget` en una fila de dos columnas con `ChallengesWidget`; sección "Explora" con tarjetas a `/calendar`, `/compatibility`, `/reading/manual` y `/blueprint` que reutilizan los textos de la landing (`pulse.moreThanTarot.*`). Única llave nueva: `dashboard.explore.title` ("Explore" / "Explora"). Test nuevo `src/__tests__/app/dashboard-page.test.tsx` (posición, props `userId` y los cuatro enlaces); falla 4 de 4 sin el cambio. · `5b3ac4e`
- **F-83 Página de lectura.** El comentario marcador de `reading/[id]/page.tsx` se reemplazó por `<ResonanceCheck readingId createdAt={reading.createdAt.toISOString()} resonance resonanceNote locale />`. Dos tests nuevos en `ReadingPageLoteE.test.tsx`: una calificación guardada aparece entre la interpretación y las notas; una lectura sin calificar de hace 3 días muestra las estrellas. Ver Decisiones (fixture del Lote E). · `63607c6`
- **Handoff Lote E/D (memoria en la tirada con mazo propio).** `src/app/api/reading/manual/route.ts` calcula `buildHistoryContext(user.id, locale)` en try/catch, igual que `/api/reading`, y lo pasa como `history` junto a `source: "manual"`. Tests: la memoria llega a la IA; si falla, 200 sin memoria. · `d16e836`
- **Handoff Lote D (`@types/react-dom`).** Instalado `@types/react-dom@~19.2.3` (resuelve 19.2.7, peer `@types/react ^19.2.0`, igual que el 19.2.7 instalado). Quitado el `// @ts-expect-error` de `ResonanceCheck.server.test.tsx`; tsc limpio. · `0747e6b`
- **Handoff Lote B (`globals.css`).** `scroll-behavior: smooth` dentro de `@media (prefers-reduced-motion: no-preference)`. · `3ff6a59`
- **F-87 XP de racha.** `finalizeReading` lee `lastReadingDate` antes de `updateStreak` y decide `isNewStreakDay` con ese valor. Tests: ayer + racha 2 → `STREAK_DAY` incluido; mismo día → no; día uno → no. El mock de `updateStreak` escribe "ahora" como el real, así que el caso de ayer falla con el orden viejo (verificado). · `780e807`
- **F-88 Script con modelo viejo.** `prisma/send-daily-reading.ts` usa `generateDailyInterpretation` de `@/lib/anthropic`; `import "dotenv/config"` va primero para que `ARCANA_MODEL_*` se lea antes de cargar la config de IA. Comprobé con `tsx` que el alias `@/` resuelve desde `prisma/`. No lo corrí (lee producción y manda correo). `grep "claude-"` fuera de `src/lib/ai/config.ts`: vacío. · `6d71de9`
- **F-89 Imports sin usar.** Fuera `TarotCard`, `useRouter` y `router` de `reading/new/[spreadTypeId]/page.tsx`. El `dailyReading` del cron ya no existía tras la reescritura del Lote C. · `8be1265`
- **F-90 Presupuesto de tiempo.** `src/lib/ai/config.ts`: cliente con `timeout: 45_000, maxRetries: 0`; `complete({ timeoutMs })` → `create(params, { timeout })` (por defecto 45 s); un solo reintento, tras 500 ms, si el primer intento falló en menos de 5 s con `APIConnectionError` o `APIError` 408/409/429/5xx; nunca tras `APIConnectionTimeoutError`. Las lecturas siguen en 45 s; `generateDailyInterpretation` acepta `timeoutMs` y el cron diario pasa 15 s por persona. Tests en `ai-config.test.ts`: 529 rápido se reintenta una vez; el segundo fallo se rinde; 429/500/408/409 y error de conexión se reintentan; timeout, fallo lento (≥ 5 s), 400, 401 y error plano no; `timeoutMs` llega al SDK. Además: `anthropic.test.ts` comprueba 45 s en lecturas y 15 s cuando se pide; `cron-daily-readings.test.ts` comprueba `timeoutMs: 15_000`. Los mocks del SDK exponen ahora las clases de error reales. Sin el cambio fallan 11 tests. · `c7e06e1`
- **F-91 Aserciones.** `cron-auth.test.ts` envuelve `timingSafeEqual` (`jest.requireActual("node:crypto")`) y verifica dos buffers de 32 bytes con el token correcto, uno más corto, uno más largo y sin cabecera; si en lugar de los digests sha256 se compara con relleno al mismo largo, fallan 5. `TarotCard.test.tsx`: el test `locale="en"` afirma `getByAltText("The Fool")`. · `b32e35d`
- **F-84 Compuertas.** Todas en verde (tabla abajo). Para llegar a verde en Playwright actualicé las specs públicas: estaban rojas desde antes de esta ronda (ver Decisiones). · `3277e6a`
- **F-85 Commits.** Uno por paso y fusiones aparte (lista abajo). **F-86** es este parte.

### Conflictos de la fusión y cómo se resolvieron

- **Únicos archivos en conflicto: `messages/en.json` y `messages/es.json`**, en las fusiones de C, D, E y F (B entró limpio). Ningún otro archivo chocó.
- Los resolví con una fusión de tres vías **a nivel de llaves JSON** (base/ours/theirs), no de texto. Si sólo un lado cambió una llave, gana ese lado; si los dos agregaron llaves, se conservan todas; si los dos cambiaron la misma hoja, el script se detiene (no pasó ni una vez). Las llaves nuevas se agregan al final, en el orden de la fusión.
- Comprobé en cada fusión que todas las hojas de los dos lados siguen presentes. Las únicas que no vienen del lote son las de `ours`, que son más nuevas:
  - `reading.interpretationUnavailable` y `reading.interpretationRefused`: textos que Fable suavizó en `e1e56cc` después de abrir los worktrees.
  - `profile.continue` = «Continuar a suscripción»: la corrección N4 del Lote B, que los lotes C–F tenían con la ortografía vieja.
- Resultado: **996 llaves en en y en es, 0 de un solo lado**, con los namespaces nuevos al final en este orden: `blueprint`, `birthday`, `pulse`, `calendar`, `energies`, `insights`, `resonance`, `manual`, `followUp`, `readAloud`, `compatibility`. Además, `nav` ganó 4 llaves (F-81) y `dashboard` 1 (F-82).

### Rutas nuevas (lista final, según `npm run build`)

| Tipo | Ruta | Acceso |
|---|---|---|
| Página | `/blueprint` | privada (middleware + `redirect`) |
| Página | `/calendar` | pública |
| Página | `/compatibility`, `/compatibility/[id]` | privada |
| Página | `/history/insights` | privada |
| Página | `/reading/manual` | privada |
| Página | `/share/blueprint/[shareId]` | pública, `noindex`, 404 si no existe |
| API | `/api/blueprint` (GET), `/api/blueprint/synthesis` (POST), `/api/blueprint/share` (POST/DELETE) | sesión |
| API | `/api/calendar` (GET) | pública (devuelve `birthDate` sólo con sesión) |
| API | `/api/pulse` (GET) | pública, `s-maxage=600` |
| API | `/api/compatibility` (GET/POST), `/api/compatibility/[id]` (GET) | sesión |
| API | `/api/insights` (GET), `/api/insights/recap` (POST) | sesión |
| API | `/api/reading/manual` (POST) | sesión |
| API | `/api/readings/[id]/followup` (GET/POST), `/api/readings/[id]/resonance` (POST) | sesión |

Comprobado en `next start` local: `/` y `/calendar` responden 200; `/blueprint`, `/compatibility`, `/history/insights` y `/reading/manual` sin sesión → 307 a `/login?callbackUrl=…`; `/share/blueprint/<inexistente>` → 404; `/api/pulse` → 200.

### Falsas o ya hechas

- **F-89, cron diario:** el `dailyReading` sin usar ya no estaba (`src/app/api/cron/daily-readings/route.ts` tras la reescritura del Lote C, `b0ce31a`); `eslint` no da aviso en ese archivo.
- **F-81, matcher:** `/history/insights` y `/reading/manual` ya los cubrían `/history/:path*` y `/reading/:path*` en el matcher; quedaron explícitos en `protectedRoutes` y con un comentario en el matcher, sin duplicar patrones.

### Bloqueadas / handoffs

- Ninguna.

### Decisiones tomadas (con motivo)

1. **Barra de escritorio:** Carta diaria y Calendario aparecen desde `lg` (≥ 1024 px). Entre 768 y 1023 px, cinco enlaces más créditos, avatar, sonido e idioma no caben en la barra; en ese ancho los dos están en el menú de usuario. El orden en `lg` es el de la ficha.
2. **Calendario para invitados:** está en la barra de escritorio. En móvil no cabe en la cabecera de invitado, que a 360 px ya lleva logo, sonido, idioma, "Iniciar sesión" y "Registrarse". En móvil se llega por la sección "Más que tarot" de la landing.
3. **"Explora" en el dashboard:** reutiliza los textos y los iconos de la landing (`pulse.moreThanTarot.*`) para que las dos superficies digan lo mismo. Sólo agregué `dashboard.explore.title`; el subtítulo es `pulse.moreThanTarot.subtitle`.
4. **`InsightsWidget` "junto a los retos":** va en una fila de dos columnas (`md:grid-cols-2`), igual que energías y Mapa Arcano.
5. **Fixture del Lote E (`ReadingPageLoteE.test.tsx`):** ahora lleva `resonance: null` y `resonanceNote: null`, como devuelve Prisma, y `createdAt: new Date()`.
   - Sin ese cambio, `resonance` llegaba `undefined` y `ResonanceCheck` (que compara `!== null`) mostraba un resultado inventado.
   - Con la fecha fija del 5 nov, desde el 6 nov aparecería la pregunta de resonancia y chocaría con `getByText("title")` del chat.
   - La intención de los tests del Lote E no cambia.
6. **F-87:** si la lectura previa de `lastReadingDate` falla, no hay bono. Así se evita un bono doble.
7. **F-90:** pausa de 500 ms antes del único reintento, para darle un respiro a un 429/529. El peor caso queda en 5 s + 0.5 s + 45 s = 50.5 s, por debajo de los 60 s de `maxDuration`. Un test fija que 5 s + 45 s < 60 s.
8. **Specs e2e públicas (F-84).** Con el código de esta ronda fallaban **9 de 49** con el navegador en `en-US` y **9 de 49** (otras) en `es-MX`. Son pruebas viejas, no regresiones: desde `6c8ae84` no cambió ningún archivo de `e2e/`, `src/i18n`, páginas de auth, footer ni `LanguageSelector`, y ninguna colisión involucra elementos nuevos. Las causas:
   - El navegador manda `Accept-Language` y la app lo sigue, pero varias regex sólo aceptan español.
   - Las pruebas buscan UI que no existe: un enlace "Inicio", "Todos los derechos reservados" en el footer, opciones de idioma con `role="menuitem"` y el botón de Google sin `NEXT_PUBLIC_GOOGLE_ENABLED`.
   - Hay selectores ambiguos: un encabezado del FAQ que también empieza con "Como funciona", la cabecera con otro botón "Iniciar sesion" y los títulos de sección de Términos.
   - Las ajusté conservando la intención (detalle en el commit `3277e6a`):
     - `home` y `smoke` fijan `es-MX`, el idioma para el que se escribieron.
     - El cambio de idioma ahora prueba de verdad: hace clic en EN y comprueba el héroe en inglés. Antes se saltaba en silencio.
     - Google sólo se exige si la variable está activa.
     - El mensaje de credenciales inválidas tiene 15 s de margen. Lo verifiqué a mano: aparece en unos 2 s.
     - El localizador `desktopNav`, declarado y nunca usado, ahora afirma que la barra de escritorio se oculta en móvil.
9. **`next start` local necesita `AUTH_TRUST_HOST=true`.** Sin la variable, `/api/auth/session` da 500 (`UntrustedHost`). Vercel la confía sola. Para Playwright levanté el servidor con esa variable; no toqué el código.
10. No incluí en ningún commit `docs/REVISION-2026-11-04.md`, que Fable editaba en paralelo (Node 24 en Vercel, Fluid Compute). Queda modificado en el árbol de trabajo para que Fable lo commitee.

### PENDIENTES (decisión del dueño del producto o de Fable)

- **Tiempo de las funciones con effort `medium`:** el tope por llamada bajó de 50 s a 45 s para todas, también síntesis del Mapa Arcano, lectura de dos, recap y seguimiento (2500–4000 tokens). Fable midió las lecturas (≤ 35 s con effort low), pero estas no. Si alguna pasa de 45 s, la respuesta es 503 sin cobro. Conviene medirlas en el preview.
- **Cron diario:** con 15 s por persona y `maxDuration = 60`, el envío sigue siendo secuencial; con varios suscriptores lentos el cron puede no terminar. Es el mismo pendiente #2 de la revisión (un cron al día en Hobby).
- **Login (observación, no se cambió):** `authorize` lanza `Error("Credenciales inválidas")`, así que Auth.js registra un `CallbackRouteError` y responde `?error=Configuration` en cada contraseña equivocada. La UI muestra bien "Credenciales inválidas", pero el log se llena de errores. Lanzar `CredentialsSignin` lo dejaría limpio. Va para otra ronda.
- **`test-results/`** (salida de Playwright) no está en `.gitignore`. Lo borré tras las corridas; agregarlo es decisión de quien mantenga el repo.
- **Avisos de lint heredados:** quedan 18, todos de la lista del Lote 0 y ninguno en archivos que toqué. Detalle: `prisma/add-subscriber.ts:33,53`, `prisma/add-tester-credits.ts:17`, `prisma/seed.ts:1`, `scripts/generate-images.ts:2`, `cards/page.tsx:7`, `collection/page.tsx:7`, `profile/setup/page.tsx:13,144`, `referral/page.tsx:6,15`, `settings/page.tsx:67,73`, `AchievementUnlockedModal.tsx:53`, `NumberTicker.tsx:19`, `ShareButton.tsx:33`, `challenges.ts:230` y `next-auth.d.ts:2`.
- **e2e que no corrí, por regla:** `auth.spec.ts` y `reading.spec.ts`, que escriben en la base. Corrí sólo `chromium`; firefox, webkit y los proyectos móviles no.
- **Bitácora:** queda para la Fase 4 (Fable), como dice el plan.

### Comandos corridos al final y su resultado (HEAD `3277e6a`)

| Compuerta | Comando | Resultado |
|---|---|---|
| Prisma | `npx prisma generate` | ok |
| Mensajes | `npx tsx scripts/check-messages.ts` (pretest) | ok, 996 llaves en en y es |
| Tipos | `npx tsc --noEmit` | exit 0, 0 errores |
| Lint | `npm run lint` | exit 0: **0 errores**, 18 avisos heredados (23 al cerrar la Fase 1) |
| Unit | `npm test` (= pretest + `jest`) | **88/88 suites, 1120/1120 tests** verdes, ~15 s |
| Build | `npm run build` | exit 0, compilado en 18 s, 63 páginas estáticas, JS compartido 103 kB; `/blueprint` 144 kB, `/calendar` 158 kB, `/compatibility` 185 kB, `/history/insights` 184 kB, `/reading/manual` 189 kB, `/dashboard` 141 kB, `/reading/[id]` 146 kB |
| E2E | `npx playwright test e2e/home.spec.ts e2e/legal.spec.ts e2e/smoke.spec.ts --project=chromium` contra `next start` (`AUTH_TRUST_HOST=true`) | **49/49** (antes del ajuste de specs: 40/49) |

### Commits (rama `capataz/2026-11-04`, sin push)

```
3277e6a test(e2e): bring the public specs up to date with the current UI (F-84)
b32e35d test: assert what the cron auth compares and the English card name (F-91)
c7e06e1 fix(ai): fit every AI call inside Vercel's 60 s (F-90)
8be1265 chore(lint): drop unused imports in the spread page (F-89)
6d71de9 fix(scripts): daily-reading script uses the app's daily interpretation (F-88)
780e807 fix(xp): award the streak-day XP that was never granted (F-87)
3ff6a59 fix(a11y): smooth scrolling only without reduced motion (F-32 handoff)
0747e6b chore(deps): add @types/react-dom for React 19 and drop the test workaround (F-52 handoff)
d16e836 feat(manual-reading): reading memory for own-deck readings (F-50, F-62 handoff)
63607c6 feat(integration): mount ResonanceCheck on the reading page (F-83)
5b3ac4e feat(integration): dashboard widgets and Explore section (F-82)
977e112 feat(integration): navigation to the new pages (F-81)
d25c1cf chore(messages): fail npm test when en/es keys diverge (F-80)
6e57a61 merge: Lote F (lectura de dos) into capataz/2026-11-04
dac54dd merge: Lote E (mazo propio, seguimiento y voz) into capataz/2026-11-04
16674d0 merge: Lote D (memoria, resonancia y Mi historia) into capataz/2026-11-04
de47077 merge: Lote C (calendario, energías del día, pulso y cumpleaños) into capataz/2026-11-04
f2b27f9 merge: Lote B (Mapa Arcano) into capataz/2026-11-04
```

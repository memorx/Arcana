## Parte F4-B · Correcciones de la Fase 4: textos y flujos (rediseño «Dos tintas»)

Rama `rediseno/f4-B` (worktree `C:/Users/guill/dev/arcana-lotes/f2-L2`), base `rediseno/dos-tintas` en `971eb03`.
6 nov 2026. Sin `git push`; ninguna consulta a producción; sólo la base local `arcana_e2e_l2` (clúster `127.0.0.1:54329`,
siempre vía `scripts/e2e-db.mjs`) y el servidor de e2e en `:3012`. `BITACORA.md` no se tocó. No toqué archivos de F4-A.

Fuentes: dictamen de Fable (`scratchpad/fase4/inspeccion-fable.md`, puntos 3–9 y decisión n.º 2) y revisión de flujos
(`scratchpad/fase4/code-review-flujos.md`, puntos 1, 2, 3, 4, 5, 7, 8, 10, 12 y 13).

### 1 · Hecho (commit → qué)

| Punto | Commit | Qué |
|---|---|---|
| Fable 3 · mayúsculas | `3c68775` | **117 valores** de `messages/es.json` a mayúscula sólo inicial: los 111 de `mayusculas.tsv` menos 7 que son nombres propios («Sobre Arcana», «¡Bienvenido al Oráculo Diario!», «Suscríbete al Oráculo Diario», «Instala Arcana», «Descubre tu Mapa Arcano» ×2, «Ver mi Mapa Arcano»), más los que el script no cubría y se ven en títulos: «Las cartas se revelan», «Carta de hoy ✓», «Cambios en los términos», «Información que recopilamos», «Hora de nacimiento (opcional)», «Información de la cuenta», «¿Listo para tu lectura?», «Guías e insights del tarot», el `metadata.title` («Lecturas de tarot con IA») y `insights.suits.names.MAJOR` alineado a «Arcanos Mayores». Anglicismos: «Hora del correo», «Ir a mi espacio» y «correo» en lugar de «inbox» (3 valores). Las áreas de enfoque de `/profile/setup` venían de `lib/pricing` («Guía General»): ahora leen `profile.focusAreas.*` de `messages` (mismo texto en inglés). `en.json` intacto. 6 suites ajustadas con regex `/i` o la llave (misma intención). |
| Fable 4 · plural ICU | `a4719a1` | `achievements.reward`, `challenges.reward`, `dashboard.streakReward` (`{count, plural, one {+# crédito} other {+# créditos}}` / credit·credits) en los 5 sitios: `/achievements`, `/challenges`, `AchievementUnlockedModal`, `ChallengeCompletedModal`, `StreakDisplay`. `credits`/`creditPlural` se quedan (totales). Los mocks de `celebraciones` y `logros-retos-page` aprenden un ICU mínimo; pruebas con 1 → «+1 crédito» y 5 → «+5 créditos» (también en inglés y en la racha). |
| Fable 5 · `aria-label` | `4766b0e` | `LanguageSelector` usa `t("language")` («Idioma»/«Language»). `e2e/home.spec.ts` y los 5 usos de `LanguageSelector.test.tsx` con `/^(idioma|language)$/i`. `grep -rn 'aria-label="[A-Z]' src --include=*.tsx` (sin tests) = **0**; tampoco queda ningún `aria-label` literal. |
| Fable 6 · h1 compartida | `cb351ed` | `/share/[shareId]`: h1 «La lectura de {name}» / «{name}'s reading» y, sin nombre, «Una lectura compartida» / «A shared reading» (`reading.sharedTitle`, `reading.sharedTitleAnonymous`). La página no tiene `generateMetadata`: no había `title` que cambiar. Test nuevo `share-reading.test.tsx` (es, en, sin nombre, privada/inexistente → `notFound`). |
| Fable 8 · cifras en mono | `029e4fd`, `93bbecb` | A Martian Mono (como `/collection`): tira de contadores de `/dashboard`, días de la racha (`StreakDisplay`), tira de `/history/insights`, promedio de `ResonanceSummary`, y las cuentas «x/y» de las celdas de colección, logros y retos del dashboard (`CIFRA`). El contador de `/achievements` **ya era mono** (L5). Gloock queda para los numerales-figura. Pruebas de clase en `dashboard-page`, `ResonanceSummary` y `CollectionWidget`. |
| Fable 9 · decimal | `3a81aeb` | `ResonanceSummary` en `es-MX` («4.0»). Test nuevo `ResonanceSummary.test.tsx`. |
| Fable 7 · Cruz Celta | `8f1b6b6` | Desde 1024 px, columnas de `.tirada--celta` a 176 px y báculo a 32 px; `smallCards = narrow \|\| cartas > 10` (7 y 10 queman con el lienzo `media`, 12 sigue `chica`). Prueba en `ReadingFlow.test` (3, 7, 10 → `cq--media`; 12 → `cq--chica`). Medido abajo (§5). |
| Decisión n.º 2 · acentos de tiradas | `87b32fc` | `prisma/seed-themed-spreads.ts` con acentos (9 valores: «Tu Corazón», «La Conexión», «Desafíos», «Posición Actual», «Acción a Tomar», «El Año que Viene», «Obtén guía… posición…», «romántica», «energías»). `prisma/seed.ts` y `prisma/add-themed-spreads.ts` ya estaban bien. **`docs/sql/2026-11-06-acentos-tiradas.sql` NO aplicado** (lo decide Memo); probado abajo (§5). |
| Flujos 1 · `welcomeDefault` | `07a60b1` | La llave existe: «Tu cuenta» / «Your account». Test en `Header.test`. |
| Flujos 5 · menú móvil | `b546b1d` | Bloque de cuenta del menú móvil con el mismo sello del avatar de escritorio (inicial + nivel; `role="img"` «Nivel 3: Adepto»), el nombre en Gloock y el correo en mono `text-niebla`. Sin nombre, sólo el correo bajo la etiqueta «Tu cuenta» (no repite «Tu cuenta»). El `title` del sello ahora usa el nombre de nivel traducido (antes, el inglés). 2 pruebas en `Header.test`; captura a 390 (§6). |
| Flujos 2 · `?method=credits` | `986d325` | La bienvenida sólo si `GET /api/subscription` (la fuente de `/subscribe` y `/daily`) dice `status: "active"`; si no, o si falla, el error de siempre. Sin API nueva, sin tocar cobros. Pruebas: activa → bienvenida; `null`, `canceled` y 401 → error. El flujo e2e de suscripción con créditos ahora también comprueba el h1 de bienvenida. |
| Flujos 3 · cortes | `1efbcc8` | `numeralDeCarta()` en `cards/indice.ts`: `null` si `MINOR` y `number > 10`. La ficha omite el número; el índice de `/cards` y `/collection` guardan el renglón con un espacio duro (los nombres siguen alineados). Pruebas en `cartas-pages` y `coleccion-page`. |
| Flujos 4 · `CollectionWidget` | `987ef1c` | `slug: true` en el `select` de `getRecentlyDiscovered` y enlace `/cards/<slug>` (sin slug, `/collection`). Test nuevo `CollectionWidget.test.tsx`. |
| Flujos 7 · filtros de `/cards` | `0231a73` | `IndiceCartas` lee `useSearchParams()` (Next lo sincroniza también con `history.replaceState`) y, cuando cambian `palo`/`q` de la URL, ajusta los filtros durante el render (mismo análisis que la página del servidor). Prueba en `cartas-pages` (falla sin el arreglo) y en navegador (§5). |
| Flujos 8 · foco | `1f121a9` | «Voltear todas» usa `aria-disabled` (no `disabled`) mientras arden y comparte `key` con «Ver interpretación»: es el mismo `<button>`, así que el foco nunca cae a `body` y queda en «Ver interpretación». Prueba con teclado en `ReadingFlow.test`; comprobado en Chromium (§5). |
| Flujos 10 · `CardPicker` | `fd67b1e` | Fallo de imagen guardado por `${card.id}-${variante}`: si falla la `mesa`, la `tinta` se intenta. Prueba en `ManualReadingFlow.test`. |
| Flujos 12 · WebKit | `6a32b1e` | Proyecto `webkit-1440` (Desktop Safari) para `auth`, `home`, `legal`, `reading`, `smoke`, `red-desbordes` y `flujos/*`. Ninguna falla propia de WebKit: no hizo falta ningún `fixme`. |
| Flujos 13 · 404 compartida | `173d6eb` | `response.status() === 404` y el h1 de la carta perdida con `/no existe\|doesn't exist/i`. |
| Parte | este | — |

### 2 · Falso o ya hecho

- **Fable 8, contador de `/achievements` en Gloock**: ya era Martian Mono (`font-dato` en el `<p data-contador>` desde L5, `7c19a4b`). Lo de Gloock en el dashboard eran la tira y las cifras de las celdas (`CIFRA`): esas sí se cambiaron.
- **Fable 6, `title` de `generateMetadata`**: `/share/[shareId]` no tiene `generateMetadata`.
- **Fable 3, «Ir al Dashboard» y «Hora del Email» en el script**: estaban en la lista; además los 7 valores que el script sigue reportando son nombres propios completos (su regex de propios exige el valor entero), no errores.

### 3 · Decisiones

1. **Sentence case también fuera de la lista** cuando el valor es un título o etiqueta visible (los 13 extra de §1). No toqué «email» en los textos de recuperación de contraseña («Revisa tu email», «Este email ya está registrado»…): sólo los tres anglicismos pedidos.
2. **«Total de lecturas»** en lugar de «Total lecturas» (en minúscula la forma sin «de» se lee rota).
3. **Áreas de enfoque**: en lugar de tocar `lib/pricing` (sin dueño), `/profile/setup` lee las llaves que ya existían en `messages`; los valores de la base (`focusArea: "love"`) no cambian.
4. **Cifras del dashboard**: además de la tira, los días de la racha y las cuentas «x/y» de las celdas (misma regla: datos en mono). Los modales de celebración (`StreakRewardModal`, «7 días» en Gloock rosa) no se tocaron: son el titular del momento, no un dato de tabla.
5. **Menú móvil sin nombre**: el correo solo, bajo la etiqueta «Tu cuenta», para no repetir «Tu cuenta» dos veces.
6. **Cortes en el índice**: espacio duro en lugar de quitar el renglón, para que los nombres de una fila sigan alineados.
7. **SQL por valor viejo y por `name`** (no por id): los cuid cambian entre bases; `name` es único y en inglés.
8. **WebKit también corre `red-desbordes`** (la verificación lo pide en los dos motores; es barato).

### 4 · Handoffs y observaciones (no las cambié)

- **F4-A · `Header.test.tsx`**: si el punto 10 de Fable (sesión del servidor en `Providers`) cambia cómo se simula `useSession`, mis 3 pruebas nuevas de `Header.test` usan el mismo `mockUseSession` que las demás; al fundir sólo deben seguir el mock que deje F4-A.
- **F4-A · build de PWA**: `next build` regenera `public/sw.js`; no lo commiteé (es de F4-A y git no lo marcó como cambiado).
- **Textos de la base con mayúsculas de título** (como las tiradas, vienen de seeds): nombres de logros y retos («Primera Lectura», «Buscador de Respuestas», «Explorador Semanal») y las posiciones de las tiradas («Influencia Oculta», «Posición Actual»). El SQL de acentos **no** cambia mayúsculas; si Memo lo quiere, es otro SQL igual de idempotente.
- **`/share/[shareId]`**: la cita de la pregunta se titula «Tu intención» aunque la ve otra persona (como el h1 que se corrigió). Sugerencia: una llave «Su pregunta» / «The question».
- **Totales de los modales** (`+1` y debajo «CRÉDITOS»): con un total de 1 sigue diciendo «créditos»; Fable pidió conservar `credits`/`creditPlural` para el total. Se arregla igual que las recompensas si se quiere.
- **`dashboard.creditPlural` y `dashboard.credit`** quedaron sin uso tras el punto 4; las dejé (Fable pidió conservarlas).
- **Producción puede tener los textos de `add-themed-spreads.ts`** (ya acentuados y más largos) en lugar de los del seed: en ese caso el SQL no cambia nada (todas sus condiciones piden el valor viejo exacto).

### 5 · Mediciones y pruebas en navegador

Build de e2e (`node scripts/e2e-db.mjs serve`, `next build` con `.env.e2e` en `.next-e2e`, `next start -p 3012`), Chromium de
Playwright, es-MX, America/Mexico_City. Script: `scratchpad/fase4/B/medir.mjs` (resultados en `medir-*.json`).

- **Cruz Celta (Fable 7)**, usuario `e2e-w7`: 1440 → 10 cartas de **176 px**, lienzo `media`; «Voltear todas» con teclado: **4.6 s** hasta las 10 reveladas, **0 tareas largas**. 390 → 113 px, `chica`, **4.6 s**, **0 tareas largas**. Sin scroll lateral ni errores de consola.
- **Foco (flujos 8)**, mismas corridas: durante la quema el foco sigue en el botón (`aria-disabled="true"`, sin `disabled`); al aparecer «Ver interpretación» el foco **es** ese botón (1440 y 390). Después el modal de carta nueva toma el foco (y lo devuelve al cerrarse).
- **Filtros de `/cards` (flujos 7)**: `/cards` (78) → «Copas» (`?palo=cups`, 14, Copas `aria-current`) → enlace «Cartas» del pie → `/cards` con **78** y «Todas» `aria-current`; «Espadas» y «atrás» → la URL y el índice coinciden (14).
- **SQL de acentos (decisión n.º 2)** contra `arcana_e2e_l2`: sembrada con el seed viejo (`spreads-viejo.tsv`), 1.ª corrida `UPDATE 1/1/1/1/2`, 2.ª corrida `UPDATE 0` ×5 y la tabla igual (`md5` idéntico); luego `reset` con el seed nuevo: la tabla `spread_types` completa (sin `id`) es **idéntica byte a byte** a la que dejó el SQL (`b60e84ed…`), y correr el SQL sobre la base del seed nuevo da `UPDATE 0` ×5.

### 6 · Capturas

`C:/Users/guill/AppData/Local/Temp/claude/C--Users-guill-dev-arcana/ba3d8826-c8e4-418f-8b14-19f131c84e14/scratchpad/fase4/B/capturas/`:
`celta-1440-bocaabajo.png` / `-reveladas.png`, `celta-390-*`, `menu-390-abierto.png` (sello «A·3», «Tu cuenta», Ana, correo),
`dashboard-360.png`, `insights-360.png`, `achievements-360.png` (cifras en mono; recortes `recorte-*`), `share-360.png`
(«La lectura de Ana»), `history-1440.png`, `credits-1440.png`, `login-1440.png`, `rey-de-bastos-1440.png` (sin «XIV»).
Todas con status 200, un h1 y 0 px de scroll lateral, sin errores de consola.

### 7 · Comandos y resultados

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | **0 errores** |
| `npm run lint` | **0 errores**, 7 avisos, los mismos de I2 (todos fuera de la UI: `prisma/*`, `scripts/generate-images.ts`, `lib/challenges.ts`, `types/next-auth.d.ts`) |
| `npm test` | `check-messages: ok (1091 keys in en and es)` · **119 suites / 1,575 pruebas, todo verde** (I2: 116 / 1,547; 3 suites nuevas: `share-reading`, `ResonanceSummary`, `CollectionWidget`) |
| `next build` (vía `node scripts/e2e-db.mjs serve`, `.env.e2e`) | **exit 0**, «Compiled successfully». No corrí `npm run build` con el `.env` de la raíz: lee la base de **producción** para el sitemap, y el encargo prohíbe cualquier consulta a producción; es el mismo `next build` con la base local. |
| `node fase4-fable/mayusculas.mjs messages/es.json` | 7 valores, todos nombres propios completos (§2) |
| `grep -rn 'aria-label="[A-Z]' src --include=*.tsx` (sin `__tests__`) | 0 |
| `grep -rn '+{' src --include=*.tsx \| grep 't("credit'` | 0 |
| `ARCANA_E2E_REUSE=1 npx playwright test --project=webkit-1440` | **93 ✓ · 0 ✘ · 2 omitidas** (2.8 min) |
| `ARCANA_E2E_REUSE=1 npx playwright test --project=chromium-1440 e2e/{auth,home,legal,reading,smoke,red-desbordes}.spec.ts e2e/flujos` | **93 ✓ · 0 ✘ · 2 omitidas** (38 s) |
| `ARCANA_E2E_REUSE=1 ARCANA_E2E_DEFECTOS=0 npx playwright test e2e/responsivo.spec.ts --grep "reading\|share\|dashboard\|insights\|achievements\|challenges\|cards\|collection\|subscribe\|login\|register"` | **411 ✓ · 0 ✘ · 0 inestables** (5.4 min; Chromium 1440/1024/820/390/360, `@en` a 390 y WebKit 390 en las públicas) |
| Al cerrar | `:3012` libre; clúster arriba (no se detuvo) |

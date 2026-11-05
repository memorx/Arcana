## Parte Lote D

Worktree `C:/Users/guill/dev/arcana-lotes/lote-D`, rama `capataz/lote-D` (desde `d5b646a`). Sin `git push`, sin `prisma db push`/`migrate`, sin `npm install`, sin `npm run dev` ni nada que escriba en la base. Un commit por ficha.

### Hechas

- **F-50: memoria de lecturas.** `src/lib/reading-memory.ts` → `buildHistoryContext(userId, locale, now?)`: últimas 8 lecturas, una línea cada una (`- 12 oct · Tres Cartas · «intención ≤ 80» · Pasado: El Loco; Presente: La Torre (inv.); …`, en inglés `Oct 12`, `(rev.)`), luego "Cartas recurrentes en los últimos 90 días: La Torre ×3, …" (top 3, sólo cartas que salieron ≥ 2 veces) y "Resonancia que la persona reportó: la lectura del 12 oct resonó 5/5; la del 3 oct, 2/5." (las 3 más recientes). Tope duro de 1500 caracteres: las líneas de recurrentes y resonancia siempre caben y se quitan primero las lecturas más viejas; si ni la más nueva cabe entera, se recorta. Sin lecturas → `undefined`. Fechas con `timeZone: "UTC"`. Dos consultas en paralelo (8 recientes + ventana de 90 días) y una de nombres de cartas. En `src/app/api/reading/route.ts` (único cambio): se calcula después del chequeo de saldo y antes de interpretar, en `try/catch` (si falla, `console.error` y se lee sin memoria), y se pasa como `history` a `generateTarotInterpretation`. Los helpers compartidos (`parseReadingCards`, `parseSpreadPositions`, `tallyCards`) viven en `src/lib/insights.ts` y van en este commit. · tests `src/__tests__/lib/reading-memory.test.ts` (vacío → `undefined` sin pedir cartas; consultas sólo del usuario, `take: 8` y `gte` = ahora − 90 d; formato por posición con "inv."; intención a 80 caracteres con "…"; recurrentes con conteo y sin las de 1 vez; resonancia; sin líneas extra cuando no hay; inglés; 8 Cruces Celtas con intenciones de 300 caracteres → ≤ 1500, conserva la más nueva y descarta la más vieja, conserva recurrentes y resonancia; `truncateText` no parte emojis) y `src/__tests__/api/reading-history.test.ts` (la ruta llama `buildHistoryContext("user-123", locale)` y pasa `history`; si falla responde 200 y lee sin memoria; sin historia → `history` indefinido; con 403 por saldo no se calcula). `src/__tests__/api/reading.test.ts`: sólo se agregó `jest.mock("@/lib/reading-memory", …)`; ninguna aserción cambió.
- **F-51: API de resonancia.** `src/app/api/readings/[id]/resonance/route.ts` → `POST { score: 1..5, note?: string ≤ 500 }`. 401 sin sesión; 400 `invalid_body` / `invalid_score` (entero 1–5; rechaza `0`, `6`, `2.5`, `"5"`, `null`) / `invalid_note` / `note_too_long`; 404 si no existe; 403 si es ajena; 409 `already_rated` si ya tiene resonancia; 400 `too_soon` si la lectura tiene menos de 24 h (misma regla que el componente). Escritura condicional `reading.updateMany({ where: { id, userId, resonance: null } })`: si `count === 0` → 409 (dos peticiones simultáneas no valoran dos veces ni ganan XP dos veces). Nota recortada; vacía → `null`. `addXP(userId, 5, "resonance")` en `try/catch` (si falla, la valoración queda guardada y `xpAdded: 0`). Respuesta `{ resonance, resonanceNote, resonanceAt, xpAdded, levelUp }`. Rate limit 10/min. · tests `src/__tests__/api/resonance.test.ts` (401, 404, 403 sin escribir, 400 ×6 scores, nota > 500, nota no-texto, cuerpo no-JSON, < 24 h, 409 ya valorada, 409 por carrera sin XP, camino feliz con `where`/`data` exactos y +5 XP, nota vacía → null, XP que falla no tumba la valoración).
- **F-52: `ResonanceCheck`.** `src/components/reading/ResonanceCheck.tsx`, client, export nombrado, props exactas del contrato. Con `resonance`: "Resonó N/5" con estrellas (`role="img"` + `aria-label`) y la nota. Sin `resonance` y con más de 24 h: pregunta "¿Cómo resonó esta lectura con lo que pasó?", "Lectura del 12 de octubre", cinco `<button>` con `aria-label` ("4 estrellas de 5") y `aria-pressed` dentro de un `role="group"`, nota opcional con contador y tope de 500, botón Guardar con estado de carga, error con `role="alert"` (genérico / ya valorada / demasiado pronto) y agradecimiento con `role="status"` y "+5 XP". Menos de 24 h o fecha ilegible → no renderiza nada. Reloj leído después de montar (`useEffect`; mientras tanto devuelve `null`, ver corrección N-1). Con 409 oculta el formulario, avisa "ya tiene una calificación" y llama `router.refresh()` para traer la calificación existente (N-2). Animación de estrellas sólo con `motion-safe:`. Botones de 44 px (táctil). **No se montó** en `reading/[id]/page.tsx` (ver handoffs). Namespaces `insights` y `resonance` agregados al final de `messages/en.json` y `messages/es.json`. · test `src/__tests__/components/ResonanceCheck.test.tsx` (oculto < 24 h, oculto con fecha inválida, muestra resultado y nota aunque la lectura sea reciente, 5 botones etiquetados y Guardar deshabilitado, `aria-pressed`, POST con nota recortada → gracias + XP + resultado, sin nota no la manda, error 500 conserva el formulario, 409 → "ya valorada", tope de 500).
- **F-53: API de insights y recap.** `src/lib/insights.ts`: `getUserInsights(userId, now?)` → `{ totalReadings, byMonth (12 meses UTC, del más viejo al actual), topCards (top 6 de 90 días: cardId, name, nameEs, imageUrl, count, reversedCount + arcana, suit, number), suits { MAJOR, WANDS, CUPS, SWORDS, PENTACLES } (porcentajes enteros que suman 100 por resto mayor con aritmética entera; todo 0 sin datos), reversedRate (0–100, 90 días), resonance { count, average (1 decimal o null) }, cardOfTheMonth }`. Tres consultas en paralelo (`count`, lecturas de 12 meses con `cards`, `aggregate` de resonancia) + una de cartas sólo con los ids de los últimos 90 días. Parte pura en `computeInsights` (testeable sin base). También `getCardOfTheMonth(userId, now?)` y `getMonthStreak(byMonth)`. `GET /api/insights` (`src/app/api/insights/route.ts`): 401 / 200 con `Cache-Control: private, no-store` / 500. `POST /api/insights/recap` (`src/app/api/insights/recap/route.ts`, `maxDuration = 60`, rate limit 3/min) `{ year, month, locale? }`: 400 `invalid_month` / `future_month`; recap guardado que ya cubre todas las lecturas del mes (`readingCount >= lecturas`) → lo devuelve sin IA, en cualquier mes (C-1); < 3 lecturas → 400 `{ error: "not_enough_readings", required: 3, count }`; si no, arma las lecturas del mes (UTC) y llama `generateMonthlyRecap` de `src/lib/ai/monthly-recap.ts` (`complete` con `AI_MODELS.synthesis`, `effort: "medium"`, `maxTokens: 4000` (C-2); prompt con intenciones a 120, cartas por posición, resonancias con nota a 200, cartas repetidas, máximo 40 lecturas), guarda con `upsert`. `AIRefusalError` → 422 `recap_refused`; cualquier otro fallo de IA → 503 `{ error: "recap_unavailable", retry: true }`; en ambos no se guarda nada. Gratis. · tests `src/__tests__/lib/insights.test.ts` (parseo defensivo; orden por conteo y recencia; porcentajes suman 100 en 200 combinaciones aleatorias y desempate determinista; 12 meses; top ordenado y ≤ 6; ventana de 90 días; palos con MAJOR; tasa de invertidas; carta del mes; meses seguidos; consultas y redondeo de `getUserInsights`; `getCardOfTheMonth` sin consultar cartas si no hay lecturas), `src/__tests__/lib/monthly-recap.test.ts`, `src/__tests__/api/insights.test.ts` y `src/__tests__/api/insights-recap.test.ts` (401; 5 meses inválidos; mes futuro; **mes cerrado con recap y sin lecturas nuevas → no llama a la IA**; **mes cerrado con recap de 3 y 12 lecturas → lo reescribe** (C-1); **< 3 lecturas → 400 sin IA**; rango UTC del mes; camino feliz con modelo/effort/tokens y `upsert` exactos; inglés; 503 y 422 sin guardar; mes actual: sin lecturas nuevas devuelve el guardado, con nuevas lo reescribe, con 3 se puede escribir).
- **F-54: página `/history/insights`.** `src/app/(main)/history/insights/page.tsx` (server, `auth()` → `redirect("/login?callbackUrl=/history/insights")`) + `layout.tsx` (metadata traducida, `noindex`). Con < 3 lecturas: estado vacío amable con CTA a `/reading/new`. Si no: cabecera "Mi historia" con vuelta al historial; tres cifras (lecturas, meses seguidos, % invertidas); secciones en tarjetas con `FadeIn` dentro de `MotionConfig reducedMotion="user"` (`InsightsMotion`) para respetar `prefers-reduced-motion`: cartas recurrentes (`RecurringCards`: `TarotCardStatic`, "×N veces", "% invertida"), palos (`SuitBars`: barras CSS con `style={{ width }}`, emoji, nombre, % visible y pista del elemento; `role="img"` + `aria-label` con todos los valores), meses (`MonthBars`: 12 barras verticales, el mes actual en ámbar, etiquetas de mes visibles; `role="img"` + `aria-label` "noviembre de 2026: 4, …"), resonancia media (`ResonanceSummary`: "4,3/5", barra y "De N lecturas valoradas"; vacío con explicación breve) y "Tu mes en cartas" (`RecapPanel`, client: selector de los 12 meses con conteo, recaps guardados precargados por el servidor, botón "Escribir mi mes" con insignia Gratis, carga con `motion-safe:animate-pulse` y `aria-live`, errores 503/422 con reintento, "Actualizar" en cualquier mes con lecturas que el recap guardado no cubrió). Mobile-first: rejillas de 2→3 columnas, barras de mes que caben en 360 px. Componentes en `src/components/insights/`. · tests `src/__tests__/components/RecapPanel.test.tsx` y, para las gráficas, `src/__tests__/components/InsightsWidget.test.tsx` (anchos/altos de barra y `aria-label` con valores).
- **F-55: historial.** `src/app/(main)/history/page.tsx`: botón "✦ Mi historia" (secundario) junto a "Nueva lectura" en la cabecera, y en cada lectura con resonancia la insignia ámbar "★ Resonó N/5". Textos de los namespaces nuevos (`insights.myStory`, `resonance.badge`); no se tocó el namespace `history`. La consulta no cambió (`include: { spreadType: true }` ya trae `resonance`).
- **F-56: widget.** `src/components/dashboard/InsightsWidget.tsx` (server, como `LevelWidget`): carta que más salió en el mes UTC con imagen (`TarotCardStatic sm`), nombre, "Salió N veces este mes" y link a `/history/insights`; sin lecturas → invitación breve con CTA a `/reading/new`; con lecturas pero ninguna este mes → aviso y link a Mi historia; si la consulta falla devuelve `null` para no tumbar el dashboard. · test `src/__tests__/components/InsightsWidget.test.tsx` (los tres estados y el fallo).

### Falsas o ya hechas

- Ninguna.

### Bloqueadas / handoffs

- **F-83 (integrador): montar `ResonanceCheck`** en `src/app/(main)/reading/[id]/page.tsx`, entre la tarjeta de interpretación y `<PersonalNotes …/>`:
  ```tsx
  import { ResonanceCheck } from "@/components/reading/ResonanceCheck";
  …
  <ResonanceCheck
    readingId={id}
    createdAt={reading.createdAt.toISOString()}
    resonance={reading.resonance}
    resonanceNote={reading.resonanceNote}
    locale={locale}
  />
  ```
  La consulta actual (`findUnique` con `include: { spreadType: true }`) ya trae `resonance` y `resonanceNote`. El componente trae su propio `mt-8`.
- **F-82 (integrador): montar `InsightsWidget`** en `src/app/(main)/dashboard/page.tsx` junto a los retos: `import { InsightsWidget } from "@/components/dashboard/InsightsWidget";` y `<InsightsWidget userId={session.user.id} />`.
- **F-81 (integrador):** el menú de usuario apunta a `/history/insights` con `nav.insights` ("My story" / "Mi historia"). Esa llave va en el namespace `nav` (no la agregué: no es de este lote).
- **Fusión de `messages/*.json`:** agregué `insights` y `resonance` al final del objeto en ambos archivos; otros lotes también agregan al final, así que habrá conflicto de texto en la última llave. Basta conservar todos los namespaces.

### Decisiones tomadas (con motivo)

- **"Recurrente" = salió ≥ 2 veces** en la memoria de la IA. Una carta que salió una vez no es recurrente; mandarla como tal le daría a la IA un patrón falso. En la página y el widget se muestra el top aunque sea 1 (ahí el conteo está a la vista).
- **Presupuesto de 1500 caracteres por prioridad:** recurrentes y resonancia siempre entran; se descartan primero las lecturas más viejas. Con tiradas de 10 cartas caben ~3 lecturas; con tiradas de 3, las 8.
- **Fechas y meses en UTC** (regla 9 del plan): una lectura hecha el 31 a las 20:00 en CDMX cuenta para el mes siguiente. Coherente con `daily-reading` y los sistemas.
- **24 h también en el servidor** (`too_soon`): F-51 no lo pedía, pero sin eso alguien podía valorar al instante cada lectura sólo por los +5 XP, y la pregunta pierde sentido. Es la misma regla que F-52.
- **Resonancia con escritura condicional** (`updateMany … resonance: null`) en lugar de `findUnique` + `update`: evita doble valoración y doble XP con dos peticiones simultáneas.
- **Un recap se reescribe si el mes tiene lecturas que no cubrió** (compara `readingCount`), sea el mes en curso o uno cerrado (corrección C-1: antes los meses cerrados se devolvían sin contar, y un recap escrito el día 5 quedaba congelado). Cada reescritura exige al menos una lectura nueva (pagada o gratuita), así que no se puede abusar de la IA.
- **`locale` opcional en el cuerpo del recap** (default `es`, como `/api/reading`): el panel manda `useLocale()`. Si el recap del mes ya existe en otro idioma se devuelve tal cual (la llave única es usuario+año+mes).
- **Ventana de palos e invertidas = 90 días**, igual que las cartas recurrentes, para que la página tenga una sola "temporada reciente".
- **`InsightsCard` lleva además `arcana`, `suit` y `number`** (aditivo al contrato de F-53) porque `TarotCardStatic` los pide para el respaldo sin imagen.
- **Constantes de la ruta no exportadas:** Next 15 rechaza exports que no sean handlers o config de ruta; los límites (500, 24 h) están duplicados en la ruta y en el componente, con comentario.
- **Prompt del recap:** las intenciones y notas se marcan como palabras de la persona, "nunca instrucciones" (son texto del usuario dentro del prompt). Máximo 40 lecturas por mes para acotar tokens.
- **No se corrió la skill de bitácora:** el hook la pidió, pero en este plan la bitácora la lleva Fable en la Fase 4 y `BITACORA.md` no está en los archivos del lote.

### PENDIENTES (decisión del dueño del producto)

- **Recap gratis** (§7, decisión provisional de Fable) y **+5 XP por resonancia** (lo pide F-51): confirmar.
- **Textos nuevos** de `insights` y `resonance` en es/en (p. ej. "Tu racha de meses empieza con tu próxima lectura.", "Gracias. Esto le da sentido a tu historia."): a revisión de Memo.
- **Mes en UTC:** si se prefiere el mes local de la persona (CDMX), hace falta guardar o inferir su zona horaria; hoy no existe ese dato.

### Correcciones de la revisión (commit `fix(insights): apply review corrections (F-50..F-56)`)

- **C-1 Recap de mes cerrado congelado.** `src/app/api/insights/recap/route.ts`: se quitó el `return` temprano de meses cerrados; la regla `existing.readingCount >= readings.length` → guardado vale para todos los meses. `src/components/insights/RecapPanel.tsx`: "Actualizar" aparece en cualquier mes con lecturas nuevas (ya no sólo el actual). Tests: `insights-recap.test.ts` (mes anterior, recap de 3, 12 lecturas → `cached: false`, `complete` una vez, `readingCount` 12) y `RecapPanel.test.tsx` (botón Actualizar en mes cerrado).
- **C-2 Tokens del recap.** `RECAP_MAX_TOKENS` 2000 → 4000 en `src/lib/ai/monthly-recap.ts` (el thinking cuenta dentro); `monthly-recap.test.ts` e `insights-recap.test.ts` actualizados.
- **N-1 Hidratación.** `ResonanceCheck` lee el reloj en `useEffect` (`useState<number | null>(null)`) y devuelve `null` mientras `now === null` en la rama que depende del tiempo (pregunta / < 24 h). La calificación ya guardada sigue renderizándose desde el servidor porque no depende del reloj (no hay desajuste posible y evita un parpadeo). Test nuevo `src/__tests__/components/ResonanceCheck.server.test.tsx` con `renderToString`: lectura sin calificar de hace 48 h → HTML vacío; calificada → muestra resultado y nota.
- **N-2 409.** Oculta el formulario, muestra "Esta lectura ya tiene una calificación." (`role="status"`) y llama `router.refresh()`; la calificación que vuelve en las props se muestra (la calificación guardada ya no vive en estado inicializado una sola vez, sino que se deriva de props o de lo que el componente acaba de guardar). Tests: 409 oculta estrellas y nota y llama `refresh` una vez; tras `rerender` con `resonance={3}` muestra la calificación.
- **N-3 Español de México.** `resonance.starsGroup` "Califica de 1 a 5"; `resonance.alreadySaved` "…una calificación."; `resonance.tooSoon` "Podrás calificarla…"; `insights.resonance.basedOn` "lectura(s) calificada(s)"; `insights.resonance.empty` "Todavía no has calificado ninguna lectura. Un día después de cada lectura puedes contarnos, en la misma lectura, cómo resonó." (y su versión en inglés, que también prometía "we ask"); `insights.resonance.chartLabel` "Resonancia promedio". No quedaba ningún otro "valor…" ni "media" en los namespaces del lote; `ResonanceSummary` no tiene texto propio (todo sale de esas llaves).
- **N-4 Números en textos.** `insights.recurring.empty` e `insights.suits.empty` usan `{days}` (alimentado con `INSIGHTS_WINDOW_DAYS`); `insights.recap.needMore` usa `{min}` (alimentado con `MIN_READINGS` del panel, que replica el de la ruta). Test de `SuitBars` vacío verifica `{"days":90}`.
- **N-10 Test de la página.** `src/__tests__/app/history-insights-page.test.tsx`: sin sesión → `redirect("/login?callbackUrl=/history/insights")` sin leer datos; con `user-1` → `getUserInsights("user-1")` y `prisma.monthlyRecap.findMany` con `where: { userId: "user-1" }`; también en el estado vacío.

### Commits (rama `capataz/lote-D`, sin push)

```
10a391c feat(dashboard): InsightsWidget with the card of the month (F-56)
e438d1e feat(history): link to My story and show resonance badges (F-55)
701449f feat(insights): My story page (F-54)
85360d1 feat(insights): insights API and monthly recap (F-53)
2555ead feat(resonance): ResonanceCheck component and insights/resonance messages (F-52)
3608f17 feat(resonance): let the owner rate how a reading resonated, once (F-51)
99b7b32 feat(insights): give interpretations a memory of past readings (F-50)
```
Más el commit de este parte. `npm-ci.log` (del `npm ci` de preparación) queda sin seguimiento a propósito.

### Componentes y funciones exportadas (para el integrador)

| Export | Archivo | Firma |
|---|---|---|
| `ResonanceCheck` (client) | `src/components/reading/ResonanceCheck.tsx` | `{ readingId: string; createdAt: string; resonance: number \| null; resonanceNote: string \| null; locale: string }` |
| `InsightsWidget` (server, async) | `src/components/dashboard/InsightsWidget.tsx` | `{ userId: string }` |
| `RecapPanel` (client) | `src/components/insights/RecapPanel.tsx` | `{ months: { year; month; count; label }[]; initialRecaps: { year; month; content; readingCount }[] }` |
| `RecurringCards`, `SuitBars`, `MonthBars`, `ResonanceSummary` (server, async) | `src/components/insights/*` | `{ cards: InsightsCard[] }`, `{ suits: Record<SuitKey, number> }`, `{ months: MonthCount[] }`, `{ resonance: { count; average } }` |
| `InsightsMotion` (client) | `src/components/insights/InsightsMotion.tsx` | `{ children }` (`MotionConfig reducedMotion="user"`) |
| `buildHistoryContext` | `src/lib/reading-memory.ts` | `(userId: string, locale: string, now?: Date) => Promise<string \| undefined>` |
| `getUserInsights`, `getCardOfTheMonth`, `computeInsights`, `getMonthStreak`, `toPercentages`, `tallyCards`, `parseReadingCards`, `parseSpreadPositions` | `src/lib/insights.ts` | ver JSDoc |
| `generateMonthlyRecap`, `buildMonthlyRecapPrompt` | `src/lib/ai/monthly-recap.ts` | `(input: { year; month; locale: "en" \| "es"; readings: RecapReading[] })` |

Lote E (`/api/reading/manual`) puede reutilizar `buildHistoryContext` igual que `/api/reading` si quiere memoria en las tiradas con mazo propio (no lo cableé: no es archivo de este lote).

### Comandos corridos al final y su resultado (jest / tsc / lint / build)

| Comando | Resultado |
|---|---|
| `npx jest` (suite completa) | **48 suites, 48 verdes; 671 de 671 tests verdes** (10 suites nuevas de este lote: `lib/reading-memory`, `api/reading-history`, `api/resonance`, `components/ResonanceCheck`, `lib/insights`, `lib/monthly-recap`, `api/insights`, `api/insights-recap`, `components/RecapPanel`, `components/InsightsWidget`) |
| `npx tsc --noEmit` | **exit 0**, sin errores |
| `npm run lint` | **exit 0: 0 errores, 23 avisos**, los mismos 23 de la línea base del Lote 0, todos en archivos ajenos; **0 avisos en archivos del lote** |
| `npm run build` | **exit 0** con Next 15.5.29: compila en 96 s con los avisos ya conocidos (`jose` en Edge, avisos de lint ajenos), 54/54 páginas; `ƒ /history/insights` 43.8 kB (184 kB First Load), `ƒ /api/insights`, `ƒ /api/insights/recap`, `ƒ /api/readings/[id]/resonance` |
| Paridad `messages/en.json` / `es.json` (script de node) | JSON válido; 663 llaves en cada uno, 0 de un solo lado; `insights` y `resonance` son los dos últimos namespaces en ambos |

**Después de las correcciones de la revisión:**

| Comando | Resultado |
|---|---|
| `npx jest` de las suites del lote + `src/__tests__/api/reading.test.ts` (13 suites, incluidas las nuevas `components/ResonanceCheck.server` y `app/history-insights-page`) | **13 de 13 suites, 119 de 119 tests verdes** |
| `npx tsc --noEmit` | **exit 0**. La primera corrida dio 1 error (TS7016: no hay `@types/react-dom` para `react-dom/server` en el test nuevo de N-1); se resolvió con un `// @ts-expect-error` comentado en ese test, porque los lotes no instalan paquetes. Si alguien agrega `@types/react-dom`, ese comentario hay que quitarlo (tsc lo avisará) |
| `npm run lint` | **exit 0: 0 errores, 23 avisos** (los mismos de la línea base, ninguno en archivos del lote) |
| Paridad de llaves | 663 / 663, 0 de un solo lado |
| `npm run build` | **No se repitió**: las correcciones sólo tocan archivos ya construidos en la corrida anterior (ruta del recap, `RecapPanel`, `ResonanceCheck`, `RecurringCards`, `SuitBars`, `monthly-recap.ts`, mensajes) y tests; ninguna ruta ni export nuevo |

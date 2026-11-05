## Parte Lote F

Rama `capataz/lote-F` (worktree `C:/Users/guill/dev/arcana-lotes/lote-F`), base `d5b646a`. Sólo archivos del lote: `src/lib/compatibility.ts`, `src/lib/ai/compatibility.ts`, `src/app/api/compatibility/**`, `src/app/(main)/compatibility/**`, `src/components/compatibility/**`, el namespace `compatibility` al final de `messages/en.json` y `messages/es.json`, y tests nuevos en `src/__tests__/**`. Sin `git push`, sin `prisma db push`/`migrate`, sin `npm install`, sin `npm run dev` ni nada que escriba en la base.

### Hechas

- **F-70: motor.** `src/lib/compatibility.ts` → `computeCompatibility(me, partner)` compara cuatro sistemas y los resume en un conjunto:
  - **Occidental:** elementos con `getElementCompatibility` (Lote A).
  - **Chino:** animales con `getChineseCompatibility` (Lote A; incluye `relation`).
  - **Numerología:** caminos de vida; `relationshipNumber = reduceNumber(lpA + lpB, false)` → 1–9 con nombre y resumen bilingüe por número. Si las dos personas tienen nombre completo, también compara los números de expresión.
  - **Tonalpohualli:** `sameSign`, `sameTrecena`, `sameDirection` (rumbo del signo) y una `resonance` con resumen.
  - **Conjunto:** `overall = overallFromSum(suma)` = `round(1 + (suma − minSuma) · 4 / (maxSuma − minSuma))`, con etiqueta bilingüe. `minSuma`/`maxSuma` (`OVERALL_SUM_RANGE`) se calculan recorriendo las escalas (`SYSTEM_SCORE_RANGES`), así que 1 y 5 siempre son alcanzables (revisión, punto 5).
  - El mismo archivo trae `parseBirthDateInput` (`"YYYY-MM-DD"` → `Date.UTC`; rechaza fechas imposibles, futuras o anteriores a 1900), `buildCompatibilitySummary`/`parseCompatibilitySummary`/`getStoredOverall` (forma del JSON guardado), `CARD_ROLES` (Tú / La otra persona / El vínculo, en/es) y `toTextBlocks` (parte el texto de la IA en títulos y párrafos).
  - Tests: `src/__tests__/lib/compatibility.test.ts` (47).
    - Mismo trino → 5, amigos secretos → 5, choque → 2.
    - Frontera del Año Nuevo lunar; fuego–aire 5 y fuego–agua 2.
    - Lectura UTC: 21 mar 00:00Z es Aries con TZ de Ciudad de México.
    - Número del vínculo (5 + 6 = 11 → 2; 11 + 5 = 16 → 7) y familias de números; el mismo número nunca puntúa menos que dos de la misma familia.
    - Nombres: con y sin nombre completo, en blanco, sin letras.
    - Tonalli: mismo tonalli, mismo signo, misma trecena, mismo rumbo y distinto.
    - `overall`: rangos derivados de las escalas (10–20); `overallFromSum` monótono, 1 en el mínimo y 5 en el máximo; un par real con los cuatro máximos da 5 y uno con los cuatro mínimos da 1; no depende de la hora del día UTC.
    - Validación de fechas, ida y vuelta del resumen guardado, `toTextBlocks` (incluye «¿Qué quieren cuidar juntos?» y otras preguntas, exclamaciones o citas cortas, que no son títulos).
    - Contenido bilingüe sin clichés ni predicciones, con acentos.
  - Commit `4b78a00`.
- **F-71: API.**
  - `src/app/api/compatibility/route.ts`:
    - `GET` lista las mías: `{ readings: [{ id, partnerName, partnerBirthDate: "YYYY-MM-DD", overall, createdAt }] }`, de la más nueva a la más vieja, máximo 50.
    - `POST`:
      1. Rate limit `rateLimit(req, 3, 60000)`.
      2. Sesión (401).
      3. Perfil propio con `birthDate` y `fullName`; si no hay, 404 `profile_required`.
      4. Cuerpo: `partnerBirthDate` válida y no futura; `partnerName` ≤ 60; `partnerFullName` ≤ 80. Si algo falla, 400 con `error` específico (y `reason` para la fecha).
      5. `user.credits >= 2`; si no, 403 `insufficient_credits` sin llamar a la IA.
      6. `computeCompatibility`.
      7. `drawCards(allCards, 3, { allowGolden: false })` para Tú / La otra persona / El vínculo.
      8. IA. Si falla, 503 `{ error: "interpretation_unavailable", retry: true }`; si `AIRefusalError`, 422 `interpretation_refused`. En los dos casos no se abre la transacción.
      9. `prisma.$transaction`: `spendCredits(tx, userId, 2, "COMPATIBILITY")`. Si no alcanza, `InsufficientCreditsError` → 403. Si alcanza, `tx.compatibilityReading.create({ userId, partnerName, partnerBirthDate, locale, content, summary })`.
      10. Responde 201 `{ reading: { id, partnerName, partnerBirthDate, locale, content, summary, createdAt }, creditsCharged: 2 }`.
    - `export const maxDuration = 60`.
  - `src/app/api/compatibility/[id]/route.ts`: `GET`, sólo el dueño (401 / 404 / 403 / 200; no devuelve `userId`).
  - `src/lib/ai/compatibility.ts`:
    - `buildCompatibilityPrompt` y `generateCompatibilityReading`. Esta última llama `complete({ system, user, model: AI_MODELS.synthesis, effort: "medium", maxTokens: 4000 })` (4000 por decisión de Fable en la revisión).
    - Prompt de usuario:
      - Los dos mapas, de `describeMapForPrompt(getArcanaBlueprint(…), locale)`: es `describeBlueprintForAI` sin su primera línea, que es la que trae "nacimiento YYYY-MM-DD". Ninguna fecha exacta ni el apellido llegan a la IA.
      - Puntaje y resumen por sistema, y el conjunto.
      - Las tres cartas con su rol y "(invertida)".
    - System prompt:
      - Mismo tono que `anthropic.ts`: espejo, no bola de cristal.
      - Cuatro partes con título en su propia línea: cómo se encuentran / qué se piden / qué cuidar / una pregunta para los dos.
      - Prohíbe predicciones, "almas gemelas", "destinados", "karma", markdown, y mencionar muertes literales, enfermedades o infidelidades.
      - Guía para las cartas difíciles: La Torre, la Muerte, el Diablo o el 10 de Espadas hablan de transformación, de finales necesarios o de patrones que piden atención, no de catástrofes ni de que el vínculo vaya a terminar; hay que nombrarlas con calma (en/es).
      - Pide no asumir que el vínculo es romántico y nombrar el tonalpohualli como tradición viva.
  - Tests:
    - `src/__tests__/api/compatibility.test.ts` (28):
      - 429, 401, 404 sin perfil o con nombre en blanco (no llama a la IA), siete casos 400 y cuerpo que no es JSON.
      - 403 temprano: no llama a la IA ni abre la transacción. Con `freeReadingsLeft: 3` y `credits: 0` también da 403: la lectura de dos no usa lecturas gratis.
      - **503 si la IA falla: no cobra** (`$transaction`, `updateMany`, `creditTransaction.create` y `compatibilityReading.create` sin llamar). 422 con rechazo, sin cobro.
      - **403 si el débito condicional no pasa: no guarda.**
      - **Camino feliz:** descuenta 2 con `where: { credits: { gte: 2 } }`, crea la transacción `-2 COMPATIBILITY`, guarda exactamente `userId, partnerName, partnerBirthDate, locale, content, summary` (sin el nombre completo) con 3 cartas distintas, sus roles y sin `isGolden`. El prompt no contiene ninguna fecha ISO (`/\d{4}-\d{2}-\d{2}/`) ni el apellido del usuario.
      - Sin nombre completo, la numerología usa sólo fechas.
      - Idioma: inglés, español y respaldo al idioma del perfil.
      - `GET` lista y `GET [id]`: 401 / 404 / 403 / 200.
    - `src/__tests__/lib/ai-compatibility.test.ts` (11): el prompt incluye los dos nombres, los dos mapas, los cuatro sistemas con su puntaje, el conjunto y las tres cartas con su rol; estructura y prohibiciones; guía de cartas difíciles ("transformación"/"transformation"); versión en inglés; sin nombre de la otra persona; numerología del nombre sólo cuando existe; un nombre con saltos de línea queda en una línea; `describeMapForPrompt` quita la primera línea y un prompt armado con mapas reales no trae fechas ISO ni "Smith"; modelo `synthesis`, effort `medium`, 4000 tokens.
  - Commit `f9d676b`.
- **F-72: página `/compatibility`.**
  - `src/app/(main)/compatibility/page.tsx` (server, `auth()` → `redirect("/login?callbackUrl=/compatibility")`):
    - Cabecera con emblema de dos círculos.
    - Sin perfil: tarjeta con CTA a `/profile/setup`.
    - Con perfil: `CompatibilityForm` y la tarjeta "Qué comparamos".
    - "Tus lecturas de dos" (`CompatibilityHistory`): nombre o "Sin nombre", fecha de nacimiento formateada en UTC, fecha de la lectura y puntaje de conjunto como mini medidor `role="meter"`.
  - `layout.tsx`: `generateMetadata` con `compatibility.title`/`metaDescription`; el layout raíz agrega "| Arcana".
  - `CompatibilityForm` (client):
    - Campos: nombre (opcional, ≤ 60), fecha (`type="date"`, `min` 1900-01-01, `max` hoy) y nombre completo (opcional, ≤ 80, con la nota "Sólo se usa para el cálculo y no se guarda").
    - Costo visible "2 créditos" junto al saldo. Con saldo corto, botón deshabilitado y enlace a `/credits`.
    - Validación en cliente.
    - Estado de carga: tres cartas con `motion-safe:animate-pulse`, `role="status"`.
    - Errores con `role="alert"`: 403 con enlace a créditos, 404 con enlace al perfil, 422, 429, 500 (`generic`, el único que dice "no se cobró nada" sin saber más) y errores 400 llevados a su campo. Con 503 avisa que no se cobró nada, conserva lo escrito y el botón pasa a "Reintentar". 401 lleva a login.
    - Si se cae la red, o llega 502/504 o cualquier otro status inesperado, no se sabe si la lectura quedó guardada y cobrada (p. ej. timeout de la función después del cobro). Entonces muestra `errors.unconfirmed` ("No pudimos confirmar si la lectura quedó lista. Revisa tus lecturas de dos antes de intentarlo otra vez.") y llama `router.refresh()` para que la lista de abajo muestre la lectura si se guardó. No invita a reintentar.
    - Al terminar, `router.push("/compatibility/<id>")`.
  - Namespace `compatibility` al final de los dos `messages/*.json`, mismas llaves (verificado con node).
  - Commits `afbf382` y `9c80b9b`: se quitó `metaTitle` para no duplicar "| Arcana", y `aria-label` del enlace del historial para que el lector de pantalla también lea fechas y puntaje.
- **F-73: página `/compatibility/[id]`.**
  - `src/app/(main)/compatibility/[id]/page.tsx` (server; sólo el dueño; para cualquier otro, `notFound()`).
  - Cabecera: "{tu nombre} y {su nombre}", con nombre de pila del perfil o "La otra persona", fecha y etiqueta del conjunto.
  - **Cinco medidores** (`CompatibilityMeters` → `ScoreMeter`):
    - Conjunto (destacado), occidental, chino, numerología y tonalpohualli.
    - Barra de 5 segmentos hecha con divs, `role="meter"`, `aria-label` "Zodiaco chino: 4 de 5", `aria-valuenow`, puntaje visible "4/5".
    - Bajo cada barra, la pareja comparada (emoji + signo, números, glifo + tonalli) y el resumen bilingüe en el idioma de la interfaz.
  - **Tres cartas** con `TarotCardStatic` (`CompatibilityCards`): rol arriba (el nombre de la otra persona si lo hay, en hasta dos líneas con `line-clamp-2 break-words`), carta, nombre e insignia de invertida. Tamaño `md` en móvil y `lg` desde `sm`, con la misma URL de imagen.
  - Texto de la IA en párrafos, con títulos de sección (`ReadingText` sobre `toTextBlocks`).
  - Botón-enlace "Nueva lectura de dos" → `/compatibility`.
  - Animaciones con `FadeIn` dentro de `MotionSafe` (`MotionConfig reducedMotion="user"`).
  - Commit `306b510`.
- **F-74: tests y build.**
  - Además de los de F-70/F-71: `src/__tests__/components/CompatibilityForm.test.tsx` (14), `src/__tests__/components/CompatibilityDisplay.test.tsx` (10) y `src/__tests__/app/compatibility-reading-page.test.tsx` (4).
    - Formulario: costo y saldo, saldo corto, validación, éxito con el cuerpo exacto del POST, 503 que conserva valores y reintenta, 403 con enlace, error de fecha del servidor, 422/429/500 sin `refresh`, 502 y 504 → `errors.unconfirmed` + `router.refresh()`, y caída de red (`TypeError("Failed to fetch")`) → `errors.unconfirmed` + `refresh`, conservando lo escrito.
    - Página `/compatibility/[id]` (mocks de prisma, `next-intl/server` y `next/navigation`): sin sesión → `redirect` a login con `callbackUrl`; lectura de otro usuario → `notFound()`; inexistente → `notFound()`; el dueño ve el `h1`, los 5 medidores, las cartas, el texto y el enlace a nueva lectura.
    - `ScoreMeter` (segmentos llenos, `aria-*`, recorte).
    - Cinco medidores con sus puntajes en orden, textos en es/en y numerología del nombre sólo si existe.
    - Tres cartas con roles y nombre de la otra persona; títulos y párrafos del texto; historial vacío y con enlaces.
  - Un test de la API dependía de qué carta salía al azar. Se cambió para comprobar las cartas que realmente se tiraron. Se corrió 3 veces seguidas en verde.
  - Commit `9bf9d45`.
  - `npm run build` pasa (ver abajo).

**Exports** (para el integrador):

- `@/lib/compatibility`:
  - `computeCompatibility`
  - `COMPATIBILITY_COST`
  - `CARD_ROLES`
  - `parseBirthDateInput`
  - `toIsoDay`
  - `buildCompatibilitySummary`
  - `parseCompatibilitySummary`
  - `getStoredOverall`
  - `toTextBlocks`
  - `getNumberPairing`
  - `overallFromSum`, `OVERALL_SUM_RANGE`, `SYSTEM_SCORE_RANGES`
  - `RELATIONSHIP_NUMBERS`
  - `NUMBER_PAIRINGS`
  - `TONALLI_RESONANCES`
  - `OVERALL_LABELS`
  - tipos `CompatibilityResult`, `CompatibilitySummary`, `CompatibilityCard`, `CompatibilityScore`
- `@/lib/ai/compatibility`: `buildCompatibilityPrompt`, `generateCompatibilityReading`, `describeMapForPrompt`, `sanitizeName`, `COMPATIBILITY_MAX_TOKENS` (4000).
- `@/components/compatibility`: `CompatibilityForm` (client), `CompatibilityHistory`, `CompatibilityMeters`, `CompatibilityCards`, `ScoreMeter`, `ReadingText`, `MotionSafe` (client).
- Rutas: `/compatibility`, `/compatibility/[id]`, `GET|POST /api/compatibility`, `GET /api/compatibility/[id]`.

### Falsas o ya hechas

- **F-70 "choque → 1" no se cumple con la librería del Lote A:** `getChineseCompatibility` da **2** al choque (`src/lib/systems/chinese-zodiac.ts:346-352`). Es la decisión 8 del Lote A y está en sus PENDIENTES. No lo cambié porque `src/lib/systems/**` no es de este lote. El test lo fija en 2 ("scores a clash with the library's lowest Chinese score (Rat and Horse → 2, Lote A)"). "Mismo trino → 5" sí se cumple.

### Bloqueadas / handoffs

- **Integrador, F-81 (navegación):** enlace "Lectura de dos" a `/compatibility` en `src/components/layout/Header.tsx`, con `nav.compatibility` = "Reading for two" / "Lectura de dos" (tal como lo define la ficha).
- **Integrador, F-82 (dashboard):** en la sección "Explora" de `src/app/(main)/dashboard/page.tsx`, una tarjeta a `/compatibility`. Puede usar `t("compatibility.title")` y `t("compatibility.subtitle")`, que ya existen, para no agregar llaves.
- **Integrador, `src/middleware.ts`:**
  - Agregar `'/compatibility'` a `protectedRoutes` y `'/compatibility/:path*'` a `config.matcher`.
  - Las dos páginas ya redirigen a login con `auth()`, así que no es un hueco de seguridad; es consistencia con las demás páginas privadas, y con el middleware el redirect llega antes de renderizar.
  - Lo mismo aplica a las rutas nuevas de los otros lotes (`/blueprint`, `/calendar`, `/reading/manual` ya cae en `/reading`, `/history/insights` ya cae en `/history`).
- **Lote C (F-45):** la tarjeta "Lectura de dos" de la landing apunta a `/compatibility`. No hay nada más que cablear.
- **Sitemap:** `/compatibility` es privada, así que no va en `src/app/sitemap.ts`.
- **Bitácora:** el hook pidió actualizar `BITACORA.md`. No lo toqué porque está fuera de los archivos del lote; queda para la Fase 4.

### Decisiones tomadas (con motivo)

1. **`computeCompatibility(me, partner)` sin el parámetro `locale`** que muestra F-70. El resultado es bilingüe completo (`{ en, es }` en cada texto), así que la página lo muestra en el idioma de la interfaz aunque la lectura se haya hecho en el otro. El idioma sólo importa en el prompt, que lo recibe aparte. Un parámetro sin uso habría sido ruido; el único consumidor es este lote.
2. **`a`/`b` como objetos** en occidental, chino y tonalli (nombre/etiqueta + emoji/glifo + elemento/rumbo), no sólo la etiqueta, para que la página los pinte sin recalcular. En numerología, `a`/`b` son los caminos de vida, como dice el contrato.
3. **Puntajes nuevos** (el plan sólo fijaba los del Lote A):
   - **Numerología:** familias 1-5-7 / 2-4-8 / 3-6-9 (los maestros cuentan como su raíz: 11→2, 22→4, 33→6). Mismo número 5 y misma familia 5 (en la revisión se subió el mismo número de 4 a 5 para que nunca puntúe menos que la familia); familias distintas 3. Con los dos nombres completos, se promedia con la misma comparación de los números de expresión, redondeando.
   - **Tonalpohualli:** mismo tonalli, mismo signo o misma trecena 5; mismo rumbo 4; distinto 3. Los textos lo presentan como resonancia dentro de la tradición, no como compatibilidad que la tradición defina.
   - **Conjunto (decisión de Fable en la revisión):** la suma de los cuatro reescalada a 1–5 con los mínimos y máximos posibles. Con las escalas actuales, suma 10–20: 10 → 1, 12 → 2 (1.8), 15 → 3, 17 → 4 (3.8), 20 → 5.
4. **Cinco medidores = conjunto + cuatro sistemas.** F-73 dice "cinco medidores por sistema" y los sistemas comparados son cuatro.
5. **Orden en la transacción:** primero `spendCredits` y después `create`, como pidió el coordinador. Si el débito falla, se lanza antes de crear y la transacción se revierte. La `CreditTransaction` va sin `readingId`: esa columna es FK a `Reading`, no a `CompatibilityReading`.
6. **Idioma de la lectura:** `locale` del cuerpo (`en`/`es`, el formulario manda el de la interfaz); si no viene, `UserProfile.locale`; si tampoco, `es`.
7. **Privacidad:**
   - El nombre completo de la otra persona sólo alimenta la numerología. No se guarda ni va al prompt; el mapa resumido incluye sus números, no el nombre.
   - De la persona que pide la lectura sólo va al prompt el nombre de pila.
   - El nombre escrito pasa por `sanitizeName` (una línea, sin caracteres de control, ≤ 60) antes de entrar al prompt.
8. **Lectura ajena:** la página responde 404 (`notFound()`, no revela que existe) y la API `GET [id]` responde 403, consistente con F-51 (resonancia).
9. **Fechas:** se construyen con `Date.UTC`. Rango 1900-01-01…hoy (UTC) en la API. En el formulario, `max` es el hoy local; el servidor manda.
10. **Movimiento reducido:** `FadeIn` no consulta `prefers-reduced-motion`, así que las páginas van dentro de `MotionSafe` (`MotionConfig reducedMotion="user"`). Con la preferencia activa, framer-motion quita el desplazamiento y deja la opacidad. La animación de carga usa `motion-safe:`.
11. **Enlaces con estilo de botón** en lugar de `<Link><Button/></Link>`, que anida un botón dentro de un enlace (HTML inválido, mal para teclado y lector de pantalla).
12. **Texto de la IA en texto plano** con títulos en línea propia. `toTextBlocks` reconoce como título una línea ≤ 60 caracteres (o marcada con `##`/`**`) que no termina en puntuación, ni siquiera seguida de comillas o paréntesis de cierre (`/[.!?…;,]["'”»’)]*$/`), y que no empieza con `¿ ¡ « " “`. La pinta como `h3`; los dos puntos finales sí cuentan como título ("Qué cuidar:").
13. **Peso:** `/compatibility` y `/compatibility/[id]` cargan 185 kB de First Load JS contra 142 kB de `/reading/[id]`. La diferencia es framer-motion (`FadeIn` + `MotionConfig`), que la regla 10 pide reutilizar.
14. **Commits por ficha** en el worktree, como pidió el coordinador. §6 decía "sin commits en los lotes"; manda la instrucción más reciente.

### PENDIENTES (decisión del dueño del producto)

- **Precio:** 2 créditos por lectura de dos, sin lecturas gratis (provisional de Fable, §7).
- **Escala visible:**
  - Desde la revisión, el conjunto usa todo el rango 1–5. El par menos afín posible (fuego–agua, choque chino, números de familias distintas, rumbos distintos) ve "1/5 · Mucho que aprender uno del otro".
  - Los medidores de cada sistema siguen con sus mínimos (occidental y chino 2, numerología y tonalli 3).
  - Que Memo confirme que le gusta ver un 1/5 en el conjunto con ese tono.
  - El choque chino como 2/5 ya estaba en PENDIENTES del Lote A.
- **Textos:** que Memo revise los nueve resúmenes del número del vínculo, las cinco resonancias del tonalli, las etiquetas del conjunto y los avisos del formulario. Para el tonalli aplica lo mismo que pidió el Lote A: si quiere, que alguien de la tradición revise la lectura por rumbos.
- **Trazabilidad del cobro:** la `CreditTransaction` `COMPATIBILITY` no queda ligada a la lectura. Ligarla requiere una columna nueva (`compatibilityReadingId`), es decir, un cambio de esquema que sólo corre Fable.

### Correcciones de revisión (commit `fix(compatibility): apply review corrections (F-70..F-74)`)

Todo dentro del mismo alcance del lote.

1. **Sin fechas exactas en el prompt.** `describeMapForPrompt` (en `src/lib/ai/compatibility.ts`) quita la primera línea de `describeBlueprintForAI`. La ruta la usa para los dos mapas. Tests: el prompt no contiene ninguna fecha ISO ni "Smith" (API y prompt); los fixtures de `ai-compatibility.test.ts` ya no traen la línea con fecha.
2. **Cartas difíciles.** "Nunca hables de muertes literales…" y la guía de La Torre, la Muerte, el Diablo y el 10 de Espadas como transformación, finales necesarios o patrones, no como fin del vínculo (en/es). Test: pide "transformación"/"transformation".
3. **`COMPATIBILITY_MAX_TOKENS = 4000`.** Tests actualizados en `ai-compatibility.test.ts` y `api/compatibility.test.ts`.
4. **`errors.unconfirmed`** para caída de red, 502/504 y cualquier status inesperado, con `router.refresh()`. `generic` queda sólo para 500. Llave nueva en en/es (651 = 651). Tests: `TypeError("Failed to fetch")`, 502 y 504.
5. **Conjunto reescalado** con `overallFromSum` y los rangos calculados de las constantes (`SYSTEM_SCORE_RANGES`, `OVERALL_SUM_RANGE`). Mismo número de vida = 5 (igual que misma familia). Tests: el par más afín da 5 y el menos afín 1; los dos pares se buscan entre fechas reales. Además, el mismo número puntúa ≥ que la misma familia.
6. **`toTextBlocks`:** no toma como título lo que empieza con `¿ ¡ « " “` ni lo que termina en puntuación seguida o no de comillas o paréntesis. Test con «¿Qué quieren cuidar juntos?» y otros seis casos.
7. **`CompatibilityCards`:** el rol usa `line-clamp-2 break-words` en vez de `truncate`.
8. **Tests que faltaban:**
   - API: `freeReadingsLeft: 3` + `credits: 0` → 403 sin llamar a la IA.
   - Página: `src/__tests__/app/compatibility-reading-page.test.tsx`, con lectura de otro usuario → `notFound()`, más inexistente, sin sesión y dueño.
9. **(Opcional, hecho)** `NUMBER_PAIRINGS.same` ya no repite "El reto es no reforzar los mismos puntos ciegos". Ahora dice "…se reconocen al instante y avanzan al mismo paso. Les ayuda buscar juntos lo que a ninguno de los dos le resulta fácil ver."

### Comandos corridos al final y su resultado (jest / tsc / lint / build)

Primera entrega: corridos sobre `9bf9d45`. Después de la revisión: ver la tabla "Después de las correcciones".

| Comando | Resultado |
|---|---|
| `npx jest` (suite completa) | **43 suites, 670 tests, todos verdes** (exit 0). Lote 0 cerró con 30/357 y el Lote A sumó 8 suites; las 5 suites nuevas son de este lote |
| `npx jest` (sólo lo del lote) | 5 suites, 98 tests verdes: `lib/compatibility` 42, `lib/ai-compatibility` 8, `api/compatibility` 27, `components/CompatibilityForm` 11, `components/CompatibilityDisplay` 10 |
| `npx tsc --noEmit` | **0 errores** (exit 0) |
| `npm run lint` | **exit 0: 0 errores, 23 avisos**, los mismos 23 de la línea base del Lote 0 (ninguno en archivos de este lote) |
| `npm run build` | **exit 0**: compila con Next 15.5.29 (sólo el aviso de `jose` en Edge que ya existía), 53/53 páginas; `ƒ /compatibility` y `ƒ /compatibility/[id]` (185 kB First Load JS), `ƒ /api/compatibility` y `ƒ /api/compatibility/[id]` |
| Paridad de llaves `messages/en.json` / `es.json` | idénticas: 650 = 650, 0 llaves de un solo lado; el namespace `compatibility` es el último en los dos archivos; CRLF conservado |

**Después de las correcciones de revisión** (mismo árbol que el commit `fix`):

| Comando | Resultado |
|---|---|
| `npx jest` (sólo lo del lote) | **6 suites, 114 tests verdes**: `lib/compatibility` 47, `lib/ai-compatibility` 11, `api/compatibility` 28, `components/CompatibilityForm` 14, `components/CompatibilityDisplay` 10, `app/compatibility-reading-page` 4 |
| `npx jest` (suite completa) | **44 suites, 686 tests, todos verdes** (exit 0) |
| `npx tsc --noEmit` | **0 errores** (exit 0) |
| `npm run lint` | **exit 0: 0 errores, 23 avisos** (los de la línea base; ninguno del lote) |
| `npm run build` | Lo corrí aunque no cambiaron rutas ni metadata, sólo el cuerpo de `api/compatibility/route.ts`. El primer intento falló al prerenderizar `/sitemap.xml`: `src/app/sitemap.ts`, que no es del lote, lee `prisma.card.findMany()` al compilar, y la base de producción no respondió ("Can't reach database server at aws-0-us-west-2.pooler.supabase.com:5432"). Fue un fallo de red, no del código. **El segundo intento salió exit 0**: compilado en 56 s, 53/53 páginas, las cuatro rutas del lote sin cambio de tamaño. Ojo integrador: el build depende de que la base responda por el sitemap. |
| Paridad de llaves | idénticas: **651 = 651** (+`compatibility.errors.unconfirmed` en los dos) |

Commits de la rama `capataz/lote-F` (sobre `d5b646a`, sin push):

| Ficha | Commit | Mensaje |
|---|---|---|
| F-70 | `4b78a00` | feat(compatibility): multi-system compatibility engine (F-70) |
| F-71 | `f9d676b` | feat(compatibility): reading-for-two API with charge-after-AI (F-71) |
| F-72 | `afbf382` | feat(compatibility): reading-for-two page with form and history (F-72) |
| F-73 | `306b510` | feat(compatibility): reading-for-two detail page (F-73) |
| F-72 | `9c80b9b` | fix(compatibility): page title and accessible history links (F-72) |
| F-74 | `9bf9d45` | test(compatibility): form, meters, cards and history; stable card-name checks (F-74) |
| — | `3f4e464` | docs(partes): Lote F report (F-70..F-74) |
| Revisión | (este) | fix(compatibility): apply review corrections (F-70..F-74) |

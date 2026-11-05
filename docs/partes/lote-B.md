## Parte Lote B

Rama `capataz/lote-B` (worktree `C:/Users/guill/dev/arcana-lotes/lote-B`), base `d5b646a`. Sólo los archivos del lote. Sin `git push`, sin `prisma db push/migrate`, sin `npm install`, sin `npm run dev` ni nada que escriba en la base (las pruebas usan mocks de Prisma y de `@/lib/ai/config`).

### Hechas

- **F-30: API.** Tres rutas, las cuatro con `rateLimit(req, 3, 60000)` → 429 y `auth()` → 401.
  - `GET /api/blueprint` → `{ blueprint: ArcanaBlueprint, synthesis: string | null, shareId: string | null }`. Sin perfil → `404 { error: "profile_required" }`. `synthesis` sólo sale si `ArcanaProfile.inputsHash` = `sha256(YYYY-MM-DD|fullName.trim()|locale)` del perfil actual.
  - `POST /api/blueprint/synthesis` → `{ synthesis, shareId, cached }`. Gratis. Con el mismo hash devuelve la guardada sin llamar a la IA (`cached: true`). Si no, genera con `complete` (modelo `AI_MODELS.synthesis`, effort `medium`, `maxTokens` 2500) y hace `upsert` por `userId` con `locale`, `synthesis`, `inputsHash` y `version`. IA caída o error inesperado → `503 { error: "synthesis_unavailable", retry: true }`; `AIRefusalError` → `422 { error: "synthesis_refused" }`; en los dos casos no se guarda nada. `export const maxDuration = 60`.
  - `POST /api/blueprint/share` → `{ shareId, sharePath: "/share/blueprint/<id>" }`. Crea el id con `nanoid(10)` sólo si no existe, con `updateMany({ where: { userId, shareId: null } })`: dos peticiones simultáneas terminan con un solo enlace (si `count === 0`, relee y devuelve el que ganó). Sin síntesis guardada (no hay fila `ArcanaProfile`) → `409 { error: "synthesis_required" }`. `DELETE` pone `shareId: null` → `{ shareId: null }` (idempotente).
  - Archivos: `src/app/api/blueprint/route.ts`, `src/app/api/blueprint/synthesis/route.ts`, `src/app/api/blueprint/share/route.ts`. Commit `87cc2bf`.
- **F-31: prompt de síntesis.** `src/lib/ai/blueprint-synthesis.ts`: system prompt en es y en (espejo, no bola de cristal; agencia; tonalpohualli como tradición viva; sin clichés esotéricos; lenguaje neutro si no se sabe el género; nada de predicciones; sin inventar ascendente ni hora; sin años ni fechas; texto plano sin Markdown; 350–450 palabras; "Responde siempre en español" / "Always respond in English"). Estructura pedida: (1) retrato en un párrafo, (2) dónde convergen y qué sistemas coinciden, (3) una tensión y cómo vivirla, (4) tres preguntas para los próximos doce meses, una por línea. Prompt de usuario = nombre de pila + `describeBlueprintForAI(bp, locale)`. Exporta también `toBlueprintLocale`, `getFirstName`, `blueprintInputsHash` (con `node:crypto`), `generateBlueprintSynthesis` y las constantes. Commit `87cc2bf`.
- **F-32: página `/blueprint`.** Server component con `auth()` → `redirect("/login?callbackUrl=/blueprint")`. Sin perfil: tarjeta con enlace a `/profile/setup`. Con perfil:
  - Héroe: figura decorativa de los cinco sistemas en un pentágono unidos a la inicial (`BlueprintConstellation`, `aria-hidden`), nombre de pila, fecha de nacimiento (formateada en UTC), luna al nacer, las cinco insignias (`BlueprintBadges`: ♋ Cáncer · 🐴 Caballo de Metal · 🐍 12 Cóatl · 12 Serpiente · Camino de vida 5 · El Hierofante) y enlace "Ir a tu síntesis".
  - Cinco `SystemCard`: cartas natales (ancho completo, con `TarotCardStatic` e `imageUrl` de `prisma.card.findMany({ where: { name: { in } } })`; si la consulta falla o falta la carta, sale el placeholder), zodiaco occidental (elemento, modalidad, regente, carta del signo), chino (polaridad, año lunar, afines, amigo secreto), tonalpohualli (trecena, rumbo, patrono, señor de la noche y la nota de `TONALPOHUALLI_INTRO`), numerología (camino de vida con nombre y descripción, expresión, alma, personalidad, cumpleaños, año personal).
  - `SynthesisPanel` (client): "Generar mi síntesis" → POST; carga con figura animada sólo con `motion-safe` y mensajes por paso (lector de pantalla: un solo `role="status"`); texto en párrafos con las preguntas finales aparte (`SynthesisText`, con `lang` del perfil); errores 503/422/429/404 con mensaje propio y "Intentar de nuevo"; si el perfil cambió, aviso y "Actualizar mi síntesis"; foco al título al terminar.
  - `BlueprintShare` (client) dentro del panel: crea el enlace y lo copia, campo de sólo lectura, "Copiar" con `aria-label`, "Compartir…" nativo si el navegador lo tiene, "Dejar de compartir" (DELETE).
  - Metadata en `src/app/(main)/blueprint/layout.tsx` (`generateMetadata` con `blueprint.meta`); `loading.tsx` con esqueleto. Entrada escalonada con `Reveal` (keyframe CSS bajo `motion-safe:`, sin JS; ver Decisiones 10).
- **F-33: página pública `/share/blueprint/[shareId]`.** Sin sesión, fuera de `(main)`, con su propia cabecera mínima y `<main id="main-content">`. Muestra nombre de pila, figura, las cinco insignias y la síntesis (sólo si su hash sigue coincidiendo con el perfil; si no, "Este mapa no tiene síntesis por ahora"); CTA "Descubre tu Mapa Arcano" → `/register` y "Ya tengo cuenta" → `/login`. `generateMetadata` con `robots: { index: false }`, título "El Mapa Arcano de {nombre}" y descripción con las insignias (para la vista previa en WhatsApp), `openGraph`/`twitter` con `/og-image.jpg`. Id inválido o inexistente → `notFound()`. Nunca expone el nombre completo ni la fecha: el blueprint se calcula en el servidor y a la página sólo llegan nombre de pila, insignias y síntesis. Consulta compartida entre metadata y página con `cache()` de React.
- **F-34: widget y perfil.**
  - `BlueprintWidget({ userId })` (server, `src/components/dashboard/BlueprintWidget.tsx`): sin perfil → "Completar mi perfil" a `/profile/setup`; con perfil → las cinco insignias, "Tu síntesis está lista" o "Genera tu síntesis, es gratis", y "Ver mi mapa" a `/blueprint`. Pensado para media columna (`h-full`).
  - `profile/setup/page.tsx`: al guardar ya no salta al dashboard a los 1.5 s; aparece un bloque "Tu Mapa Arcano está listo" con **"Ver mi Mapa Arcano"** (`/blueprint`), **"Continuar a Suscripción"** (`profile.continue`, que existía sin usarse; se oculta si la suscripción ya está activa, leyendo `/api/subscription`) y "Ir a mi espacio" (`/dashboard`). El foco va al bloque.
  - Handoff del Lote A aplicado: la vista previa del signo usa `getWesternSign(date)` (campos UTC) y muestra `emoji` + `name[locale]` con `getWesternSignByKey`. Se importa de `@/lib/systems/western` y no del barril para no meter los cinco sistemas en el bundle de esta página client. Fecha inválida mientras se escribe → conserva el signo anterior en vez de romper.
- **F-35: tests.** Ver la tabla de comandos.
  - `src/__tests__/api/blueprint.test.ts` (21): 401, 404 `profile_required`, 429 sin tocar la base ni la IA; GET con síntesis vigente / vieja; **el cache por hash evita llamar a la IA**; genera con `AI_MODELS.synthesis` + `medium` + 2500 y hace upsert con el hash; regenera si el hash cambió; idioma del perfil; 503 (IA caída y error inesperado) y 422 sin guardar; **share crea el id una sola vez** (`nanoid` llamado una vez, segundo POST devuelve el mismo); carrera de dos POST; 409 sin síntesis; DELETE.
  - `src/__tests__/lib/blueprint-synthesis.test.ts` (10): **el prompt incluye el nombre y los cinco sistemas** en es y en (y los signos reales de 1990-07-15), las cuatro partes en orden, sin línea de nombre si no hay nombre, opciones de `complete`, fórmula exacta del hash, UTC, helpers.
  - `src/__tests__/components/blueprint.test.tsx` (18): insignias (orden, etiquetas es/en, numeral romano), `toRoman`, `traitList`, roles de cartas natales (5/5 → una; 20/2; 19/1/10), fecha en UTC, `splitSynthesis` (quita Markdown, marca las preguntas finales); `BlueprintBadges` accesible; `Reveal` (sólo `motion-safe`, retraso); `SynthesisPanel` (genera y muestra, estado de carga, 503 + reintento, 422, 429, síntesis guardada sin llamar a la API, nota de idioma con `lang`, aviso de perfil cambiado); `BlueprintShare` (crea, muestra y copia; DELETE; 409).
  - `src/__tests__/components/profile-setup.test.tsx` (4): con el huso de Ciudad de México que fija `jest.config.ts`, **21 de marzo → Aries** (con el código anterior salía Piscis), cambio en la cúspide → Piscis, tras guardar no redirige y ofrece `/blueprint`, `/subscribe` y `/dashboard` con el foco en el bloque, y sin "suscribirse" si ya está activa.

### Falsas o ya hechas

- **F-34, parte "junto al de suscribirse":** en `src/app/(main)/profile/setup/page.tsx` (base `d5b646a`) no había botón de suscribirse; al guardar mostraba "Perfil guardado" y a los 1.5 s hacía `router.push("/dashboard")` (`:109-113`). La llave `profile.continue` ("Continuar a Suscripcion") existía en `messages/*.json:577` sin usarse. Lo resolví creando el bloque de siguientes pasos descrito arriba (ver Decisiones).

### Bloqueadas / handoffs

- **Integrador (F-81), `src/components/layout/Header.tsx` + `messages/*.json` `nav`:** agregar en el menú de usuario **Mi Mapa Arcano** → `/blueprint` con la llave `nav.blueprint` = `"My Arcana Map"` / `"Mi Mapa Arcano"` (no la toqué: el namespace `nav` no es de este lote).
- **Integrador (F-82), `src/app/(main)/dashboard/page.tsx`:** `import { BlueprintWidget } from "@/components/dashboard/BlueprintWidget";` y `<BlueprintWidget userId={session.user.id} />` en la fila de dos columnas junto a `TodayEnergiesWidget` (el widget ya trae `h-full`). La tarjeta "Explora" a `/blueprint` puede usar `blueprint.meta.title` / `blueprint.meta.description` o sus propias llaves.
- **Opcional, `src/app/globals.css:22-24`:** `html { scroll-behavior: smooth; }` aplica también con movimiento reducido (afecta al enlace "Ir a tu síntesis" y a todos los anclas de la app). Cambio sugerido: envolverlo en `@media (prefers-reduced-motion: no-preference) { … }`.
- **Opcional, `src/middleware.ts`:** agregar `'/blueprint'` a `protectedRoutes` y `'/blueprint/:path*'` al `matcher`, como las demás páginas privadas. No es necesario para que funcione (la página ya hace `redirect("/login?callbackUrl=/blueprint")` en el servidor); sólo ahorra el render. `/share/blueprint/*` debe seguir **fuera** del middleware (es pública).

### Decisiones tomadas (con motivo)

1. **Compartir exige una síntesis guardada (409 `synthesis_required`).** `ArcanaProfile.synthesis` e `inputsHash` no son opcionales en el esquema, así que no hay fila que guarde un `shareId` sin síntesis salvo con un texto vacío falso. Además, la tarjeta pública sin síntesis pierde casi todo su valor. La UI sólo muestra "Compartir" cuando ya hay síntesis.
2. **Si el perfil cambia, la síntesis vieja no se muestra** (ni en `/blueprint` ni en la página pública): hablaría de otra fecha o de otro nombre. En `/blueprint` sale "Tu perfil cambió… Actualizar mi síntesis"; el enlace público sigue vivo y muestra las insignias nuevas sin síntesis hasta que se regenere (el `upsert` conserva el `shareId`).
3. **El prompt lleva sólo el nombre de pila**, no el nombre completo: basta para hablarle a la persona, los números del nombre ya van en `describeBlueprintForAI`, y así sale menos dato personal hacia la IA y hacia la página pública.
4. **"Tres preguntas para los próximos doce meses" y "no menciones años ni fechas"**: el hash del contrato (`birthDate|fullName|locale`) no incluye el año, así que una síntesis de 2026 sigue en caché en 2027. Con esa redacción el texto no envejece de forma visible (ver PENDIENTES).
5. **`version` = versión del prompt** (`BLUEPRINT_SYNTHESIS_VERSION = 1`), no contador de regeneraciones. Permite, si un día cambia el prompt, saber qué síntesis se escribieron con cuál. No entra en la comparación de caché (el contrato dice sólo hash).
6. **Rate limit 3/min en las cuatro rutas**, como dice la ficha. La UI no llama a `GET /api/blueprint` (la página es server component), así que no le afecta. POST y DELETE de share comparten la llave (misma ruta): 3 cambios por minuto entre los dos.
7. **Locale del perfil normalizado**: cualquier valor distinto de `"en"` cuenta como `"es"` (el default de la app); la síntesis sale en el idioma del perfil y la interfaz en el de la cookie. Si difieren, el panel dice "Escrita en inglés, el idioma de tu perfil" y el texto lleva `lang`.
8. **Al guardar el perfil ya no se redirige solo** (antes saltaba al dashboard a los 1.5 s): con redirección, los botones que pide F-34 desaparecerían antes de poder usarlos. "Ir a mi espacio" conserva ese camino. El botón de suscribirse usa la llave existente `profile.continue` y se oculta si `/api/subscription` dice `active`.
9. **Enlaces con estilo de botón** (`src/components/blueprint/link-styles.ts`) en lugar de `<Link><Button/></Link>`: un `<button>` dentro de un `<a>` es HTML inválido y confunde a los lectores de pantalla. Mismos colores y tamaños que `Button`.
10. **`Reveal` (CSS) en lugar de `FadeIn` (framer-motion).** La primera versión usaba `FadeIn` como sugiere la regla 10, y el build lo midió: `/blueprint` era **la única página de la app con framer-motion** (42.2 kB de JS propio, 194 kB de primera carga), y `FadeIn` renderiza en el servidor con `opacity: 0` hasta que hidrata, así que en un celular lento el héroe y las tarjetas quedan en blanco hasta que llega el JS. `Reveal` (`src/components/blueprint/Reveal.tsx`) hace la misma subida suave con un `@keyframes` (React lo sube a `<head>` una vez) y `motion-safe:`: empieza con el primer pintado, no carga librería y no se mueve con movimiento reducido. Las demás animaciones (carga de la síntesis, anillo de la figura, esqueleto) también van con `motion-safe:`. No toqué `FadeIn` (no es de este lote). Cifras en la tabla de comandos.
11. **El widget no usa `aria-label` en "Ver mi mapa"**: el texto visible ya es claro junto al título de la tarjeta y un `aria-label` distinto rompería "label in name" (WCAG 2.5.3) en inglés.
12. **Avisos de lint ajenos que quedan en `profile/setup/page.tsx`** (`Badge` importado sin usar y `getLocalizedFocusArea` sin usar, de antes): no los toqué para no "aprovechar para limpiar" (regla 2). Los imports de `zodiac.ts` y `useRouter` sí se fueron porque mi cambio los dejó sin uso.
13. **Módulos separados para no inflar bundles client.** `splitSynthesis` vive en `synthesis-blocks.ts` (sin dependencias) y no en `view-model.ts`, que importa `@/lib/systems`: así `SynthesisPanel` no arrastra los cinco sistemas al navegador (−8 kB compartidos en `/blueprint` y `/share/blueprint`). Las páginas y el widget importan cada componente por su archivo y no por el barril `@/components/blueprint`: Next agrega al bundle de una ruta todos los componentes client que referencia un barril importado, y el widget va a vivir en el dashboard. `profile/setup` importa `getWesternSign` de `@/lib/systems/western` por lo mismo.

### PENDIENTES (decisión del dueño del producto)

- **Privacidad de la tarjeta pública:** la página no muestra la fecha de nacimiento, pero las cinco insignias juntas casi la delatan (el zodiaco chino con elemento da el año dentro de un ciclo de 60, el signo occidental da un rango de ~30 días y el tonalli fija un día dentro de un ciclo de 260: en ese rango sólo cabe uno). El aviso al compartir dice "verá tu nombre de pila, tus cinco signos y tu síntesis". Decidir si basta o si la versión pública debe omitir el tonalli o el año chino.
- **¿Renovar la síntesis cada año o en cada cumpleaños?** Hoy se genera una vez por combinación de fecha/nombre/idioma y vive para siempre. Si se quiere una por año, habría que meter el año en el hash (cambio de contrato de §4.6) o invalidar por `updatedAt`.
- **Costo:** la síntesis es gratis (decisión provisional de §7) y usa el modelo `synthesis` con effort `medium`; el caché por hash y el rate limit limitan el gasto a una llamada por cambio de perfil.
- **Textos de la página y del prompt** (es/en) a revisión de Memo, sobre todo "Generar mi síntesis", el aviso de compartir y la regla de 350–450 palabras.

### Comandos corridos al final y su resultado (jest / tsc / lint / build)

Corridos en el worktree sobre `dfdfa5f` (el código final; después sólo se commiteó este parte).

| Comando | Resultado |
|---|---|
| `npx jest src/__tests__/api/blueprint.test.ts src/__tests__/lib/blueprint-synthesis.test.ts` | 2 suites, **31/31 verdes** |
| `npx jest src/__tests__/components/blueprint.test.tsx src/__tests__/components/profile-setup.test.tsx` | 2 suites, **21/21 verdes** (17 + 4); el test de `Reveal` se agregó después y corre verde en la suite completa (18 + 4) |
| `npx jest` (toda la suite) | **42 suites, 625/625 verdes** (base 38 suites / 572 de Lote 0 + Lote A; este lote suma 4 suites y 53 tests) |
| `npx tsc --noEmit` | **exit 0, 0 errores** |
| `npm run lint` | **exit 0: 0 errores, 23 avisos**, los mismos 23 de la línea base del Lote 0; ninguno en archivos nuevos. Los dos de `profile/setup/page.tsx` (`Badge`, `getLocalizedFocusArea`) ya estaban (ver Decisiones 12) |
| `npm run build` | **exit 0**, compila, 55/55 páginas. Rutas nuevas: `/blueprint` ƒ, `/share/blueprint/[shareId]` ƒ, `/api/blueprint`, `/api/blueprint/synthesis`, `/api/blueprint/share` |
| Paridad `messages/en.json` / `es.json` (node, recorrido recursivo de llaves) | JSON válido; **693 llaves en cada uno, 0 de un solo lado**; `blueprint` (109 llaves) es el último namespace en ambos |

Primera carga de JS medida en el build (Decisiones 10 y 13):

| Ruta | Con `FadeIn` + barril | Final |
|---|---|---|
| `/blueprint` | 42.2 kB propio · 194 kB primera carga | **3.24 kB · 144 kB** |
| `/share/blueprint/[shareId]` | 1.06 kB · 153 kB | **249 B · 141 kB** (igual que `/share/[shareId]`) |
| `/profile/setup` | 7.19 kB · 148 kB | 7.16 kB · 147 kB |
| `/dashboard` (sin el widget montado todavía) | 1.18 kB · 141 kB | 1.18 kB · 141 kB |

No verificado en navegador: no corrí `npm run dev` (el `.env` apunta a producción). La revisión visual a 360 px y con movimiento reducido queda para el preview de Vercel (Fase 4).

### Rutas y componentes exportados

| Tipo | Nombre | Firma / props |
|---|---|---|
| Página privada | `/blueprint` | server; `redirect("/login?callbackUrl=/blueprint")` sin sesión |
| Página pública | `/share/blueprint/[shareId]` | server; `robots: { index: false }`; `notFound()` |
| API | `GET /api/blueprint` | → `{ blueprint, synthesis: string \| null, shareId: string \| null }`; 401, 404 `profile_required`, 429 |
| API | `POST /api/blueprint/synthesis` | → `{ synthesis, shareId, cached }`; 401, 404, 422 `synthesis_refused`, 429, 503 `synthesis_unavailable` + `retry: true`; `maxDuration = 60` |
| API | `POST /api/blueprint/share` | → `{ shareId, sharePath }`; 401, 409 `synthesis_required`, 429 |
| API | `DELETE /api/blueprint/share` | → `{ shareId: null }`; 401, 429 |
| Widget | `BlueprintWidget` (`@/components/dashboard/BlueprintWidget`) | `({ userId: string })`, server, async |
| Componente | `SynthesisPanel` (client) | `{ initialSynthesis: string \| null; isStale: boolean; initialShareId: string \| null; synthesisLocale: "en" \| "es"; uiLocale: "en" \| "es" }` |
| Componente | `BlueprintShare` (client) | `{ initialShareId: string \| null }` |
| Componente | `SystemCard` | `{ symbol: string; symbolIsText?; eyebrow: string; title: string; subtitle?; traits?: string[]; description?; details?: { label; value }[]; footnote?; accent?: "amber" \| "purple" \| "emerald"; className?; children? }` |
| Componente | `BlueprintBadges` | `{ badges: BlueprintBadge[]; label: string; size?: "sm" \| "md"; className? }` |
| Componente | `BlueprintConstellation` | `{ badges: BlueprintBadge[]; center: string; className? }` (decorativo) |
| Componente | `SynthesisText` | `{ text: string; lang: "en" \| "es"; questionsTitle: string }` |
| Componente | `Reveal` | `{ children; delay?: number /* ms */; className? }` (CSS, `motion-safe`) |
| Helpers | `@/components/blueprint/view-model` | `getBlueprintBadges(bp, locale, t)`, `getBirthCardRoles(cards)`, `traitList(text, locale)`, `toRoman(n)`, `majorArcanaName(i, locale)`, `formatBirthDate(isoDay, locale)`; `splitSynthesis(text)` (en `synthesis-blocks.ts`, reexportado) |
| Helpers | `@/components/blueprint/link-styles` | `linkButtonClass(variant?, size?, className?)` |
| Lib | `@/lib/ai/blueprint-synthesis` | `toBlueprintLocale(locale)`, `getFirstName(fullName)`, `blueprintInputsHash(birthDate, fullName, locale)`, `buildBlueprintSynthesisPrompt(bp, locale)`, `generateBlueprintSynthesis(bp, locale)`, `BLUEPRINT_SYNTHESIS_MAX_TOKENS` (2500), `BLUEPRINT_SYNTHESIS_EFFORT` ("medium"), `BLUEPRINT_SYNTHESIS_VERSION` (1) |

Llaves nuevas: namespace `blueprint` al final de `messages/en.json` y `messages/es.json` (mismas llaves). Llaves que **cablea el integrador** (no son de este lote): `nav.blueprint` = `"My Arcana Map"` / `"Mi Mapa Arcano"`.

### Commits (rama `capataz/lote-B`, sin push)

| Ficha | Commit | Mensaje |
|---|---|---|
| F-30, F-31 (+ tests de F-35) | `87cc2bf` | feat(blueprint): arcana map API with cached AI synthesis (F-30, F-31) |
| F-32, F-33 (+ `messages`, tests) | `d103479` | feat(blueprint): arcana map page, synthesis panel and public share page (F-32, F-33) |
| F-34 (+ test del perfil) | `c0ad613` | feat(blueprint): dashboard widget, profile next steps and UTC sign preview (F-34) |
| F-32, F-33, F-34 | `dfdfa5f` | perf(blueprint): CSS reveal instead of framer-motion and lean client bundles (F-32, F-33, F-34) |
| F-35 | (este) | docs(partes): Lote B report (F-30..F-35) |

`npm-ci.log` (de la preparación del worktree) quedó sin commitear a propósito.

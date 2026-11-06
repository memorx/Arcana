## Parte L1 · Portada (rediseño «Dos tintas», Fase 2)

Rama `rediseno/f2-L1` (worktree `C:/Users/guill/dev/arcana-lotes/f2-L1`), base `84224fd` + dos fusiones de
`rediseno/dos-tintas` (`6a30e3b` red de desbordes estricta; `acf8ef1` acentos de `es.json` y specs del menú móvil). Sin
`git push`, sin `prisma db push`, sin `npm run dev`. Servidor local sólo con `npm run dev:e2e` y `node scripts/e2e-db.mjs
serve` contra `arcana_e2e_l1` en `:3011`. La base de producción sólo la lee `npm run build` (sitemap); la portada es
dinámica y no se prerenderiza.

### Hecho

| Ficha | Commit | Qué |
|---|---|---|
| Textos | `bbf0ee2` | `landing.portada.*` en es/en (append-only, 67 líneas por archivo): las seis escenas, la carta del día, «Más que tarot» (CTA por lámina y la quinta, «Mi historia»), el día de hoy, el pliego de preguntas y «Tu turno». |
| Escenas | `255f82e` | `src/app/page.tsx` reescrita sobre `src/components/landing/*` y `portada.css` (detalle abajo). |
| Pruebas | `133bb9a` | `src/__tests__/app/landing.test.tsx` (reescrito, 16), `src/__tests__/components/portada.test.tsx` (nuevo, 9), `CollectivePulse.test.tsx` (+1, imagen de `cartaImagen`). |
| Ajustes vistos en capturas | `4a111c0`, `0d427d4`, `799b24c` | Mensaje de la carta en una columna, marquesina quieta como retícula, grabado y lectura sin encimarse en escritorio quieto, señores de la noche largos a 360. |
| e2e de la portada | `b07ce8e` | `e2e/home.spec.ts`, `smoke.spec.ts` (una regex) y `reading.spec.ts` (CTA de invitado) apuntan a la portada nueva con la misma intención. |

**Las seis escenas** (orden de suelos: tinta → papel → tinta → [pulso, tinta] → papel → papel con marquesina de tinta →
papel → tinta → pie de tinta):

1. **Los grabados** (`EscenaGrabados`): `MesaDeGrabados` 8 × 5 con las 40 láminas de la maqueta en su orden (4 × 5 abajo de
   720, lo hace el componente) + el velo de `.e1::after`; `Etiqueta` «Tarot con IA · 78 grabados de 1909»; `Pincel`
   «Pregunta»/«Ask» (`aria-hidden`); la tesis en tres líneas como **único `h1`** (la tercera en `rosa-luz`, ≥ 25 px);
   «Haz tu lectura →» a `/register` (invitado) o `/reading/new` (sesión), como hoy; segundo botón «Ver la carta de hoy»
   (`#hoy`) para invitados o «Ir a mi espacio» (`/dashboard`) con sesión; nota «3 lecturas gratis al registrarte · sin
   tarjeta» sólo para invitados. Nada del héroe espera a una animación (el LCP es la tesis).
2. **Del grabado a la IA** (`EscenaDelGrabado`), **debajo** del héroe: `GrabadoParticulas` con El Loco, la lectura de
   ejemplo de la maqueta y la firma «Lectura de ejemplo · Arcana». El panel fijo queda debajo de la cabecera sticky
   (`top: var(--alto-cabecera)`).
3. **La carta del día** (`EscenaCartaDelDia`, cliente, `id="hoy"`): `CartaQuemable tamano="grande"` con
   `key={carta.slug}` y `etiqueta={t("carta.voltearPosicion", { posicion })}`. La carta sale de `CARTAS` por el **día UTC**
   (`cartaDelDia`: `(díaUTC × 29 + 17) mod 78`, 29 coprimo con 78 → 78 días seguidos dan las 78). Nombre en español y la
   primera oración de su significado salen de la base (`prisma.card.findFirst` por `name`, en `unstable_cache` 1 h); si la
   base no contesta: nombre de `MAJOR_ARCANA` o el inglés y sin significado. En inglés usa `meaningUprightEn` o nada
   (nunca el español). Mensaje: «Carta del día · 6 de noviembre de 2026», nombre (`h3`), significado, «Cada mañana la
   tuya llega escrita para ti…», **«Mensaje de ejemplo · Arcana»** y «Recíbela cada mañana» → `/subscribe`. Con JS el
   mensaje espera a que la carta se voltee (`@media (scripting: enabled)`); sin JS se ve completo con la carta revelada.
4. **Pulso colectivo** (`CollectivePulse`, sólo si hay datos): banda de tinta tras la carta del día; la carta más sacada a
   color con `cartaImagen(card)` (ya no `imageUrl` ni `next/image` de Wikimedia), `Badge` en fila con `flex-wrap`, sin el
   punto con `animate-ping`.
5. **Más que tarot** (`EscenaMasQueTarot`): tira densa de cinco láminas con los glifos de la maqueta — Mapa Arcano
   `/blueprint`, Calendario Arcano `/calendar`, Lectura de dos `/compatibility`, Tu mazo `/reading/manual`, Mi historia
   `/history` —; 5 columnas, 2 abajo de 1020, 1 abajo de 480; enlaces de 44 px de alto.
6. **El día de hoy en el tonalpohualli** (`EscenaHoy`): de `@/lib/systems` con `todayUtc()` (el mismo «hoy» que la
   cabecera y /calendar): «Hoy es 2 Tochtli, Conejo.», trecena, señor de la noche, luna (fase + %), «Tu día personal»
   («Al registrarte» / enlace «En tu calendario» con sesión). Marquesina de los 20 signos con el de hoy en `rosa-luz` y
   `aria-current="date"` + «(hoy)» para lector; la copia del bucle es `aria-hidden`; el contenedor lleva `data-recorta`.
   Con reduced-motion no corre: los 20 signos quedan como retícula (sin copia, nada recortado).
7. **Preguntas frecuentes** (`PreguntasFrecuentes`): las tres de siempre (SEO), `<details>` nativos en pliego de papel.
8. **Tu turno** (`EscenaTuTurno`): `Pincel` «Tu turno» (`aria-hidden`) + `h2` `sr-only`, «Escribe tu pregunta…» y
   «Haz tu lectura · 3 gratis» (invitado) / «Haz tu lectura» (sesión). Le sigue el `Footer` de tinta.

**Movimiento**: revelado al scroll con `data-revelar` (`RevelarAlScroll`): al montar marca visible lo que ya está a la
vista y sólo entonces pone `data-portada-revelar` en `<html>`; sin JS, con reduced-motion o sin IntersectionObserver no
esconde nada, y al desmontar lo quita. Entradas por keyframe con `fill-mode: both`; sólo transform/opacity; ninguna
animación nueva con framer-motion.

**Quitado**: «Descubre tu destino» / «Discover your destiny», «el universo te habla», los orbes `animate-float`, ☾ ★ ✡ y
emojis de adorno, «Cómo funciona», «Por qué elegir Arcana», «Tipos de tirada», la sección del Oráculo diario con
`$3.99/mo`, los **testimonios** y el **contador** (ver PENDIENTES), `DailyCardPreview` (pedía `/api/cards` completo en el
cliente y leía `imageUrl`). Archivos borrados: `DailyCardPreview.tsx`, `ReadingCounter.tsx`, `Testimonials.tsx`.

`grep` en mis archivos (`src/app/page.tsx`, `src/components/landing/**`, sus tests) de las 17 familias + `lime`,
`text-white`, `prose` e `imageUrl`: **0**.

### Falso o ya hecho

- **JSON-LD**: no existía en ningún lado (`grep "ld+json" src` = 0). `metadata`/OG viven en `src/app/layout.tsx` (F1-A) y
  no se tocaron; la portada no exporta `metadata`.
- **`DEFECTOS` de la portada**: no había fila (la de reduced-motion la borró I1). Con `ARCANA_E2E_DEFECTOS=0` y la red
  estricta, la portada pasa los 26 chequeos sin entradas nuevas.
- **`ReadingCounter` «de datos reales»**: el número sí sale de `prisma.reading.count()`, pero `/api/stats` lo infla
  (`floor(n/10)*10 + 10` y la UI le pone «+»: con 3 lecturas dice «10+»). No es el número real → fuera.
- **Testimonios**: «Maria G.», «Carlos R.», «Ana L.» con 5 estrellas, fijos en `messages` → inventados → fuera.

### Handoffs

- **F1-A / integrador · `buttonClasses` no se puede llamar desde un server component**: vive en `ui/button.tsx`
  («use client»), así que en el servidor es una referencia de cliente y llamarla truena en tiempo de ejecución (jest no lo
  ve). Lo resolví con `landing/EnlaceBoton.tsx` (cliente, `<Link className={buttonClasses()}>`). Para L2–L6: mover
  `buttonClasses` a `ui/button-classes.ts` sin «use client» y reexportarlo desde `button.tsx` y el barril.
- **F1-B / integrador · `GrabadoParticulas` en `tinta.css`**: (a) quieto en escritorio (sin JS o reduced-motion) el grabado
  y la lectura se enciman ~2 % (la geometría de la maqueta asume que el texto sólo aparece cuando el grabado ya se
  deshizo); (b) el panel sticky usa `top: 0; height: 100svh` y queda detrás de la cabecera sticky. Los dos los corrijo
  sólo para la portada en `portada.css`; si otro lote lo usa, conviene llevarlo a `tinta.css`.
- **Integrador · llaves sin uso** (append-only, no las borré): `landing.{readingCounter, dailyCard, testimonials, hero,
  howItWorks, features, spreadsSection, cta, dailyOracle}` y `pulse.moreThanTarot.{subtitle, cta}`. Se pueden borrar en
  la Fase 3. `spreads.*` sigue en uso en otras pantallas.
- **Integrador · specs e2e tocadas**: `e2e/home.spec.ts` (hero, CTA, «cómo funciona», «78», cambio a inglés),
  `e2e/smoke.spec.ts:23` (regex del CTA) y `e2e/reading.spec.ts:6-15` (el CTA de invitado lleva a `/register`). En la fusión
  con los acentos sólo chocó `home.spec.ts` («cómo funciona»): me quedé con la aserción nueva.

### Decisiones

1. **Carta del día sin `prioridad`**: está bajo el pliegue; `fetchpriority="high"` competiría con la tesis (LCP). Carga
   perezosa normal; al llegar a la escena ya está.
2. **Carta y mensaje**: la carta la decide `CARTAS` + día UTC (sin base); la base sólo pone nombre y significado, con caché
   de 1 h, porque la portada es la página más visitada.
3. **Pulso como banda de tinta** después de la carta del día (tema afín y evita una racha larga de papel).
4. **Preguntas frecuentes** entre la marquesina y «Tu turno»: el llamado final queda al final.
5. **Con sesión** el segundo botón del héroe es «Ir a mi espacio» y no se ofrecen «3 gratis» (no aplican).
6. **«Recíbela cada mañana» → `/subscribe`** (el camino de la suscripción del Oráculo diario que antes tenía su sección).
7. **Estilos de la portada en `landing/portada.css`** (global, todo con prefijo `portada-`), importado desde `page.tsx`.
   Las fuentes se leen de las variables de next/font (`--fuente-*`): las de Tailwind (`--font-*`) van en `@theme inline` y
   no se emiten como variables.
8. **Una columna (≤ 820)**: el mensaje de la carta no reserva su hueco antes de voltearla; entra con `portada-entra`. En
   dos columnas sí lo reserva (como la maqueta) para que nada salte.
9. **Inglés**: «Ask», «The cards are from 1909. / Who reads them today is an AI. / The question is still yours.», «Get your
   reading», «Your turn».

### PENDIENTES para Memo

- **Testimonios**: quité los tres de la portada porque eran inventados (nombres y 5 estrellas fijos en el código). Si
  quieres testimonios, que sean de personas reales y con su permiso.
- **Contador de lecturas**: lo quité porque infla el número (con 3 lecturas mostraba «10+»). Si lo quieres de vuelta, que
  muestre la cifra real (el cálculo está en `/api/stats`, sin dueño en este plan).
- **Oráculo diario**: ya no hay sección con «$3.99/mo» en la portada; el camino es «Recíbela cada mañana» → `/subscribe`.
  ¿Quieres el precio visible en la portada?
- **Respuesta 2 de las preguntas frecuentes**: dice «Nuestra IA ha sido entrenada con conocimiento profundo del
  simbolismo del tarot». No la cambié (texto de negocio), pero no es exacta: la lectura la escribe un modelo general con
  las instrucciones de Arcana. Conviene que decidas el texto.
- **Carta del día en inglés**: si `meaningUprightEn` está vacío en producción para esa carta, la escena en inglés muestra
  sólo el nombre y la frase general (no cae al español).
- **Día UTC** (lo mismo que notó I1): de noche en México la portada ya muestra la carta, el tonalli y la fecha de mañana.
- **JSON-LD**: no hay. Si quieres resultados enriquecidos, se puede agregar `FAQPage` con las tres preguntas.

### Comandos y resultados

| Comando | Resultado |
|---|---|
| `ARCANA_E2E_REUSE=1 ARCANA_E2E_DEFECTOS=0 npx playwright test e2e/responsivo.spec.ts --grep "portada"` (sobre `node scripts/e2e-db.mjs serve`, árbol fusionado) | **26 passed** (1.7 min): maqueta, encabezados, reduced-motion y sin JS en 1440/1024/820/390/360, `@en` a 390 y WebKit 390 |
| Lo mismo + `e2e/home.spec.ts` sobre el build final (`799b24c`) | **38 passed** (2.5 min) |
| `ARCANA_E2E_REUSE=1 npx playwright test e2e/home.spec.ts e2e/smoke.spec.ts e2e/reading.spec.ts e2e/legal.spec.ts --project=chromium-1440` | **62 passed**, 1 skipped (el `fixme` del email inválido, previo) |
| `npx jest` de mis 3 suites | 30/30 verdes, sin avisos de `act` ni de consola |
| `npx tsc --noEmit` | 0 errores |
| `npm run lint` | **0 errores**, 16 avisos, todos previos y ajenos (`prisma/*`, `scripts/generate-images.ts`, `cards`, `collection`, `profile/setup`, `referral`, `settings`, `AchievementUnlockedModal`, `lib/challenges.ts`, `types/next-auth.d.ts`) |
| `npm test` (con las URLs muertas de `jest.config.ts`) | `check-messages: ok (1068 keys)` · **100 suites / 1,392 pruebas, todo verde**. Sigue el aviso previo «A worker process has failed to exit gracefully» |
| `npm run build` | exit 0 · `ƒ /` 6.2 kB (169 kB First Load) · «Compiled with warnings»: sólo el aviso previo de `jose` (CompressionStream) en el Edge Runtime |
| Al cerrar | servidor de `serve` apagado y `:3011` libre; el clúster (`:54329`, compartido) sigue arriba, como pide el encargo |

### Capturas

`C:/Users/guill/AppData/Local/Temp/claude/C--Users-guill-dev-arcana/ba3d8826-c8e4-418f-8b14-19f131c84e14/scratchpad/fase2/L1/`
(contra el build de producción de `serve`, `es-MX`; scripts `capturas.mjs`, `sesion.mjs`, `sinjs.mjs` en la misma carpeta):

- `{1440,390,360}-{mov,red}-NN-escena.png`: cada escena (01 grabados, 02 grabado, 03 carta boca abajo / quemando /
  revelada, 04 más, 05 hoy, 06 preguntas, 07 turno) y `00-vista`; a 1440 con movimiento, la escena 2 en cuatro puntos del
  scroll (`02-grabado-a…d`).
- `sinjs-{1440,390}-pagina.png`: página completa sin JavaScript (carta revelada y mensaje visibles).
- `sesion-{1440,390}-*.png`: con sesión (`historia@arcana.local`): «Haz tu lectura» → `/reading/new`, «Ir a mi espacio».
- `iteraciones/`: las rondas de `next dev` (it1–it3) y la de inglés a 390.

Comparadas con `design/maqueta/_qa/portada-*`: héroe, carta del día (boca abajo, quemando, revelada), tira «Más que
tarot», día de hoy con marquesina y «Tu turno» coinciden; la escena 2 en el punto «c» es idéntica a `02c`. Corregido tras
mirarlas: el hueco vacío del mensaje en móvil, la marquesina quieta en filas desparejas, el grabado encimado en
escritorio quieto, «Cozcacuauhtli» partido.

Commits del lote: `bbf0ee2`, `255f82e`, `133bb9a`, `4a111c0`, `b07ce8e`, `0d427d4`, `799b24c` · fusiones `6a30e3b`
(avance rápido), `acf8ef1` · este parte.

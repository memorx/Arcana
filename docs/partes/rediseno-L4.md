## Parte L4 · Sistemas (rediseño «Dos tintas», Fase 2)

Rama `rediseno/f2-L4` (worktree `C:/Users/guill/dev/arcana-lotes/f2-L4`), base `rediseno/dos-tintas`. 6 nov 2026. Sin
`git push`. Ninguna base tocada salvo la local `arcana_e2e_l4` (`127.0.0.1:54329`, siempre vía `scripts/e2e-db.mjs`
`dev`/`serve`); nunca `npm run dev`, `prisma db push`, `db:seed` ni `e2e-db.mjs stop`. Jest con las URLs muertas de
`jest.config.ts`.

### Hecho (por ficha)

| Ficha | Commit | Qué |
|---|---|---|
| Llaves | `56b6534` | 8 llaves nuevas, mismas en es/en, append-only en mis namespaces: `blueprint.synthesis.eyebrow`, `compatibility.{eyebrow, previous.count, detail.readingEyebrow}`, `profile.{eyebrow, emailTimeUtc, meta.title, meta.description}`. `check-messages: ok (1027 keys)` |
| `/blueprint` (Mapa Arcano) | `5bcc37f` | ver abajo |
| `/share/blueprint/[shareId]` | `8591c53` | ver abajo |
| `/compatibility` y `/compatibility/[id]` | `13d04d9` | ver abajo |
| `/profile/setup` | `e24593d` | ver abajo |
| Fusiones de la base | `fec48d8` y la de `643eaf1`/`6a30e3b` (avance rápido) | acentos de `es.json`, red de desbordes estricta, specs del menú móvil |

**`/blueprint`.** Héroe sobre papel con filete inferior: `Etiqueta` «Mapa Arcano», `h1` «El Mapa Arcano de {nombre de pila}»
(Gloock), nacimiento y luna al nacer en mono (sin el emoji de la luna), las **cinco insignias como sellos** (lista con
`aria-label`, mono en mayúsculas, glifo en un anillo, `flex-wrap`), la bajada y «Ir a tu síntesis ↓» (44 px). A la
derecha, el glifo del Mapa Arcano de la portada («Más que tarot») grabado en grande: pentágono en tinta, los cinco
glifos en anillos y la inicial en el único disco rosa; **quieto** (se fue el anillo que giraba sin fin). Debajo, «Tus
cinco sistemas» como **tira de láminas** con filetes (`gap-px` sobre `bg-filete/25`, `border-y` de tinta), una lámina por
sistema con su número de pliego (I–V) en rosa-texto, el sistema en mono, el signo en Gloock, rasgos como datos, la
descripción en Newsreader y los detalles como `dl` (dt mono, dd Gloock, como «El día de hoy»):
- I · Cartas natales (a todo el ancho; desde 768 px texto a la izquierda y cartas a la derecha, para que una sola carta
  no deje media lámina vacía): cada carta es su **grabado `-tinta`** autohospedado por `MAJOR_ARCANA[i].name` →
  `cartaImagen(name, "tinta")`, con su papel, nombre en Gloock, número romano en mono y palabras clave. **Se quitó la
  consulta `prisma.card.findMany`**: sólo alimentaba `imageUrl`.
- II · Zodiaco occidental: signo en su forma de texto (♋︎, U+FE0E + `font-variant-emoji: text`).
- III · Zodiaco chino.
- IV · Tonalpohualli: título «12 Cóatl» (número + náhuatl), «12 Serpiente · signo mexica…» en mono; trecena, rumbo,
  patrono y señor de la noche en el `dl`; el texto del tonalpohualli como nota con filete rosa.
- V · Numerología: el camino de vida como **numeral grande de Gloock en rosa** (`symbolSize="grande"`, ≥ 24 px).
Síntesis como **pliego**: `section#synthesis` con `Etiqueta` «Escrita por IA», `h2`, y el texto en Newsreader (el primer
párrafo más grande, 66ch); las preguntas finales bajo un filete, **en cursiva**, numeradas en mono rosa (`h3` «Preguntas
para tu año» se conserva: lo busca el flujo e2e). Estados con `data-estado`: `pendiente` (intro + «Generar mi síntesis»
+ «Gratis · tarda hasta un minuto»), `vieja` (aviso con filete rosa + «Actualizar»), `generando` (seis segmentos de
progreso, el paso actual en rosa, el texto del paso en cursiva y renglones de esqueleto en papel-hondo, pulso sólo con
movimiento), `error` (aviso en el error del suelo, incluido el **429 de enfriamiento** con sus minutos) y `escrita`.
Compartir: mismo flujo y misma privacidad (aviso → confirmación → enlace copiado; copiar, compartir nativo, dejar de
compartir; revocar aunque la síntesis esté vieja); el aviso va con el filete rosa, la confirmación en papel-hondo, el
campo del enlace en mono con filete inferior (44 px). `loading.tsx` en papel-hondo con la forma de la página.

**`/share/blueprint/[shareId]`.** Franja de tinta propia (marca, `HoraDelDia` larga desde 1024 y corta abajo, «Ya tengo
cuenta» en línea), el mismo héroe sin fecha de nacimiento, la síntesis como pliego, el llamado entre filetes (primario +
fantasma, `flex-wrap`) y el `Footer` común con el crédito de Pamela Colman Smith. **Sin animación de entrada ni estado de
cliente**: completa sin JS. `noindex`, el 404, el formato de `shareId` y lo que sale del cargador sin cambios.

**`/compatibility`.** Encabezado con `Etiqueta` «Dos mapas · tres cartas», `h1`, bajada y el glifo «Lectura de dos» de la
portada (dos círculos en tinta, la parte compartida en rosa). Formulario como **pliego** (`h2` «La otra persona», los tres
`Input` con `id` y etiqueta, nombre y fecha lado a lado desde 640 px; costo y saldo en mono entre filetes; «te faltan
créditos» con filete rosa y enlace en línea; errores con el filete del error; botón primario; nota de cobro en mono).
Mientras lee: tres reversos de Arcana (`ReversoCarta`) con pulso sólo con movimiento. «Qué comparamos» como lista
numerada I–V. «Tus lecturas de dos» como **archivo**: filas con filete, nombre en Gloock (sin nombre en cursiva gris),
fechas en mono, y el medidor de cinco segmentos con el valor. Sin perfil: aviso con filete rosa, `h2` y «Completar mi
perfil». Deuda cerrada: `compatibility/page.tsx:23` (texto oscuro sobre ámbar).

**`/compatibility/[id]`.** «← Lecturas de dos» (mono, 44 px), sello «Lectura de dos» + fecha en mono (`flex-wrap`), `h1`
«{yo} y {la otra persona}», la etiqueta del conjunto en cursiva. **Medidores en dos tintas**: el conjunto encabeza el
pliego (valor «3/5» en Gloock grande), los cuatro sistemas en láminas con filetes (2 × 2 desde 640 px); segmentos llenos en
rosa, vacíos con filete (se cuentan sin color), `role="meter"` con `aria-valuemin/max/now` y la etiqueta hablada
«{sistema}: {n} de 5»; el valor visible en mono es `aria-hidden`. Los pares en Gloock con glifos de una tinta; el número
del vínculo en mono rosa. **Tres cartas** («Tú», «La otra persona»/nombre, «El vínculo»): el grabado a **color**
autohospedado con `cartaImagen(card)` (nunca `imageUrl`), girado 180° si salió invertida, con «invertida» en mono. La
lectura de la IA como pliego en Newsreader (`h2` «La lectura» con «Escrita por IA»; los títulos de la IA como `h3` en
Gloock con filete). «Nueva lectura de dos» primario. Deuda cerrada: `compatibility/[id]/page.tsx:19`.
Las dos páginas usan el `Reveal` CSS (fill `both`, sólo `motion-safe`) en lugar de `FadeIn` de framer-motion: nada espera
a la hidratación para verse.

**`/profile/setup`.** `Etiqueta` «Tu perfil», `h1`, bajada; formulario en pliego: `Input` con **`id` explícito** en nombre,
fecha y hora (la fecha y la hora nativas tenían `label` sin `htmlFor`: no estaban asociadas), la ayuda de la hora como
texto visible ligado al campo (antes un `title` con ⓘ), área de enfoque y hora del correo como grupos (`fieldset` +
`legend`, `aria-pressed`, 44 px, la opción elegida en tinta), la nota UTC desde `messages` (sin ⚠️). **Vista previa del
signo** en una lámina de una tinta (glifo ♋︎ en anillo, signo en Gloock, elemento · modalidad en mono, área y hora
elegidas), `aria-live`, junto al formulario y fija desde 1024; en teléfono va primero. Después de guardar: región con `h2`,
«Ver mi Mapa Arcano» primario, «Continuar a suscripción» en línea, «Ir a mi espacio» fantasma (`flex-wrap`). Metadata
desde `messages` (el título fijo decía «| Arcana» dos veces).

**Movimiento.** Sólo el `Reveal` de entrada (opacidad + 12 px, `animation-fill-mode: both`, `motion-safe`) y pulsos de
carga (`motion-safe`). Nada de framer-motion nuevo; la página pública no anima nada.

**Pruebas nuevas** (lo que sólo el código correcto produce):
- `src/__tests__/app/blueprint-page.test.tsx` (9, nueva): redirección sin sesión; un solo `h1` con el nombre de pila y sin
  apellido; las **cinco insignias** en orden con su texto para lector; **una lámina por sistema** en orden, cada una con su
  `h3` (Hierofante, Cáncer, Caballo de Metal, «12 Cóatl» + «12 Serpiente», el 5 como figura Gloock `aria-hidden`); la carta
  natal es `/cartas/rws-tarot-05-hierophant-tinta.webp` **sin** consultar `card`; glifos de una tinta (♋ + U+FE0E,
  `grayscale`, `aria-hidden`); **estados del Mapa** `escrita` (preguntas en cursiva, sin botón), `vieja` (pide actualizar y
  no muestra el texto viejo), `pendiente`, y sin perfil (un `h1`, enlace al perfil, sin láminas).
- `src/__tests__/app/compatibility-page.test.tsx` (3, nueva): sin sesión → login; con perfil: un `h1`, cada campo con `id` y
  su `label[for]`, «Qué comparamos» con 5, el archivo con sus enlaces, un medidor y el conteo; sin perfil: aviso, enlace y
  sin formulario ni archivo.
- `CompatibilityDisplay.test.tsx` (+4): las tres cartas son `/cartas/*-color.webp` (nunca la `imageUrl` guardada), la
  invertida girada y marcada; segmentos llenos en rosa y vacíos sin rosa con el valor visible `aria-hidden`; cada medidor
  de una lectura con su valor hablado y tantos segmentos llenos como `aria-valuenow`; seis glifos de una tinta; la fila
  del archivo con su medidor.
- `share-blueprint.test.tsx` (+1): un `h1`, **ninguna clase `animate-` ni `opacity-0`** (completa sin JS), franja de tinta
  con la marca, pie, cinco sellos y el llamado a `/register`.
- `profile-setup.test.tsx` (+1): `id` de los tres campos, la ayuda de la hora como descripción accesible, `aria-pressed`
  que cambia con el clic, el grupo de la hora y la nota UTC.
- Las pruebas que ya había siguen igual de exigentes (ninguna aserción relajada).

### Falso o ya hecho

- «Carta natal con su grabado `-tinta` o `-color`»: elegí **`-tinta`** para las cartas natales (son el retrato de la persona,
  no una carta revelada) y **`-color`** para las tres de la lectura de dos (sí son cartas sacadas: «la carta revelada es lo
  único a todo color», §0).
- «Tonalli con su glifo»: la app sólo tiene los glifos como **emoji a color**. No dibujé glifos propios: §0/«Lo que NO se
  hace» prohíbe el «códice mexica» decorativo. El glifo se imprime en gris (`grayscale contrast-125`); el número y el nombre
  náhuatl en Gloock son la figura.
- `MotionSafe` (framer `MotionConfig`) ya no lo usa ninguna página; se queda exportado (sin consumidores).

### Handoffs

- **F1-A / integrador — `buttonClasses()` no sirve en Server Components.** Vive en `src/components/ui/button.tsx`, que es
  `"use client"`: un Server Component que lo importa recibe una referencia de cliente y llamarlo **lanza en el render**
  («Attempted to call buttonClasses() from the server…»). Mis páginas de servidor usan un espejo sin directiva,
  `enlaceBoton()` en `src/components/blueprint/link-styles.ts` (mismas clases; `linkButtonClass` conserva su firma para el
  widget del dashboard). Propuesta: mover `buttonClasses` y sus constantes a `src/components/ui/button-classes.ts` (sin
  directiva), reexportarlo desde `button.tsx` e `index.ts`, y entonces `link-styles.ts` lo reexporta y se borra el espejo.
  Conviene revisar los usos de los otros lotes (p. ej. L6 en `forgot-password`/`reset-password`) si alguno es de servidor.
- **L3 — `BlueprintWidget`** (`src/components/dashboard/BlueprintWidget.tsx`) consume `BlueprintBadges`,
  `getBlueprintBadges` y `linkButtonClass` de L4: ya salen en dos tintas (sellos con `bg-suelo`, botón nuevo), pero su
  `Card` todavía lleva el degradado morado-ámbar (`from-purple-900/20 … to-amber-900/10`) y `text-slate-*`. Las props y
  firmas de L4 no cambiaron. `blueprint-widget.test.tsx` sigue verde.
- **Integrador**: `src/components/compatibility/MotionSafe.tsx` sin consumidores (se puede borrar con su export).

### Decisiones

- **Una tinta para los glifos**: signos del zodiaco con U+FE0E y `font-variant-emoji: text` (en Chrome/Windows salen como
  texto); animales y signos del día en gris. La única cosa a color es la carta revelada.
- **Láminas sin caja**: la retícula dibuja los filetes (`gap-px` sobre `bg-filete/25`), como la tira «Más que tarot», en vez
  de una `Card` por sistema.
- **Glifo del Mapa quieto**: era un anillo con `spin` infinito; §«La app»: «lo demás quieto y rápido».
- **Se quitó `prisma.card.findMany`** de `/blueprint`: con `cartaImagen` por nombre de `MAJOR_ARCANA` ya no hace falta
  (y era el único lugar de L4 que leía `imageUrl`).
- **Página pública con franja propia** (no la `Header` de la app, que pide sesión y créditos), con la hora del día y el pie común.
- La etiqueta del conjunto se muestra dos veces en `/compatibility/[id]` (bajo el `h1` y en el medidor del conjunto), como
  antes; la prueba de `CompatibilityMeters` la espera en el medidor.
- En teléfono la vista previa del signo va **antes** del formulario (si fuera después, al escribir la fecha no se ve).
- `ScoreMeter` sin `aria-valuetext` («3/5» se lee raro): la etiqueta hablada ya trae «3 de 5».

### PENDIENTES para Memo

- **Textos en mayúsculas de título** del perfil («Completa tu Perfil», «Nombre Completo», «Fecha de Nacimiento», «Área de
  Enfoque», «Hora del Email», «Guardar Perfil»): en español se escriben con minúscula. Es un cambio de texto: no lo hice.
- **Glifos del chino y del tonalli**: son emoji impresos en gris; en iPhone (emoji de Apple) se verán como fotos grises.
  Si se quiere, un juego de glifos grabados propio (12 animales + 20 signos) es un encargo de diseño aparte, cuidando la
  regla de no hacer «códice decorativo».
- La hora del correo se elige **en UTC** («Ciudad de México es UTC-6»): es lógica de negocio, no la toqué, pero para un
  usuario en México sería más claro elegir en su hora.
- La cabecera de la página pública muestra la **fecha del día UTC** (lo que ya anotó el I1: de noche en México ya es mañana).

### Comandos y resultados

Todos en `C:/Users/guill/dev/arcana-lotes/f2-L4`, después de fusionar `rediseno/dos-tintas` (último: `ee0fc20`, en `fec48d8`).

| Comando | Resultado |
|---|---|
| `grep -rnE "(slate\|purple\|…\|lime)-NNN\|text-white\|prose\|imageUrl"` sobre mis 6 carpetas | **0** coincidencias |
| `node scripts/e2e-db.mjs serve` (reset de `arcana_e2e_l4` + `next build` en `.next-e2e` + `next start` :3014) | listo; build sin errores |
| `ARCANA_E2E_REUSE=1 ARCANA_E2E_DEFECTOS=0 npx playwright test e2e/responsivo.spec.ts --grep "blueprint\|compatibility\|profile"` | **128 passed** (3.7 min): `/blueprint`, `/blueprint (vacío)`, `/compatibility`, `/compatibility (vacío)`, `/compatibility/[id]`, `/profile/setup`, `/share/blueprint/[shareId]` × 1440/1024/820/390/360 (maqueta, encabezados, movimiento reducido; `@en` a 390; la pública además sin JS y WebKit 390). Con `DEFECTOS=0` no se ignora nada; **L4 no tenía filas en `DEFECTOS`** y no agregué ninguna |
| `ARCANA_E2E_REUSE=1 npx playwright test e2e/flujos/mapa-arcano.spec.ts e2e/flujos/lectura-de-dos.spec.ts` | **3 passed** (29 s): generar síntesis → compartir → invitado la ve; síntesis guardada sin botón; lectura de dos −2 créditos, medidores, listada de vuelta |
| `npx tsc --noEmit` | 0 errores |
| `npm run lint` | **0 errores**, 14 avisos, ninguno en archivos de L4 (el aviso que había en `profile/setup` desapareció) |
| `npm test` | `check-messages: ok (1027 keys)` · **101 suites / 1,385 pruebas, todo verde** |
| `npm run build` | exit 0; sólo el aviso previo de `jose` (CompressionStream) en el Edge Runtime |
| Capturas propias (Playwright, es-MX, America/Mexico_City, contra el build de producción) | las 7 vistas × 1440/390/360: status 200, `scrollWidth − clientWidth = 0`, un `h1`, ningún enlace/botón/campo de `main` bajo 44 px de alto, sin errores de consola |

El servidor e2e de L4 quedó apagado (:3014 libre); el clúster compartido (:54329) sigue arriba, sin tocar.
`BITACORA.md` no se tocó (la cierra Fable en la Fase 4 con los partes).

### Capturas

`C:/Users/guill/AppData/Local/Temp/claude/C--Users-guill-dev-arcana/ba3d8826-c8e4-418f-8b14-19f131c84e14/scratchpad/fase2/L4/`
- Finales (build de producción): `blueprint-{1440,390,360}.png` (con síntesis, cuenta `historia`),
  `blueprint-sin-perfil-*`, `share-blueprint-*`, `compatibility-*`, `compatibility-sin-perfil-*`, `compatibility-id-*`,
  `profile-setup-*`.
- Estados de la síntesis con la API interceptada (sin escribir en la base): `estado-{pendiente,generando,enfriamiento,error}-{1440,390}.png`.
- `widget-dashboard.png`: los sellos de L4 dentro del widget de L3.
- `antes/`: las mismas vistas a 1440 y 390 antes de L4 (con el remapeo de la Fase 1).
- Scripts: `capturas.mjs` (mide desborde, `h1`, objetivos < 44 px y consola) y `estados.mjs`.

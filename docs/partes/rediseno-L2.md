## Parte L2 · Lectura (rediseño «Dos tintas», Fase 2)

Rama `rediseno/f2-L2` (worktree `C:/Users/guill/dev/arcana-lotes/f2-L2`), base `84224fd`, con `rediseno/dos-tintas`
fusionada dos veces (`6a30e3b…ee0fc20` y `99fb06e`). Sin `git push`, sin `prisma db push`, sin semillas a mano; servidor
sólo con `npm run dev:e2e` / `e2e-db.mjs serve` contra `arcana_e2e_l2` en :3012. 6 nov 2026.

### Hecho (por ficha, con su commit)

| Ficha | Commit | Qué |
|---|---|---|
| Piezas compartidas | `f4cf2b8` (+ el commit de este parte) | `src/components/reading/`: `disposicion.ts` (figura por número de cartas, arco de la herradura, miniatura, números romanos, interpretación partida en cuerpo + preguntas), `lectura.css` (cuadrículas de 1 a 12 cartas, carta fija, barajar), `<Tirada>`, `<CartaFija>`, `<FiguraTirada>`, `<IntencionCita>`, `<Interpretacion>`, `<SignificadosCartas>`, `<LaminaTirada>`, `useMedia`. Test `disposicion.test.ts`. Llaves nuevas `reading.{ask,yourTurn,close,shareLink}` (es/en, append-only). |
| `/reading/new` | `ea029be` | Mesa de láminas: cada tirada con su número de cartas en Gloock, su figura en miniatura (la Cruz Simple en cruz, la herradura en arco, la Celta con su báculo, los 12 meses en dos renglones), descripción, posiciones y costo en mono; secciones clásica/temática con etiqueta de punto rosa; lámina tenue y fuera del Tab si no alcanza. «Tu propio mazo» con tres reversos en abanico. Sellos de saldo con `flex-wrap` (**DEFECTO de 390/360 arreglado**). |
| `/reading/new/[spreadTypeId]` | `8cc71bc` | **Intención** como pliego (filete rosa, «Pregunta» a pincel, `label` del `textarea` en el h2, Newsreader en cursiva, filete que se vuelve rosa al enfocar) junto a la ficha de la tirada (figura y posiciones). **Barajar**: banda de tinta con `MesaDeGrabados` (16 grabados, `columnas={8} filas={2}`) que se reacomoda cada 700 ms (no con reduced-motion), velo y la intención citada, `role="status"`. **Revelar** sobre papel (como `lectura.html`): `<TransicionPincel />` al entrar, `CartaQuemable` con `key={card.id}`, `etiqueta={t("carta.voltearPosicion",{posicion})}`, `--cq-ancho:100%` en la rejilla, `tamano="chica"` en móvil y en tiradas de más de 5 (pista «Toca» y lienzo 90×156), `dorada` en las doradas; «Voltear todas» = `revelada` controlada + `onRevelada` sincroniza; «N de M cartas reveladas» en `aria-live`; el nombre de la carta aparece debajo al revelarse. **Interpretación** como pliego (Newsreader ~66ch, preguntas finales en cursiva bajo filete), la tirada compacta y los enlaces con `buttonClasses()`. Cada paso abre arriba con el foco en su h1 (uno por paso). Toda la lógica, la API, el 503/422 (aviso y «Intentar de nuevo» sin perder la intención), el 403 (modal de créditos) y la cadena de 7 modales sin cambios. `NewCardDiscoveredModal` en tinta con `cartaImagen()`, cerrar de 44 px con nombre, entrada escalonada (`animate-entra`, `both`) en lugar del destello infinito de styled-jsx. Test `ReadingFlow.test.tsx`. |
| `/reading/[id]` | `aa3a847`, `3c885c1` | La misma lectura en pliego: sellos (tirada, «Con tu mazo», fecha) con wrap, h1, intención, «Las cartas reveladas» en la figura de la tirada a tamaño completo + «lo que dice cada carta» (posición, carta, invertida, significado, palabras clave; antes vivía en `SavedReadingCard`), interpretación con `ReadAloud` junto al título, resonancia, notas y seguimiento como secciones con filete. Acciones con `flex-wrap` y `buttonClasses()` (**DEFECTO de 390/360 arreglado**). `ShareButton` recibe `translations.shareLink` y `translations.close`. `FollowUpChat` (la pregunta en cursiva con filete rosa, aviso en papel hondo), `ReadAloud` (píldoras de línea de 44 px, barras rosa), `ResonanceCheck` (estrellas rosa de 44 px), `PersonalNotes` (h2 con `label`) restilizados con las mismas props y comportamiento. |
| `/reading/manual` | `3383de3` | Índice de grabados: las 78 en `-mesa` (gris), **entintadas** (`-tinta`) cuando ya están en una posición; tabindex móvil intacto (flechas, Inicio, Fin), filtros de 44 px con `aria-pressed`, buscador con el `Input` de pliego (`id` explícito). Posiciones con la carta a color, invertida en rosa-luz, quitar de 44 px; indicador de pasos en mono; láminas de tirada como botones; resumen en la figura de la tirada; barra fija inferior sin desborde a 360. `thumbUrl` (Wikimedia) → `thumbnailOf()`; tests reescritos con la misma intención. |
| `/share/[shareId]` | `2ead30f`, `3c885c1` | Pública en dos tintas: cabecera y pie de la app, `<main id="main-content">`, el mismo pliego que `/reading/[id]` y cierre «Tu turno» a pincel sobre tinta; el sello «Compartido por» puede partirse (**DEFECTO de 390/360 con y sin JS arreglado**). |
| `DEFECTOS` | `f4ca09b` | Borradas las tres filas de L2 (`/share/[shareId]`, `/reading/[id]`, `/reading/new (vacío)`). |

`grep` en mis archivos (páginas, componentes y sus tests) de `(slate|purple|violet|indigo|fuchsia|pink|amber|yellow|orange|red|rose|emerald|green|teal|blue|sky|cyan|lime)-NNN`, `text-white`, `prose` e `imageUrl`: **0**.

### Falso o ya hecho

- §3 L2 decía «revelar sobre escenario de tinta»; §5.4 y el encargo mandan **papel** (como `lectura.html`): es papel. La tinta quedó sólo en barajar (banda corta) y en los modales.
- La maqueta muestra la interpretación debajo de las cartas en la misma pantalla; aquí sigue siendo el paso «Ver interpretación» (lógica, cadena de modales y anclas e2e intactas).
- `SavedReadingCard` (F1-B) ya no tiene consumidores tras L2: sólo se referencia a sí mismo.

### Handoffs

- **Integrador / F1-B · `CartaQuemable`**: con `tamano="media"` la pista «Toca para voltear» no cabe en cartas de menos de ~160 px (la recorta el `overflow:hidden` del botón). Lo resolví eligiendo `chica` en móvil y en tiradas densas; si se quiere automático, que el componente elija `pistaCorta` por ancho.
- **Integrador · `SavedReadingCard`**: sin usos; se puede borrar (o quedarse para Fase 3).
- **L5 · `GoldenCardModal`**: la página toma el tipo de sus tarjetas de las props del modal (`ComponentProps<typeof GoldenCardModal>["cards"]`); si quitan `imageUrl` de sus props, mi página no cambia.
- **Integrador / F1 · flake de hidratación**: React #418 («server rendered HTML didn't match») aparece de vez en cuando en el pase `maqueta` de anchos móviles: 2 de ~26 corridas de `/reading/new` a 360 y 1 de 8 de **`/share/blueprint/[shareId]` (L4, que no toqué y no usa la cabecera)**. No se reproduce en `next dev` (16 cargas a 360/390) ni en 10 cargas a 360 contra el build de e2e con mi script; la corrida final completa salió verde. Apunta a algo común (layout raíz, `Providers` o carga de la máquina), no a una página.
- **Bitácora**: no la toqué (la cierra Fable en la Fase 4 con los partes).

### Decisiones

1. **Disposición por número de cartas** (y, para 5, si el nombre dice «cross/cruz»): 1 sola · 2–5 en renglón · Cruz Simple en cruz (pasado y futuro a los lados, consejo arriba, influencia oculta abajo) · 7 en arco · 10 Cruz Celta (presente, desafío debajo, pasado/futuro a los lados, arriba/abajo, báculo de abajo arriba a la derecha) · 12 como meses (6×2, 4×3) · otro número en rejilla. El desafío de la Celta **no se cruza encima** del presente: va debajo, para que las dos cartas y sus nombres se lean. En < 640 px todo pasa a rejilla de 3 en orden de posición con el nombre encima (la cruz simple conserva su figura, cabe en 3 columnas). El orden del DOM es siempre el de las posiciones (Tab y lector).
2. El nombre de la posición ocupa siempre dos renglones pegados a la carta, así las cartas de una fila quedan alineadas aunque un nombre se parta («Esperanzas y miedos»).
3. Las tres páginas usan `<CartaFija>` (imagen a color, sin botón) para lo ya revelado; `CartaQuemable` sólo donde se voltea.
4. Interpretación: las oraciones interrogativas del final van aparte en cursiva; si el último párrafo empieza afirmando, la afirmación se queda en el cuerpo. No se pierde ni se reordena texto (test con los textos falsos de es/en).
5. h1 por paso del flujo: nombre de la tirada → «Barajando…» → «Las cartas se revelan» → «Tu lectura».
6. `lectura.css` (fuera de capa, como `tinta.css`) sólo con disposición y el movimiento de barajar; color y tipografía en clases de Tailwind con los tokens (`text-letra*`, `border-filete`, `bg-suelo`, `bg-papel-hondo`, `font-*`).
7. «Voltear todas» queda deshabilitado mientras arden (no desaparece bajo el foco) y lo sustituye «Ver interpretación» cuando todas están reveladas.

### PENDIENTES para Memo

- Textos de negocio que se ven más ahora y conviene revisar (no los cambié): el h1 del revelado es «Las Cartas se Revelan» (la maqueta dice «Tu lectura»), las mayúsculas de título de las llaves viejas («Tu Lectura», «Ver Interpretación», «Tu Intención») y «Tu Lectura» como h1 de la página **compartida** (la ve otra persona).
- ¿Quiere el desafío de la Cruz Celta cruzado encima del presente (como se tira en la mesa) aunque tape media carta? Hoy va debajo para que se lea.

### Comandos y resultados (finales, sobre `3c885c1` + el docblock de entorno del test)

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | **0 errores** |
| `npm run lint` | **0 errores**, 16 avisos, todos en archivos ajenos y previos (`prisma/*`, `scripts/generate-images.ts`, `cards`, `collection`, `profile/setup`, `referral`, `settings`, `AchievementUnlockedModal`, `lib/challenges.ts`, `types/next-auth.d.ts`) |
| `npm test` (`check-messages` + jest, URLs de base muertas del `jest.config`) | `check-messages: ok (1023 keys)` · **101 suites / 1,392 pruebas, todo verde** (36 s). Sigue el aviso previo «A worker process has failed to exit gracefully». (`disposicion.test.ts` corre en entorno `node`: los textos falsos de la IA vienen de `@/lib/ai/config`, que en jsdom no tiene `TextEncoder`.) |
| `npm run build` | exit 0 · «Compiled with warnings» sólo por el aviso previo de `jose` (CompressionStream) en el middleware · `/reading/new` 141 kB, `/reading/new/[spreadTypeId]` 175 kB, `/reading/[id]` 147 kB, `/reading/manual` 190 kB, `/share/[shareId]` 163 kB de First Load JS |
| `ARCANA_E2E_DEFECTOS=0 npm run test:e2e:responsivo -- --grep "reading\|share"` (build + reset propios, :3012) | **137 ✓ · 0 ✘** (6.8 min): `/reading/new`, `/reading/new (vacío)`, `/reading/new/[spreadTypeId]`, `/reading/manual`, `/reading/[id]`, `/share/[shareId]` (+ `/share/blueprint` de L4 por el grep) en los 5 anchos, `@en` a 390, reduced-motion, sin JS y WebKit 390 en las públicas |
| `npx playwright test e2e/flujos/lectura.spec.ts e2e/flujos/mazo-propio.spec.ts e2e/reading.spec.ts` (`ARCANA_E2E_REUSE=1` sobre ese build) | **15 ✓** (tirada de tres con quema real hasta la lectura guardada y el historial; mazo propio; selección de tiradas, costos con acento, 404 compartida, estructura de `/reading/[id]`) |
| Unit tests nuevos | `disposicion.test.ts` (figuras, arco, Celta, romanos, interpretación sin perder texto) · `ReadingFlow.test.tsx` (revelar con **teclado**, **voltear todas** + progreso + «Ver interpretación», **503 y 422** con su aviso y la intención intacta, 403 → modal de créditos, `<Tirada>` por número de cartas con la posición encima, herradura en arco, modal de carta nueva con `cartaImagen`) |

Después de la verificación, `rediseno/dos-tintas` recibió dos commits ajenos (`6eff62b` línea corta de la fecha en `tinta`, `23a0a55` pase sin JS del e2e) que no tocan archivos de L2; no los fusioné para que los resultados de arriba correspondan al commit verificado.

### Capturas

`C:/Users/guill/AppData/Local/Temp/claude/C--Users-guill-dev-arcana/ba3d8826-c8e4-418f-8b14-19f131c84e14/scratchpad/fase2/L2/`
(60 PNG a 1440, 390 y 360; script `capturas.mjs` contra `dev:e2e`): `elegir-*`, `elegir-vacio-*`, `intencion-*`,
`barajar-*`, `revelar-3-{a,b-quemando,c-reveladas}-*`, `revelar-10-{a,b-quemando,c-reveladas}-*`, `modal-{3,10}-*`,
`interpretacion-{3,10}-*`, `lectura-*` (3 cartas) y `lectura10-*` (Cruz Celta) de `/reading/[id]`, `manual-{a,b,c}-*`,
`compartida-*`; en `v4/` la herradura, la cruz simple, el amor (5 en renglón) y los 12 meses a 1440 y 820. Comparadas
con `design/maqueta/_qa/lectura-*`: mismas tres cartas grandes con la posición en mono rosa encima y el nombre en Gloock
debajo, «Voltear todas» en línea, interpretación a 66ch con la pregunta final en cursiva bajo filete. (En las capturas de
página completa la cabecera sticky aparece a media página cuando la página estaba desplazada: es el modo de captura.)

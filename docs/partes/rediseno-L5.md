## Parte L5 · Colección y juego (rediseño «Dos tintas», Fase 2)

Worktree `C:/Users/guill/dev/arcana-lotes/f2-L5`, rama `rediseno/f2-L5`, base `84224fd` + `rediseno/dos-tintas` fusionada tres
veces (`6a30e3b` red de desbordes estricta, en avance rápido; `643eaf1`/`ee0fc20` acentos y specs del menú, en `4171f09`;
`143d449`/`46bd861`/`99fb06e` red fijada, primer pintado y `buttonClasses` sin `"use client"`, en `211bf19`). 6 nov 2026.
Sin `git push`. Servidor sólo con `npm run dev:e2e` (base `arcana_e2e_l5`, :3015) y `e2e-db.mjs serve`; nunca `npm run dev`, `db push`
ni `db:seed`; el clúster no se detuvo.

### Hecho

| Ficha | Commit | Qué |
|---|---|---|
| Piezas compartidas + `messages` | `8fec915` | `BarraProgreso` (`role="progressbar"` con min/max/now/valuetext; filete de la letra del suelo, relleno tinta, rosa al lograrse; vale en papel y en tinta) · `Sello` (sello en mono, decorativo, logrado / en curso / bloqueado) · `Celebracion` (estampa y chispas en dos tintas, CSS module, una sola vez, `fill-mode: both`, nada con reduced-motion) · `cards/indice.ts` (palos en orden del mazo, números romanos, agrupar) · 18 llaves nuevas append-only (1019 → 1037) en `collection`, `achievements`, `challenges`, `cards` |
| `/collection` | `c120173` | Índice de los 78 grabados por palo (Mayores, Bastos, Copas, Espadas, Oros) con su cuenta en mono. Descubiertas a color (`cartaImagen`), con número romano y nombre, enlazadas a su ficha; no descubiertas en `-tinta` al 22 % con filete punteado, sin enlace y «Por descubrir» para lector. Contador «N de 78» en mono + barra accesible; bloque de cartas doradas con su barra en rosa. Filtros = botones de alternar con `aria-pressed`, cuenta separada y `flex-wrap`. La dorada es la **única** con `golden-card-glow`/`golden-card-border`/`golden-shimmer-effect` de `tinta.css`: se fue el styled-jsx dorado (corría infinito con reduced-motion). Esqueleto en papel-hondo con `motion-safe:animate-pulse`. |
| `/achievements` y `/challenges` | `7c19a4b` | Archivo de sellos: cada fila con sello en mono (la meta), nombre en Gloock, descripción en Newsreader, recompensa (`Badge`, la fila hace wrap) y estado en mono (Desbloqueado + fecha / En curso / Bloqueado) con barra en dos tintas y valores recortados a la meta. Contador grande en mono. Desafíos con `tablist` real (`aria-selected`, tabindex itinerante, flechas, Inicio/Fin, `tabpanel`). Sin emojis ni paleta vieja. |
| `/cards` y `/cards/[slug]` | `b781c6c` | `/cards` pasa a **página de servidor** (la misma consulta que `/api/cards`): las 78 en el HTML, por palo, en tinta, con número romano y nombre. Filtros = enlaces `?palo=` con `aria-current`; búsqueda = formulario GET `?q=` (`Input` con `id="buscar-cartas"`); sin JS todo funciona, con JS `IndiceCartas` filtra al instante y deja la URL con `replaceState`. Ficha como lámina: grabado a color grande (fijo al lado del texto desde md; en móvil el título va primero), número romano en rosa, nombre en Gloock, el otro idioma en itálica, palabras clave en mono, «aparece en», significados al derecho e invertido en Newsreader, crédito de Pamela Colman Smith. `generateMetadata` intacto. |
| Modales | `297377f` | Logro, desafío, nivel y carta dorada sobre la tinta del `Modal`: palabra a pincel estampada (aria-hidden), `h2` en Gloock que nombra el diálogo, sellos y créditos en mono, botón primario. Sin confeti morado: desafío y nivel con chispas en dos tintas una vez. Nivel con su número romano en un sello grande. Dorada con `cartaImagen()` y la brasa de `tinta.css`; el botón de texto oscuro sobre ámbar ahora es el primario rosa-luz/tinta. Props idénticas. |
| Fusión | `4171f09` | Conflicto en `messages/es.json` (`unlockModal`, `completedModal`): valores con acentos de dos-tintas + mis llaves `pincel`. Tests a los textos acentuados. |
| Fusión + `buttonClasses` | `211bf19`, `2d672d3` | Fusión limpia del arreglo `99fb06e`; `/cards` y `/cards/[slug]` vuelven a usar `buttonClasses` de `@/components/ui` en su `<Link>` y se borró mi envoltorio `EnlaceBoton` (lo había hecho porque `/cards` daba 500). Comprobado en el navegador contra el build de producción (abajo). |

Deuda nominal cerrada: `GoldenCardModal.tsx:192` y `collection/page.tsx:192,274` (texto oscuro sobre ámbar) ya no existen.
`grep` de `(slate|purple|…|lime)-NNN`, `text-white`, `prose`, `imageUrl` y `framer-motion` en mis archivos: **0**. Los avisos de lint
que I1 listaba en `cards`, `collection` y `AchievementUnlockedModal` también se fueron.

Pruebas nuevas (31, textos reales de `messages/`):
- `src/__tests__/app/coleccion-page.test.tsx` (7): contador «3 de 78» y barras con valores; 3 descubiertas enlazadas a color vs. 75 en tinta tenue sin enlace; **una sola** brasa y es la dorada; secciones por palo con su cuenta y filtros `aria-pressed`; estado vacío; un h1; API caída no rompe.
- `src/__tests__/app/logros-retos-page.test.tsx` (6): contador; logrado/en curso/bloqueado con su barra (`aria-valuenow/max/valuetext`); doradas listadas; pestañas con flechas e Inicio; barras y estado de desafíos; vacío.
- `src/__tests__/app/cartas-pages.test.tsx` (10): romanos; misma consulta que la API; 78 fichas en tinta; filtros como enlaces con `aria-current` y `?palo=cups`; GET `?q=`; filtrado al instante + `replaceState`; inglés; lámina (imagen propia, XVII, claves, significados); `notFound`; metadata intacta.
- `src/__tests__/components/celebraciones.test.tsx` (8): cada modal sobre tinta y nombrado por su `h2`; créditos; Esc/Continuar cierran; chispas decorativas; nivel V sin recompensa; dorada única brasa por carta, `cartaImagen`, botón primario; marcador si falla la imagen.

### Falso o ya hecho

- «El brillo dorado con reduced-motion ya lo detiene la base»: sigue así. Medido en Chromium: con `reduce`, 0 animaciones en `/collection` y en el modal dorado, chispas `display: none`, y la brasa queda **quieta** (el `box-shadow` rosa persiste); sin `reduce` sólo corren `brasa-respira` y `brasa-barrido`.
- `DEFECTOS` no tenía filas de mis rutas: nada que borrar.
- La rama `golden` «bloqueada» de la colección vieja era código muerto (el filtro dorado sólo deja cartas doradas): no se portó.

### Handoffs

- ~~`buttonClasses()` desde un componente de servidor~~: ya resuelto en dos-tintas (`99fb06e`); lo detecté igual en `/cards` (500 en `next dev`) y ya quité mi envoltorio.
- **Todos los lotes · tipos viejos de `next dev`**: `tsconfig` incluye `**/*.ts`, así que `.next-dev-e2e/types/**` entra al chequeo de `next build` y de `tsc`. Si se borra una página después de `npm run dev:e2e` (un arnés), el build del e2e falla con «Cannot find module …/page.js». Hay que borrar `.next-dev-e2e/types/app/<ruta>` (lo hice con la mía).
- **Todos los lotes · `npm run dev:e2e` deja `next dev` huérfano** al detener la tarea: el puerto sigue tomado y el e2e falla con «already used». Hay que matar el `node … next dev -p 30xx` de su worktree.
- **L2 · `reading/new/[spreadTypeId]/page.tsx`**: `GoldenCardInfo` todavía declara `imageUrl`; el modal ya no lo lee (sigue compilando por tipado estructural). Pueden quitarlo de su tipo. Las demás props no cambiaron.
- **Integrador**: `/api/cards` ya no lo usa la UI (la página consulta directo); la ruta queda intacta.

### Decisiones

1. **`/cards` en el servidor** con filtros como enlaces y búsqueda GET, y una isla de cliente que filtra al instante (sin ir al servidor) y conserva la URL. Así el índice está completo sin JS y para buscadores, sin perder la búsqueda en vivo. `key` por parámetros para que una navegación externa re-monte la isla.
2. **Índice de `/cards` en tinta, colección a color**: en `/cards` todo es grabado (la carta a color aparece al abrir su lámina); en `/collection` el color marca lo descubierto. Rejilla 3/4/6/8 columnas (`minmax(0,1fr)`) en ambos, marco fijo `aspect-[7/12]` con `object-cover` porque los escaneos varían de alto.
3. **Logros dorados en `/achievements`**: `CATEGORY_ORDER` no tenía `golden`, así que la página decía «4 de 15» y listaba 12. Agregué la categoría al final (misma API, mismos datos; `categories.golden` ya existía). Es disposición, no lógica; Fable puede revertirlo con una línea.
4. **Emojis fuera** (logros, desafíos, nivel, dorada): son lo único a color que no es una carta. Las props `icon`/`levelIcon` se conservan. El sello lleva la meta (logros/desafíos), ✓ (en los modales) o el romano del nivel.
5. **Palabra a pincel sólo en los modales** (momentos firma); las pantallas de la app siguen el registro de `lectura.html` (etiqueta en mono + h1 en Gloock). Pinceles: «Logro»/«Earned», «Cumplido»/«Done», «Dorada»/«Golden» (`goldenCards.golden`), «Nivel»/«Level» (`levels.level`; `levels` no es mi namespace).
6. Estados: logrado = rosa; en curso = tinta; bloqueado = punteado en grafito. Barras rosa sólo cuando ya se logró.
7. Contadores con espacio real entre número y texto (lector de pantalla: «3 de 78», no «3de 78»).

### PENDIENTES para Memo

- **Logros de cartas doradas** ahora aparecen en `/achievements` (3 filas más). ¿Bien así? (antes no se veían aunque contaban en el total).
- **Las no descubiertas se reconocen**: en tinta tenue se alcanza a leer el título impreso del grabado («THE MOON.»). Es lo que pide el plan; si prefieres misterio total, se cambia por el reverso (`ReversoCarta`) en una línea.
- Textos nuevos para revisar: «Las cartas en tinta tenue aún no salen en tus lecturas.», «Archivo de sellos», «Índice de grabados · 1909», «78 grabados · Pamela Colman Smith, 1909», y los pinceles en inglés («Earned», «Done»).
- Dato curioso de la cuenta de prueba: «Suscriptor del Oráculo Diario» sale «En curso 1/1» (progreso igual a la meta pero sin desbloquear). Es de `lib/achievements` (sin dueño), no de la pantalla.

### Comandos y resultados

| Comando | Resultado |
|---|---|
| `npx jest` de las 4 suites nuevas | 4 suites / 31 pruebas verdes |
| `npm run test:e2e:responsivo -- --grep "collection\|achievements\|challenges\|cards"` (antes de la 3.ª fusión, con build) | **120 passed** (8.3 min): 20 por ancho en 1440/1024/820/360, 32 en 390 (con `@en`), 8 en WebKit 390; maqueta, encabezados, movimiento reducido y sin JS |
| Lo mismo con `ARCANA_E2E_DEFECTOS=0` (`ARCANA_E2E_REUSE=1`) | **120 passed** (4.3 min) |
| Tras la 3.ª fusión: `e2e-db.mjs serve` (build nuevo) + la misma corrida, normal y con `ARCANA_E2E_DEFECTOS=0` | **120 passed** (2.9 min) · **120 passed** (3.0 min) |
| `capturas.cjs` contra ese build de producción (`/collection` con historia y vacío, `/achievements`, `/challenges`, `/cards`, `/cards?palo=cups`, `/cards/the-fool` × 1440/390/360) | 21 × status 200, scroll lateral 0, un h1, nada fuera de pantalla, 0 imágenes rotas, 0 errores de consola |
| Chequeo propio en Chromium (reduced-motion y sin JS) | ver «Falso o ya hecho»; sin JS `/cards` 78 fichas, `/cards?palo=cups&q=copas` 14, `/cards/the-star` con su h1, sin scroll lateral |
| `grep` de paleta vieja, `text-white`, `prose`, `imageUrl`, `framer-motion` en mis archivos | 0 coincidencias |
| `npx tsc --noEmit` | 0 errores |
| `npm run lint` | **0 errores**, 13 avisos, todos ajenos y previos (`prisma/*`, `scripts/generate-images.ts`, `profile/setup`, `referral`, `settings`, `lib/challenges.ts`, `types/next-auth.d.ts`); los de `cards`, `collection` y `AchievementUnlockedModal` ya no están |
| `npm test` | `check-messages: ok (1037 keys)` · **103 suites / 1,398 pruebas verdes** (sigue el aviso previo «A worker process has failed to exit gracefully») |
| `npm run build` | exit 0; `/cards`, `/cards/[slug]`, `/collection`, `/achievements`, `/challenges` compilan como ƒ |

### Capturas

`C:/Users/guill/AppData/Local/Temp/claude/C--Users-guill-dev-arcana/ba3d8826-c8e4-418f-8b14-19f131c84e14/scratchpad/fase2/L5/`
(36 PNG, página completa salvo modales, es-MX; las 21 de páginas se rehicieron contra el build de producción tras la 3.ª fusión,
las 15 de modales son de `npm run dev:e2e` con el arnés): `collection-historia`, `collection-vacio`, `achievements`,
`challenges`, `cards`, `cards-copas`, `cards-the-fool`, `modal-logro`, `modal-reto`, `modal-nivel`, `modal-dorada`, `modal-doradas`,
cada una en `-1440`, `-390` y `-360`. En las 36: status 200, scroll lateral 0, un h1, nada fuera de pantalla, ningún objetivo táctil
< 44 px en `main`/diálogo (salvo el botón del arnés), 0 imágenes rotas. Scripts: `capturas.cjs`, `movimiento.cjs`; arnés de modales
(no commiteado) en `arnes/page.tsx`. Corregido tras mirarlas: marcos de carta de alto desigual, lámina con el título lejos en móvil y
la columna derecha vacía en escritorio, contador sin espacio, total de créditos separado de su unidad.

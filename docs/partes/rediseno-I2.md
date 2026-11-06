## Parte I2 · Integración de la Fase 2 (rediseño «Dos tintas», Fase 3)

Árbol principal `C:/Users/guill/dev/arcana`, rama `rediseno/dos-tintas`, base `bd4610d`. 6 nov 2026. Sin `git push`. Ninguna base
tocada salvo `arcana_e2e` del clúster local (`127.0.0.1:54329`, siempre vía `scripts/e2e-db.mjs`); `npm run build` leyó
producción sólo para el sitemap (como en I1). Jest con las URLs muertas de `jest.config.ts`. El clúster **no** se detuvo
(lo apaga Fable en la Fase 4). `BITACORA.md` no se tocó.

Limpieza previa: ningún servidor en `:3000` ni `:3011–3016`; el único `next start` vivo cerca era `:3456` de
`legalstock-lote7a` (ajeno, no se tocó). `tsconfig.json` sin cambios al empezar y al terminar.

### 1 · Hecho

| Commit | Qué |
|---|---|
| `a26b41e` | fusión `rediseno/f2-L1` (portada) · limpia |
| `45e8356` | fusión `rediseno/f2-L3` (día y mesa) · limpia |
| `16ab48d` | fusión `rediseno/f2-L4` (sistemas) · limpia |
| `54e3400` | fusión `rediseno/f2-L5` (colección y juego) · limpia |
| `431a89e` | fusión `rediseno/f2-L6` (cuenta, dinero y textos) · conflicto en `e2e/responsivo.spec.ts` (§3) |
| `7436c61` | fusión `rediseno/f2-L2` (lectura) · conflicto en `e2e/responsivo.spec.ts`; `DEFECTOS` queda **vacía** |
| `4f7c293` | un solo `buttonClasses()` para enlaces: fuera `landing/EnlaceBoton.tsx` (L1, cliente) y el espejo `enlaceBoton()` de L4; `link-styles.ts` reexporta `buttonClasses` y `linkButtonClass` conserva su firma; la base compartida gana `no-underline` (la tenía el espejo) |
| `dfcd1e5` | fuera `SavedReadingCard` (sin consumidores) y la prop `imageUrl` de `TarotCard` (no se leía) |
| `af2a73f` | las pruebas de `cn()` usan tokens de Dos tintas en lugar de `text-red-500`/`bg-blue-500` (misma intención) |
| `3c1a179` | **fuera el remapeo**: `src/app/remapeo-paleta.css` y su `@import`; el bloque del remapeo de `dos-tintas-contraste.test.ts` pasa a ser el gate permanente (§4) |
| `9f940f0` | `.reverso-carta` a `@layer components` (handoff F1-B/L3) |
| `acca485`, `057457b` | `CartaQuemable`: la pista se acomoda a cartas angostas con *container query*, umbral medido de 200 px (handoff L2) |
| `6a3dbd9` | fuera `compatibility/MotionSafe.tsx` y su export (sin consumidores) |
| `f79d680` | fuera 9 llaves sin uso de `landing.*` en es y en |
| `fb5d9a7` | **cambiar de idioma recarga la página** en lugar de `router.refresh()` (lo destapó la suite completa; detalle abajo) |
| este | el parte |

Detalle de lo que no es obvio en la tabla:

- **`buttonClasses`.** Comparé las clases de cada variante (`primario`, `linea`, `fantasma` y alias) y tamaño (`sm`, `md`, `lg`):
  el espejo de L4 sólo difería en `no-underline` (suyo) y `disabled:*` (de la base, sin efecto en un `<a>`). Agregué
  `no-underline` a `ui/button-classes.ts` para que un enlace-botón nunca herede un subrayado; ahora son idénticas. Las
  escenas de la portada usan `<Link className={buttonClasses({ …, size: "lg" })}>` (el tamaño por omisión de `EnlaceBoton`).
- **`ReversoCarta` en capa.** Usos revisados: los que no pasan clases (`daily`, `dashboard`, `history`, `reading/new`,
  `CardPlaceholder`, la tapa de `CartaQuemable`) quedan igual (siguen llenando su caja); `not-found` pasa `h-full w-full`
  (lo mismo); `error.tsx` pasa `h-auto w-full` (mismo resultado: el SVG toma el alto de su `viewBox`). **Cambia uno, a
  propósito**: el cargador de `CompatibilityForm` pedía `h-28 w-16` y la regla fuera de capa lo ignoraba; ahora sus tres
  reversos miden 64 × 112 como L4 los diseñó.
- **Pista de `CartaQuemable`.** Cada carta es un contenedor `inline-size`; la pista por omisión lleva su forma corta
  («Toca») y la muestra bajo 200 px de carta; una pista propia se parte en renglones en vez de cortarse; la pista se
  centra con `left/right: 6px` + `width: fit-content` (antes `left: 50%` + `nowrap`, que se salía). Medido con Martian
  Mono en el build de producción: «Toca para voltear» ocupa 176 px (en: «Tap to turn over», 167 px) → hace falta una
  carta de 188 px; el primer umbral (180 px) dejaba una franja cortada y lo corregí en `057457b`. Sigue `aria-hidden`: el
  nombre del botón es su `etiqueta`. L2 puede volver a `media` en móvil si quiere; no cambié su elección de `chica`.

- **Cambio de idioma (`fb5d9a7`).** La primera corrida completa de `npm run test:e2e` dio 1 falla:
  `home.spec.ts` › «should be able to switch to English». Repetida aislada: **4 de 5 fallan**. Diagnóstico en el
  build de producción: tras guardar la cookie (`POST /api/locale` 200), el `router.refresh()` pide `/?_rsc=…`, el
  servidor responde en ~20 ms (Chrome recibe 99.5 KB; con `curl` y los mismos encabezados el flujo termina bien),
  pero Chrome **cancela la carga en el renderer al llegar el último byte** (`Network.loadingFailed` · `net::ERR_ABORTED` · `canceled: true`; sin
  `pagehide`, sin `AbortController.abort()` ni `cancel()` de flujos, sin navegación: instrumentado). La transición
  del router queda suspendida para siempre (`FiberRoot.suspendedLanes` = carril de transición, sin commit
  pendiente): la página no cambia de idioma y el selector se queda `disabled`. Sólo pasa en la portada (0–1 de 5;
  `/about`, `/calendar`, `/cards` y un artículo del blog: 5/5), también con el service worker activo (4/6), nunca en
  `next dev`. Bisección: con mis cambios de la portada revertidos sigue (0/6); con `error.tsx`/`not-found.tsx` de L1
  baja la frecuencia pero no desaparece; el build que dejó L1 dio 5/6. Las tasas varían entre corridas del mismo build
  (3/6 y luego 6/6): es una carrera de tiempos en Chrome/Next que no aislé. Arreglo: tras guardar la cookie el
  selector **recarga la página** (`recargarPagina()`), así el idioma cambia todo el documento a la vez (`lang`,
  metadata, textos del servidor) sin depender de esa respuesta; si el servidor no guarda el idioma, no recarga y el
  selector vuelve a estar disponible. Costo: un cambio de idioma a media escritura pierde lo escrito (antes lo
  conservaba el `refresh`). Prueba nueva `LanguageSelector.test.tsx` (4). e2e «switch to English»: **10/10**;
  `home.spec` completa 12/12.

### 2 · Falso o ya hecho

- **`BlueprintWidget` con degradado morado-ámbar y `text-slate-*`** (handoff L4 → L3): L3 ya lo había reescrito (`fee33e0`);
  `BlueprintBadges` ya estaba en dos tintas (L4). 0 en el gate sin tocarlos.
- **`imageUrl` en `GoldenCardInfo`** (`reading/new/[spreadTypeId]/page.tsx`, handoff L5): L2 ya deriva el tipo de las props
  del modal (`ComponentProps<typeof GoldenCardModal>["cards"][number]`) y L5 quitó `imageUrl` de ellas: no queda nada.
- **Rodeos de `buttonClasses` de L3, L5 y L6**: ya estaban fuera; sólo quedaban los de L1 y L4.
- **`pulse.moreThanTarot.{subtitle, cta}`** (L1 las listó como sin uso): **falso**, el dashboard de L3 las usa
  (`dashboard/page.tsx:309, :326`). Se quedan.
- **Colores sueltos de la paleta vieja** (hex/`rgb()` morados o ámbar en CSS/TSX fuera de `email.ts`): 0. Todos los que
  hay son de Dos tintas (tinta 14/13/12, papel 236/234/230, rosa 228/0/124, rosa-luz, brasa). `globals.css` ya no tenía
  degradados, scrollbar ni `::selection` morados (F1-A).
- **«Las 49 rutas»**: `e2e/responsivo.spec.ts` tiene **46** entradas (16 públicas, 22 con `con-historia`, 8 estados
  vacíos con `nuevo`), las mismas desde F1-C. Las capturas cubren las 46.
- **`fixme` de rediseño**: con `DEFECTOS` vacía no queda ninguno. Quedan sólo los de siempre: Google apagado
  (`auth.spec.ts`) y el email sin `@` de `api/auth/register` (`smoke.spec.ts`).

### 3 · Conflictos y cómo se resolvieron

| Archivo | Fusión | Resolución |
|---|---|---|
| `e2e/responsivo.spec.ts` | L6 | HEAD (con L3) había borrado `PROGRESO_404` y sus filas; L6 borró `SIN_H1_AUTH`/`SIN_H1_LEGAL` y las suyas. Cada lado quitó sólo lo suyo: se quitaron los dos lados. Se conservó la regex nueva de L6 del árbol ARIA (`/- '?heading …/`) |
| `e2e/responsivo.spec.ts` | L2 | Igual: HEAD tenía las 3 filas de L2, L2 tenía las de L3/L6. Resultado: `const DEFECTOS: Record<string, Defectos> = {};` con su comentario («vacía desde la Fase 3») |
| `messages/{es,en}.json` | todas | **sin conflicto de texto**. Comprobado por valor contra `bd4610d`: **0 valores cambiados, 0 llaves perdidas, +118 llaves por idioma**; los acentos de `643eaf1` intactos. `check-messages: ok` tras cada fusión (1068 → 1081 → 1089 → 1107 → 1133 → 1137; 1085 tras borrar las 9 llaves de §1) |
| specs tocadas por varios (`home`, `smoke`, `reading`, `legal`, `flujos/*`) | — | sin conflicto: los lotes ya habían fundido la base con las regex de acento |

Tras cada fusión: `npx tsc --noEmit` 0 errores y `npm run pretest` verde.

### 4 · Gate de la paleta

Comando (sobre cada árbol con `git grep`, `src/` completo **con pruebas**, sin `remapeo-paleta.css`):

```
RE='(bg|text|border|from|via|to|ring|ring-offset|fill|stroke|shadow|outline|divide|placeholder|decoration|accent|caret)-(slate|purple|violet|indigo|fuchsia|pink|amber|yellow|orange|red|rose|emerald|green|teal|blue|sky|cyan|lime|gray|zinc|neutral|stone)-[0-9]{2,3}'
git grep -ohE "$RE" <commit> -- src ':!src/app/remapeo-paleta.css' | wc -l
```

| Medida | `bd4610d` (antes de fundir) | `7436c61` (recién fundido) | final |
|---|---|---|---|
| clases de las 22 familias | 1,681 en 87 archivos | 9 en 1 archivo (`utils.test.ts`) | **0** |
| `text-white` como clase | 21 | 0 | **0** |
| `prose` como clase (`.tsx`/`.css`) | 8 | 0 | **0** |
| `imageUrl` en `src/app/**` (sin `api/`) y `src/components/**` | 40 | 2 (tipos de `SavedReadingCard` y `TarotCard`) | **0** |
| `src/app/remapeo-paleta.css` | existe | existe | **borrado** |

`grep text-white src` todavía da **8 líneas**, todas dentro de regex de pruebas que exigen su ausencia
(`not.toMatch(/…|text-white|…/)` en `cartas-pages`, `coleccion-page`, `l6-cuenta`, `l6-textos`, `logros-retos-page` ×2,
`celebraciones`, `InstallPWA`): son el gate, no usos. `imageUrl` sigue en la capa de datos (`src/app/api/**`, fuera de
alcance), como pide el encargo.

El gate queda **permanente en Jest**: `dos-tintas-contraste.test.ts` › «sin paleta vieja (gate de la Fase 3, §5.3)»
recorre `src/` (≥ 200 archivos) y falla si vuelve el remapeo, una clase de las 22 familias (también en pruebas),
`text-white` o `prose` en el código de la app, o una lectura de `imageUrl` en la UI. Comprobado que falla de verdad:
con un `text-amber-400` temporal en `EscenaTuTurno.tsx` el test nombra `src/components/landing/EscenaTuTurno.tsx:23`
(parche revertido).

### 5 · Handoffs

**Resueltos**

| Handoff | De | Cómo |
|---|---|---|
| `EnlaceBoton` (L1) y espejo `enlaceBoton()` (L4) | L1, L4 | `4f7c293` (§1) |
| `ReversoCarta` fuera de capa | F1-B, L3 | `9f940f0` (§1) |
| Pista de `CartaQuemable` `media` cortada en cartas angostas | L2 | `acca485`, `057457b` (§1) |
| Código muerto: `MotionSafe` + export, `SavedReadingCard`, `EnlaceBoton` | L4, L2, L1 | `6a3dbd9`, `dfcd1e5`, `4f7c293`. Verificado con `grep` (importaciones estáticas y dinámicas, pruebas, e2e, scripts) |
| Llaves sin uso `landing.{readingCounter, dailyCard, testimonials, hero, howItWorks, features, spreadsSection, cta, dailyOracle}` | L1 | `f79d680`, en es y en a la vez. La portada sólo lee `landing.portada.*` y `landing.faq.*`; nadie más pide el namespace (sin `useTranslations()` raíz con `"landing.…"` ni llaves dinámicas fuera de `portada`) |
| `imageUrl` en `GoldenCardInfo` | L5 | ya hecho (§2) |
| Celda del Mapa en el dashboard (`BlueprintWidget`) y `BlueprintBadges` | L4 → L3 | ya hecho (§2) |

**No resueltos (con motivo)**

1. **React #418 ocasional a anchos de celular — no se reprodujo.** Método, contra el build de producción de
   `e2e-db.mjs serve` (`isMobile`, `hasTouch`, DPR 2, es-MX, America/Mexico_City, contexto nuevo por carga, `pageerror` +
   errores de consola):
   - bucle normal: 6 rutas (`/reading/new` vacío y con historia, `/share/blueprint/e2eMapaAna1`, `/share/e2eShare04`, `/`,
     `/dashboard`) × 360 y 390 × 60 vueltas = **720 cargas, 0 errores**;
   - bucle con estrés: CPU ×6 por CDP, 8 en paralelo y recorrido de scroll con `lazy → eager` en cuanto hay DOM (antes de
     que termine de hidratar), 3 rutas × 2 anchos × 40 = **240 cargas, 0 errores**;
   - arnés real: `responsivo.spec.ts` › maqueta de `/reading/new (vacío)` y `/share/blueprint/[shareId]` a 360, 390 y 390
     `@en`, `--repeat-each=16` = **96 pruebas, 96 ✓**.

   Total **1,056 cargas** (248 de cada una de las dos rutas señaladas). Revisión de código: ningún componente de cliente de
   esas rutas lee `window`, `matchMedia`, `localStorage`, `Date.now()`, `Math.random()` ni zona/idioma del navegador durante
   el render (`useMedia` usa `useSyncExternalStore` con instantánea de servidor; `HoraDelDia` sólo depende del día UTC;
   `ResonanceCheck` lee el reloj tras montar y formatea en UTC; `SessionProvider` empieza en «loading» en los dos lados).
   La única traza que quedó (`arcana-lotes/f2-L2/test-results/responsivo--share-blueprint-shareId-maqueta-chromium-390-repeat3`)
   muestra `#418 args[]=HTML` durante el `goto`, antes de que el arnés tocara la página, y sobre la versión de
   `/share/blueprint` **anterior a L4** (sin `HoraDelDia` ni pie), con los seis lotes compilando y corriendo a la vez. No
   encontré la causa; la página de entonces ya no existe (L4 la rehízo sin estado de cliente). Si reaparece, conviene
   correr esa ruta en `npm run dev:e2e`, que da el diff. Scripts: `scratchpad/fase3/hidratacion.mjs` y sus `.json`.
2. **Rendimiento de la portada en celular — no cumple LCP; CLS en el límite.** Medido sin instalar nada (Playwright + CDP:
   red «Slow 4G» 150 ms / 1.6 Mb/s / 750 kb/s, CPU ×4, caché fría, 412 × 823, DPR 1.75, `next start` local):
   **LCP mediana 3,728 ms** (5 corridas, 3,680–3,752) y **CLS mediana 0.025, máx. 0.0555** (en otra serie de 4: 0.0555 en
   3). Causa del LCP: **el elemento LCP es un grabado de la mesa** (`wands10-mesa.webp`, 209 × 291 px visibles a opacidad
   .8), no la tesis como pide §5.6. La tesis nunca es candidata: sus tres renglones son `span` en bloque y cada uno cuenta
   aparte (el mayor candidato de texto es «Pregunta», 31,050 px², a ~1.1–1.4 s); el grabado mide 60,618 px² y llega tarde
   (`loading="lazy"` + `fetchpriority="low"` detrás de ~300 KB de fuentes precargadas). Experimentos (CSS/HTML inyectado
   sólo en la medición, sin tocar código):

   | Experimento | LCP mediana | Elemento LCP |
   |---|---|---|
   | tal cual | 3,728 ms | grabado de la mesa |
   | sin mesa (`display: none`) | 1,128 ms | «Pregunta» |
   | mesa a opacidad 0 | 1,164 ms | «Pregunta» (Chrome ignora lo transparente) |
   | mesa con fundido al cargar | 4,132 ms | grabado (Chrome lo cuenta al volverse visible: peor) |
   | grabados visibles sin `lazy` ni prioridad baja | 2,524 ms | grabado; CLS 0.059 y `load` de 4.8 → 6.6 s |

   Causa del CLS (atribuida bloqueando una familia a la vez): 0.031 a ~1.7 s por el cambio a **Gloock** (el `h1` cambia de
   alto y el bloque del héroe, anclado abajo, se mueve; desaparece sin Gloock) y 0.025 a ~2.1 s por **Martian Mono** (la
   etiqueta «Tarot con IA · 78 grabados de 1909» cambia de renglones y empuja «Pregunta», el `h1` y los botones;
   desaparece sin Martian). No lo arreglé: no lo introdujo la integración y cada salida es una decisión de diseño o de carga
   (portada de L1, mesa de F1-B, fuentes de F1-A). Opciones para Fable, de menor a mayor cambio: (a) no precargar la
   itálica de Newsreader (131 KB en cada página; hoy se precargan la normal y la itálica); (b) reservar el alto de la
   etiqueta del héroe / anclar el héroe arriba; (c) que los grabados de la mesa no sean candidatos (en lienzo, o una
   variante `mesa` de menos píxeles naturales, que Chrome cuenta a escala) o una tesis más grande en móvil. Datos en
   `scratchpad/fase3/lcp*.json`, script `lcp.mjs`.
3. **Sin dueño, siguen**: `api/auth/register` acepta un email sin `@` (`fixme` en `smoke.spec.ts`); aviso de Jest «A worker
   process has failed to exit gracefully» (probable `setInterval` sin `unref` de `src/lib/rate-limit.ts`, lógica de `lib`).
4. **Causa de fondo del corte RSC en la portada** (§1, cambio de idioma): quedó rodeada con la recarga, no explicada.
   Si se ve en otros `router.refresh()` (los usan login, registro, `CompatibilityForm` y `ResonanceCheck`), el patrón es
   el mismo: `net::ERR_ABORTED` con `canceled: true` al llegar el último byte. Scripts `scratchpad/fase3/idioma-*.mjs`.
5. **Para Fable**: `aria-label="Change language"` del selector sigue en inglés (lo busca `e2e/home.spec.ts:83`; traducirlo
   pide cambiar la spec a la vez, F1-A); la marquesina de signos existe dos veces (`landing/EscenaHoy` de L1 y
   `calendar/SignosDelDia` de L3; L3 propuso unificarlas en `tinta/`); el reverso en lienzo se ve más suave que el SVG en
   cartas grandes y `mesa` pesa ~12 KB por carta (F1-B); WebKit sólo a 390 en públicas (iPhone real en Fase 4); en
   `/achievements` y `/challenges` la recompensa dice «+1 créditos» (`+{n} {t("credits")}` sin plural ICU, L5).

### 6 · Pendientes para Memo

Consolidados de F1-A, F1-B, F1-C, I1, I1b y L1–L6, sin duplicados. Ninguno lo decidí yo.

1. **«Hoy» en UTC**: desde las 18:00 de CDMX la cabecera, la portada, `/calendar`, la carta del día y la banda del dashboard ya muestran el día siguiente (I1, L1, L3, L4).
2. **Hora corta de la cabecera a 360**: se corta con puntos suspensivos en ~la mitad de los días (diseño aprobado); ¿o partirla en dos renglones? (I1b).
3. **Testimonios**: se quitaron de la portada por inventados; si los quiere, que sean de personas reales y con permiso (L1).
4. **Contador de lecturas**: se quitó porque inflaba la cifra («10+» con 3 lecturas); ¿volver con la cifra real? (L1).
5. **Precio del Oráculo diario**: la portada ya no muestra «$3.99/mo»; el camino es «Recíbela cada mañana» → `/subscribe`; ¿lo quiere visible? (L1).
6. **Respuesta 2 de las preguntas frecuentes**: «Nuestra IA ha sido entrenada con conocimiento profundo del simbolismo del tarot» no es exacta (la escribe un modelo general con las instrucciones de Arcana); decidir el texto (L1).
7. **JSON-LD `FAQPage`** con las tres preguntas para resultados enriquecidos: ¿se agrega? (L1).
8. **Carta del día en inglés**: si una carta no tiene `meaningUprightEn` en producción, la portada en inglés muestra sólo nombre y frase general (L1).
9. **Mayúsculas de título en textos viejos** (en español van con minúscula): «Las Cartas se Revelan», «Tu Lectura», «Ver Interpretación», «Tu Intención» (L2); «Completa tu Perfil», «Nombre Completo», «Fecha de Nacimiento», «Área de Enfoque», «Hora del Email», «Guardar Perfil» (L4); vistas también en las capturas: «Nuestra Misión», «Cómo Funciona», «Aviso Legal», «Crear Cuenta», «Iniciar Sesión», «Las Cartas Reveladas», «Significado al Derecho», «¿Listo para tu Lectura?».
10. **h1 de la lectura compartida**: dice «Tu Lectura» aunque la ve otra persona (L2).
11. **Cruz Celta**: ¿el desafío cruzado encima del presente (como en la mesa) aunque tape media carta? Hoy va debajo para que se lean las dos (L2).
12. **Palabras a pincel elegidas**: «Tu mesa», «Hoy», «Racha» (L3); «Logro», «Cumplido», «Dorada», «Nivel», y en inglés «Earned», «Done» (L5).
13. **Página de progreso de nivel**: hoy «Ver logros» del nivel lleva a `/achievements`; ¿quiere una propia? (L3).
14. **Glifos del zodiaco chino y del tonalli**: son emoji impresos en gris (en iPhone se verán como fotos grises); un juego grabado propio sería un encargo aparte (L4).
15. **Hora del correo diario en UTC** («Ciudad de México es UTC-6»): para alguien en México sería más claro elegirla en su hora (L4).
16. **Logros de cartas doradas** ahora aparecen en `/achievements` (3 filas más; antes contaban en el total sin verse) (L5).
17. **Cartas no descubiertas** en tinta tenue: se alcanza a leer su título impreso; ¿misterio total con el reverso? (L5).
18. **Textos nuevos de la colección**: «Las cartas en tinta tenue aún no salen en tus lecturas.», «Archivo de sellos», «Índice de grabados · 1909», «78 grabados · Pamela Colman Smith, 1909» (L5).
19. **«Suscriptor del Oráculo Diario»** sale «En curso 1/1» sin desbloquearse en la cuenta de prueba: es de `lib/achievements` (lógica, sin dueño) (L5).
20. **Bienvenida tras pagar con créditos** (antes decía «No se encontró sesión»): verla en vivo y decidir si se queda (L6).
21. **Grabados de adorno**: uno por artículo del blog y uno asomado detrás del formulario en las pantallas de cuenta (escritorio); ¿se quedan o elige la carta de cada post? (L6).
22. **Imagen OG sólo en español**: una variante en inglés sería otra imagen y otro `metadata` (F1-B).
23. **Textos de las tiradas sin acentos** (vienen de la base, no de `messages`): «Obten guia», «Posicion Actual», «Accion a Tomar», «Tu Corazon», «La Conexion», «romantica», «El Ano que Viene» (visto en las capturas de `/reading/new` y `/reading/manual`; conviene revisar la base de producción).
24. **Cambiar de idioma ahora recarga la página** (§1): si a alguien le cambia el idioma a media escritura, pierde lo que llevaba escrito.

### 7 · Comandos y resultados

Todo en el árbol principal, en serie, sobre el árbol final (`fb5d9a7`; este parte sólo agrega este archivo).

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` (tras cada fusión y al final) | **0 errores** |
| `npm run lint` | **0 errores, 7 avisos**, todos previos y fuera de la UI: `prisma/add-subscriber.ts` ×2, `prisma/add-tester-credits.ts`, `prisma/seed.ts`, `scripts/generate-images.ts`, `src/lib/challenges.ts`, `src/types/next-auth.d.ts` (I1b tenía 16) |
| `npm test` | `check-messages: ok (1085 keys in en and es)` · **116 suites / 1,547 pruebas, todo verde** (I1b: 99 / 1,367). Sigue el aviso previo del worker de Jest |
| `npm run build` | **exit 0**, «Compiled successfully» · 79 rutas (78 ƒ + `/sitemap.xml`) · `/` 3.7 kB (170 kB First Load JS) |
| `npm run test:e2e` desde cero sobre `057457b` (reset + siembra + `next build` en `.next-e2e` + `next start :3000`) | 1,018 ✓ · **1 ✘** (`home.spec` «switch to English») · 2 omitidas → arreglado en `fb5d9a7` (§1) |
| **`npm run test:e2e` desde cero sobre `fb5d9a7`** | **1,019 ✓ · 0 ✘ · 0 inestables · 2 omitidas** (Google apagado; `fixme` del email sin `@` de `api/auth/register`). 9.4 min de pruebas. Ningún `fixme` de rediseño: las 75 de I1b ya corren y pasan |
| **`ARCANA_E2E_REUSE=1 ARCANA_E2E_DEFECTOS=0 npm run test:e2e:responsivo`** sobre ese mismo build (`ARCANA_E2E_SKIP_BUILD=1 … serve`) | **926 ✓ · 0 ✘ · 0 omitidas · 0 inestables** (7.3 min) |
| «switch to English» aislado, `--repeat-each` | antes del arreglo 1/5 ✓; después **10/10** |
| bucles de hidratación (§5.1) | 720 + 240 cargas, 0 errores · arnés real 96 ✓ |
| LCP / CLS de `/` en celular (§5.2) | LCP mediana 3,728 ms (✘ ≤ 2.5 s) · CLS mediana 0.025, máx. 0.0555 (en el límite de 0.05) |
| capturas (§8) | 230 · status, `h1`, scroll horizontal, consola y objetivos < 44 px: **0 fallas** |
| al cerrar | `:3000` y `:3011–3016` libres; clúster arriba (`e2e-db.mjs status`: «running; 127.0.0.1:54329 answers»); `tsconfig.json` sin cambios |

`npm run test:e2e` final por spec y proyecto:

| Spec | 1440 | 1024 | 820 | 390 | 360 | WebKit 390 |
|---|---|---|---|---|---|---|
| `auth` · `home` · `legal` · `reading` · `smoke` | 17 (+1 skip) · 12 · 17 · 13 · 20 (+1 skip) ✓ | — | — | — | — | — |
| `red-desbordes` | 1 ✓ | — | — | — | — | — |
| `flujos/*` | 13 ✓ | — | — | — | — | — |
| `responsivo` | 154 ✓ | 154 ✓ | 154 ✓ | 246 ✓ (incl. `@en`) | 154 ✓ | 64 ✓ |

### 8 · Capturas

Carpeta: `C:/Users/guill/AppData/Local/Temp/claude/C--Users-guill-dev-arcana/ba3d8826-c8e4-418f-8b14-19f131c84e14/scratchpad/fase3/capturas/`
(`<ruta>-<ancho>.png`, página completa, build de producción de `e2e-db.mjs serve`, es-MX, America/Mexico_City; 820/390/360
con `isMobile` + `hasTouch`). Índice: **`…/fase3/capturas/indice.html`** (una fila por ruta con sus cinco anchos);
medidas: `…/fase3/capturas/resumen.json`; script: `…/fase3/capturas.mjs`.

- **46 rutas × 5 anchos = 230 capturas** (las «con y sin historia» son las 8 entradas `(vacío)` de la spec), tomadas
  sobre `057457b`; después sólo cambió el comportamiento del selector de idioma (`fb5d9a7`), nada visible.
- Por captura: status esperado (230/230), un solo `h1` (230/230), `scrollWidth − clientWidth = 0` (230/230), 0 errores de
  consola, 0 objetivos táctiles < 44 px en `main` (los enlaces en línea dentro de un párrafo se cuentan aparte: excepción
  de WCAG 2.5.8).
- Revisadas a ojo en 1440 y 360 (con mosaicos para leer las de 360): todas las públicas y las de sesión. Nada encimado,
  cortado ni fuera de registro. Lo único que parecía roto era del script (el `scroll-behavior: smooth` de `html` dejaba
  la captura a media animación, con la cabecera sticky desplazada y los `data-revelar` de «Tu turno» sin revelar): se
  corrigió el script (`behavior: "instant"`) y se rehicieron las 230. La escena 2 de la portada se ve como un hueco alto
  en una captura estática: es la escena de 320svh con el lienzo fijo (L1 dejó capturas por punto de scroll).

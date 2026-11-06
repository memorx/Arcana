## Parte F1-A · Base visual («Dos tintas»)

Rama `rediseno/f1-A` (worktree `C:/Users/guill/dev/arcana-lotes/f1-A`), base `969bf7b`. Sólo los archivos del lote (lista
del encargo + §5.5) y este parte. Sin dependencias nuevas, sin `git push`, sin `prisma`, sin scripts que escriban en la base.
`npm run build` sí (sólo lee la base de producción para el sitemap). El servidor de verificación quedó apagado.

### Hecho (por ficha, con su commit)

1. **Tokens y suelos** · `src/app/globals.css` · `7879d5b`
   - `@theme static` con los tokens de §2.1 (`tinta`, `papel`, `papel-hondo`, `grafito`, `niebla`, `rosa`, `rosa-texto`,
     `rosa-luz`, `brasa`) y los semánticos (`error` #B3261E, `error-claro` #FF8A80, `exito` #1F6B3A, `exito-claro` #7BD88F).
     `static` = se emiten siempre como variables CSS (el remapeo y el JS de los momentos firma pueden leerlas).
   - Medidas de la maqueta como utilidades: `px-gutter`/`gap-gutter` (`clamp(16px, 4vw, 56px)`), `max-w-pliego` (1240),
     `max-w-escena` (1440), `ease-tinta`.
   - `@theme inline` para las fuentes (`font-titulo`, `font-lectura`, `font-dato`, `font-pincel`) sobre las variables de
     next/font; `font-sans`/`font-serif`/`font-mono` quedan como red (Newsreader/Gloock/Martian): aquí no hay sans.
   - **Suelos con colores de contexto**: `.suelo-papel` / `.suelo-tinta` definen `--suelo`, `--filete`, `--letra`,
     `--letra-suave`, `--letra-acento`, `--letra-error`, `--letra-exito`, expuestos como `bg-suelo`, `border-filete`,
     `text-letra`, `text-letra-suave`, `text-letra-acento`, `text-letra-error`, `text-letra-exito`. Las primitivas los usan,
     así que se leen igual sobre papel que sobre tinta sin variantes nuevas.
   - `color-scheme: light`; body en papel/tinta/Newsreader 17 px; h1–h3 en Gloock 400 con `font-synthesis-weight: none`
     (un `font-bold` viejo no engorda a Gloock); foco rosa global 2 px; `::selection` rosa-luz/tinta; scrollbar papel/grafito.
     Fuera el degradado y los radiales morados (`:28-61`), la scrollbar oscura (`:128-144`) y la selección morada (`:153-156`).
   - Utilidades: `pincel-seco` (`filter: url(#pincel-seco)`), `animate-entra` (fundido de 240 ms que sube 8 px). Se conservan
     `animate-float/glow/shimmer/confetti` (las usan pantallas de otros lotes; el brillo del shimmer ahora es rosa).
   - Red de reduced-motion: toda animación CSS salta a su estado final (no las transiciones: el «fundido corto» de la carta
     revelada de F1-B sigue funcionando).
2. **Remapeo** · `src/app/remapeo-paleta.css` (nuevo, importado al final de `globals.css`) · `7879d5b`
   - `@theme` con la **tabla exacta de §5.3** para las 17 familias (171 variables); `white`/`black` intactos. Verificado en el
     CSS compilado (`.next/static/css/*.css`): `--color-slate-900:#e2dfd9`, `--color-purple-500:#e4007c`, etc.; la única
     variable de paleta que sigue en `oklch` es `--color-lime-400` (1 uso, familia fuera de la tabla).
   - Además (decisión, ver abajo) el **espejo en tinta** dentro de `.suelo-tinta` y la vuelta a la tabla en
     `.suelo-tinta .suelo-papel`, para que el contenido viejo de un modal (que ahora es de tinta) no quede negro sobre negro.
3. **Fuentes, filtro, viewport, manifest** · `src/app/layout.tsx`, `public/manifest.json` · `874f43e`
   - next/font: Gloock 400; Newsreader variable (`axes: ["opsz"]`, normal + itálica); Martian Mono variable; Water Brush 400
     con `adjustFontFallback: false` (y sin precarga). Variables `--fuente-gloock/-newsreader/-martian/-water-brush`, clases `.variable` en `<html>`.
   - `#pincel-seco` (el de `design/maqueta/index.html`) una vez en el body, oculto, `aria-hidden`, `focusable="false"`.
   - `export const viewport = { themeColor: "#0E0D0C", colorScheme: "light" }`. Skip link en rosa-luz/tinta, mono, 44 px.
   - `manifest.json`: `theme_color #0E0D0C`, `background_color #ECEAE6`; rutas de íconos sin tocar (F1-B).
4. **Componentes de tinta** · `src/components/tinta/{HoraDelDia,Pincel,Etiqueta,Escena}.tsx` (sin barril) · `1bd0e49`, `56de525`
   - `<HoraDelDia variante="larga" | "corta" fecha? className? />`: larga «jue 5 nov 2026 · 1 Mázatl (Venado) · Señor de la
     noche: Tláloc · Luna menguante 19%», corta «5 nov · 1 Mázatl · Tláloc · Luna 19%»; en en «Thu Nov 5, 2026 · 1 Mázatl
     (Deer) · Lord of the night: Tláloc · Waning Crescent 19%». Todo de `@/lib/systems` con `todayUtc()` (nunca hora local);
     fecha con `<time dateTime>`, prefijo «Hoy:» sólo para lector. Días y meses salen de `messages` con ICU `select` (no de
     `Intl`), así el texto no depende de la versión de ICU del servidor o del navegador. Es client component con texto
     idéntico en SSR y cliente (test de hidratación sin errores) y se vuelve a pintar al cruzar la medianoche UTC. Todas las
     rutas compilan como dinámicas (ƒ), así que el HTML nunca trae un día viejo.
   - `<Pincel as? className? aria-hidden?>`: Water Brush, rosa, `pincel-seco`, `leading-[0.9]`.
   - `<Etiqueta as? punto?>`: mono en mayúsculas, tracking .12em, color secundario de su suelo, punto rosa `aria-hidden`.
   - `<Escena suelo="tinta" | "papel" as?>`: su suelo y su letra, `overflow: clip` (no rompe lo sticky de adentro),
     `scroll-margin-top: var(--alto-cabecera)` (96 px).
   - `messages`: namespace nuevo `hora` (7 llaves), `nav.{mainNav,openNav,closeNav,navMenu,yourArcana,account,language}`,
     `common.cardsCredit`; append-only, mismas llaves en es/en (`check-messages`: 1011).
5. **Primitivas con el mismo API** · `src/components/ui/{button,card,badge,input,modal,LanguageSelector,index}`, `SoundToggle` · `ae39efb`
   - `Button`: `primario` (rosa-luz, letra tinta, al pasar brasa), `linea` (filete del color de la letra del suelo), `fantasma`,
     `peligro` (error, letra papel); `primary/secondary/ghost/danger` siguen como alias exactos. Mono 500 en mayúsculas,
     tracking .1em, píldora; `sm` 44 px, `md` 48, `lg` 56 de alto. Nuevo `buttonClasses({ variant, size, className })` para
     que un `<Link>` se vea como botón (hoy hay muchos `<Link><Button/></Link>`, que es HTML inválido).
   - `Card`: `bg-suelo` + filete `border-filete`, `rounded-sm`, sin sombras ni `backdrop-blur`; `interactive` sube 2 px y el
     filete se vuelve rosa; `highlighted` lleva un filete rosa de 3 px arriba. `CardTitle` en Gloock; `CardDescription` en
     `text-letra-suave`.
   - `Badge`: mono 11 px en mayúsculas; `default` filete tenue, `primary` rosa de texto, `secondary` invertido, `success`
     verde del suelo, `warning` lleno rosa-luz con letra tinta. Funciona en papel y en tinta (la cabecera lo usa).
   - `Input`: sin caja, filete inferior, Newsreader 17 px, etiqueta en mono; foco = filete rosa más grueso; error en
     `letra-error` (#B3261E / #FF8A80 según suelo) con `aria-invalid` y `aria-describedby` como antes.
   - `Modal` **sobre tinta** (§5.4/§5.5): trampa de foco (Tab y Mayús+Tab no salen), foco inicial (primer enfocable,
     `[autofocus]`/`[data-autofocus]` o `initialFocusRef`), `aria-labelledby` automático desde el primer h1/h2/h3 o
     `[data-modal-title]` (o props `aria-labelledby`/`aria-label`), bloqueo de scroll con compensación de la barra, Esc, foco
     de regreso al disparador, sólo la capa de encima atiende teclado. Un arrastre que empieza adentro y termina en el fondo
     ya no lo cierra. Exporta `useFocusTrap` (lo usa el menú móvil). `ModalHeader/Body/Footer` igual que antes.
   - `LanguageSelector`: sin banderas; botón mono «ES ▾» (conserva `aria-label="Change language"`, ver handoff F1-C); opciones
     «Español ES» / «English EN» con `lang`; Esc cierra; variante nueva `inline` (los dos a la vista, `aria-pressed`) para el
     menú móvil. `SoundToggle`: botón de icono de 44 px que toma el color del suelo (encendido en `letra-acento`) y reserva su
     hueco antes de montar (no mueve la cabecera).
6. **Cabecera y pie** · `src/components/layout/{Header,footer}.tsx` · `f3dec85`, `a797854`
   - `Header`: franja de tinta **sticky** (no fixed), dos filas: marca en Gloock · navegación en mono · lado derecho; abajo la
     hora (larga centrada desde 1024, corta debajo en < 1024, con puntos suspensivos si no cabe). Navegación con sesión:
     Mi espacio, Nueva lectura e Historial desde 1024; Carta del día y Calendario desde 1280 (entre 1024 y 1279 viven en el
     menú de usuario, como hoy hacía `lg`). Medido: a 1024 la fila no desborda. `aria-current="page"` con subrayado rosa.
     Créditos/gratis (mismo fetch a `/api/user/credits` y mismos respaldos de sesión), nivel y menú de usuario (todas las rutas
     de hoy, sin emojis, Esc lo cierra y devuelve el foco). Sin sesión: Calendario, Iniciar sesión (un solo enlace en todos los
     anchos: píldora de línea en móvil, fantasma en escritorio) y Registrarse.
   - **Menú móvil nuevo** (< 1024): botón con `aria-expanded`/`aria-controls="menu-movil"`; diálogo a pantalla completa en tinta
     (portal a `body`), foco inicial en «Cerrar», trampa de foco, Esc, scroll bloqueado, todo lo de atrás `inert` +
     `aria-hidden` mientras está abierto, el foco vuelve al botón; se cierra solo si la ventana crece a ≥ 1024. Con sesión:
     las 5 principales en Gloock grande, «Tu Arcana» con las 10 secundarias, cuenta y créditos, idioma, sonido y cerrar sesión.
     Sin sesión: Calendario, Explorar cartas, Blog, idioma, sonido, Iniciar sesión y Registrarse.
   - `Footer` en tinta, renderizable en servidor: marca, lema en itálica, los 6 enlaces de hoy en mono, «© 2026 Arcana ·
     readarcana.com» y **«Cartas: Pamela Colman Smith, 1909 · dominio público»** (`common.cardsCredit`).
7. **Layouts** · `src/app/(main)|(auth)|(legal)/layout.tsx` · `35071a4`, `a797854`
   - `(main)`: papel, `max-w-pliego` + `px-gutter` (los de `.app` de `lectura.html`), `py-[clamp(32px,6vh,64px)]`.
   - `(auth)`: franja de tinta con la marca y la hora (larga a la derecha desde 1024, corta en su fila abajo), formulario
     centrado sobre papel; fuera la luna y la estrella decorativas.
   - `(legal)`: ahora con la misma `Header` y `Footer` que el resto (antes no tenían ni cabecera ni pie).
8. **Animaciones** · `src/components/animations/**` · `61ef46a`
   - `FadeIn`, `AnimatedCard`, `FlipCard`, `StaggerContainer`/`StaggerItem` y `NumberTicker` con `useReducedMotion` (quietos y
     en su estado final). `PageTransition` conserva exportación y props pero ya no anima cada ruta (§5.4). `hoverGlow` es un
     filete rosa (nada de halos de color). El barril exporta también `FlipCard` y `StaggerContainer/StaggerItem`.
9. **Pruebas** · `68c5dfc`, `24197f5` y las de cada ficha
   - `src/__tests__/app/dos-tintas-contraste.test.ts` (24): lee los tokens de `globals.css` y calcula WCAG: las 16 parejas de
     texto chico de §2.1 (≥ 4.5), el rosa puro ≥ 3 y < 4.5 (sólo grande/foco), cada `letra*` sobre su suelo en papel y en tinta,
     y el remapeo (171 variables por bloque, tabla de §5.3, textos viejos legibles sobre fondos viejos en ambos suelos).
   - `src/__tests__/components/tinta.test.tsx` (12): con los textos reales de `messages`: 2026-11-05 → «1 Mázatl (Venado)»,
     «Señor de la noche: Tláloc», «Luna menguante 19%», corta exacta; en «1 Mázatl (Deer)», «Lord of the night: Tláloc»;
     convención UTC (21:00 de CDMX ya es 2 Tochtli); SSR = cliente con `hydrateRoot` sin errores; Pincel, Etiqueta, Escena.
   - `Modal.test.tsx` (+6): sobre tinta y nombrado por su título; foco inicial, Tab/Mayús+Tab no salen, scroll bloqueado;
     Esc cierra, vuelve el scroll y el foco regresa al disparador; cierre desde un botón interno; `aria-label`; arrastre.
   - `Header.test.tsx` (+6): franja sticky de tinta con la hora; menú móvil abre con Enter, lista todas las rutas, foco en
     «Cerrar», lo de atrás oculto, Tab atrapado; Esc cierra y devuelve el foco; cerrar con botón y con un enlace; invitados
     (calendario, explorar, blog, registrarse, un solo «Iniciar sesión»); Esc en el menú de usuario. Las 3 pruebas viejas
     (orden de la navegación, menú de usuario, invitados) pasan sin cambios.
   - `Button`/`Card`/`Badge`/`Input`: aserciones de clases reescritas a las nuevas con la misma intención, más alias
     viejo = nuevo, alto ≥ 44 px, `buttonClasses`, lámina sin sombras, campo de pliego.

### Falso o ya hecho

- `StaggerContainer`/`StaggerItem` nunca estuvieron en el barril `components/animations/index.ts` (sólo definidos en
  `PageTransition.tsx`) y nadie los usa; `PageTransition` tampoco tiene usos. Ahora se exportan los cuatro.
- `button.tsx:30` (deuda «slate-950 sobre ámbar» de §5.3): desaparece con el botón nuevo. De los 26 `text-white`, 3 eran míos
  (avatar de la cabecera, skip link, botón danger): quedan 23 ajenos.
- `prose*`: ninguno en mis archivos ni nada mío depende de typography; siguen en 8 archivos ajenos (lista abajo).
- §3 dice «franja de tinta fija»; §5.4 manda **sticky**: es sticky.
- El encargo pide `HoraDelDia` «server component o texto SSR = cliente»: es client component (necesita el repintado de
  medianoche) con texto idéntico; está probado con hidratación real.

### Handoffs

- **F1-B / integrador — `tinta.css`.** §5.5 dice que F1-A lo crea vacío y lo importa; la lista de archivos de este encargo no
  lo incluye, así que **no lo creé** (evita un conflicto add/add con F1-B). Al integrar, una línea en `globals.css`, antes del
  `@import "./remapeo-paleta.css"`: `@import "../components/tinta/tinta.css";`.
- **F1-B — componentes firma.** En `src/components/tinta/` ya están `HoraDelDia`, `Pincel`, `Etiqueta`, `Escena` (sin barril;
  se importan por ruta). Los tokens son variables CSS siempre emitidas (`getComputedStyle(document.documentElement)
  .getPropertyValue("--color-rosa")`), y hay `ease-tinta`, `animate-entra` y `pincel-seco`. La transición a pincel de
  `/reading/new/*` (revealing) y `/daily` es suya: `PageTransition` ya no hace nada.
- **F1-C — e2e.**
  - `LanguageSelector` conserva `aria-label="Change language"` en inglés porque `e2e/home.spec.ts:83` lo busca exacto; las
    opciones se llaman «Español ES»/«English EN» (siguen casando con `/\bES$/`, `/\bEN$/`). Si traducen la etiqueta, hay que
    cambiar la spec a la vez.
  - Menú móvil: botón `button[aria-controls="menu-movil"]` (`aria-label` «Abrir menú» / «Open menu»), diálogo `#menu-movil`
    (`role="dialog"`, nombre «Menú»/«Menu»). `[aria-label*="menu"]` sólo casa en inglés (en español es «menú»).
  - `e2e/smoke.spec.ts:260` busca `nav.hidden.md\:flex`; la navegación ahora es `nav[aria-label]` con `hidden lg:flex`: el
    `toBeHidden()` pasa porque no encuentra nada. Conviene apuntarlo a `header nav`.
  - Con `next start` sin `AUTH_TRUST_HOST`, `/api/auth/session` da 500 `UntrustedHost` (4 errores de consola por página en mis
    capturas); su `.env.e2e` lo cubre (§5.2).
  - Fijar el reloj en una hora UTC del 5 nov (p. ej. 18:00Z) para «1 Mázatl»: `HoraDelDia` usa el día UTC, así que desde las
    18:00 de CDMX ya muestra el día siguiente (igual que /calendar y la carta del día).
  - `/login` y `/about` no tienen `h1` (sus títulos son `CardTitle`, un h3): fallará «un solo h1» hasta que L6 lo cambie.
- **L1 (portada).** `src/app/page.tsx` usa `Header`/`Footer`. Con el remapeo se ve en dos tintas pero conserva ☾ ★ ✡
  decorativos y «Descubre tu destino» (§0 prohíbe «destino»). `Escena`, `Pincel`, `Etiqueta`, `buttonClasses` listos.
- **L2–L6.** Usar `buttonClasses()` en lugar de `<Link><Button/></Link>`; `text-letra*`/`bg-suelo`/`border-filete` en lo que
  pueda caer sobre papel o tinta; `px-gutter`, `max-w-pliego`. Los modales ya son de tinta y nombran su diálogo con su primer
  h1–h3; el contenido viejo se lee por el espejo del remapeo, pero cada lote debe restilizarlo.
- **L6.** `(auth)` y `(legal)` son míos: las páginas legales tienen cabecera y pie nuevos, pero conservan su envoltura con
  `min-h-screen` y degradado viejo y su enlace «Back» (en inglés fijo; `e2e/legal.spec.ts` lo busca: coordinar con F1-C).
  `InstallPWA` (morado, `z-50`) sigue igual.
- **Integrador.** El gate de §5.3 (`grep` = 0) incluye `lime-400` si quieren quitar también ese `oklch` (1 uso). `BITACORA.md`
  no está en mis archivos: queda para la Fase 4.

### Decisiones

- **Colores de contexto por suelo** (`letra*`, `suelo`, `filete` en `@theme inline` sobre variables de `.suelo-*`): una sola
  primitiva sirve en papel y en tinta. `inline` es necesario: con `@theme` normal la variable se resolvería en `:root`.
- **Espejo del remapeo en tinta**: la tabla de §5.3 está tal cual en `:root`; dentro de `.suelo-tinta` va su reflejo (slate
  950→tinta … 100→papel; rosas 950–700 #3A0F25, 600–500 rosa, 400–100 rosa-luz; rojos #FF8A80; verdes #7BD88F; azules niebla)
  y `.suelo-tinta .suelo-papel` vuelve a la tabla. Sin esto, todo modal viejo (que ahora es de tinta) sería tinta sobre tinta.
- La tabla de §5.3 tiene **una pareja bajo AA**: `text-slate-500` sobre `bg-slate-900` = 4.22 (#6B6761 sobre #E2DFD9). Está
  en el test como excepción documentada; no cambié la tabla.
- Variables de next/font con prefijo `--fuente-*` (no `--font-*`, que es el espacio de nombres de Tailwind).
- Gloock, Newsreader y Martian Mono se precargan (default de next/font); **Water Brush no** (`preload: false`): su archivo
  latino pesa 65 KB y sólo lo usan unas escenas, no debe competir con el LCP en todas las pantallas. La palabra a pincel es
  decorativa y su alto lo fija el `line-height`, así que el cambio de fuente no mueve nada.
- Cabecera de dos filas (la hora en su propia fila en todos los anchos) porque la navegación de la app no cabe junto a la
  hora larga en una fila: a 1024 la fila mide 64 px y no desborda; total 95 px (90 px en < 1024).
- El menú móvil empieza en < 1024 (no < 720): entre 720 y 1023 la navegación tampoco cabe. El menú de usuario desplegable
  sólo existe ≥ 1024; abajo todo está en el menú móvil.
- Un solo enlace «Iniciar sesión» en todos los anchos (estilo responsivo), para no duplicar enlaces en el DOM (Playwright
  en modo estricto y jsdom no ven CSS).
- `Modal` sin portal (consumidores y tests siguen encontrando el diálogo donde estaba); el menú móvil sí va en portal porque
  necesita salir del contexto de apilamiento de la cabecera y volver `inert` lo de atrás.
- `Footer` sin `"use client"` (menos JS; `useTranslations` funciona en servidor).
- La red de reduced-motion apaga animaciones CSS pero no transiciones (el fundido corto de la carta es parte del concepto).

### Pendientes

- La cabecera **con sesión** sólo la verifiqué con un arnés temporal (página con `SessionProvider` y sesión simulada, en
  `next dev`, borrada y sin commit): no se puede iniciar sesión contra producción y la base local es de F1-C. Falta el pase
  e2e con sesión real.
- Los textos existentes en español sin acentos («Creditos», «Iniciar sesion», «Carta del Dia», «Coleccion», «Configuracion»)
  ahora se ven más (mono en mayúsculas, Gloock grande en el menú). La regla append-only no me deja corregirlos; es un cambio
  de texto que conviene hacer en la integración con el visto bueno de Memo.
- El `aria-label` del selector de idioma sigue en inglés (ver handoff F1-C).
- `tinta.css` (ver handoff).

### Deuda de §5.3 que queda en archivos ajenos

- `text-slate-900/950` (11, sobre ámbar → ahora sobre rosa): `src/app/(main)/collection/page.tsx:192, :274`,
  `src/app/(main)/compatibility/page.tsx:23`, `src/app/(main)/compatibility/[id]/page.tsx:19`,
  `src/components/calendar/DayDetail.tsx:117`, `src/components/dashboard/TodayEnergiesWidget.tsx:67`,
  `src/components/energies/TodayEnergies.tsx:78`, `src/components/golden/GoldenCardModal.tsx:192`,
  `src/components/manual/CardPicker.tsx:213`, `src/components/ui/TarotCard.tsx:142, :280`.
- `text-white` (23): `src/app/(main)/cards/page.tsx:95, :169`; `src/app/(main)/challenges/page.tsx:101, :111`;
  `src/app/(main)/collection/page.tsx:193, :266`; `src/app/(main)/credits/page.tsx:134`;
  `src/app/(main)/referral/page.tsx:97, :103, :109`; `src/app/page.tsx:278`; `src/components/golden/GoldenCardModal.tsx:155`;
  `src/components/landing/Testimonials.tsx:46`; `src/components/levels/LevelUpModal.tsx:92`;
  `src/components/reading/NewCardDiscoveredModal.tsx:160, :231`; `src/components/reading/ReadAloud.tsx:216`;
  `src/components/ui/InstallPWA.tsx:97, :108, :118, :124`; `src/components/ui/TarotCard.tsx:152, :290`.
- `prose*` (a borrar, no hay plugin): `src/app/(legal)/{about,privacy,terms}/page.tsx`, `src/app/(main)/blog/[slug]/page.tsx`,
  `src/app/(main)/daily/page.tsx`, `src/app/(main)/reading/new/[spreadTypeId]/page.tsx`, `src/app/(main)/reading/[id]/page.tsx`,
  `src/app/share/[shareId]/page.tsx`.
- Clases de las 17 familias: **1,783** coincidencias en `src` fuera de tests (0 en mis archivos). Las más cargadas:
  `src/app/page.tsx` 66, `components/manual/ManualReadingFlow.tsx` 44, `reading/new/[spreadTypeId]/page.tsx` 42,
  `dashboard/page.tsx` 38, `components/calendar/DayDetail.tsx` 32, `collection/page.tsx` 32, `profile/setup/page.tsx` 29,
  `components/ui/CardPlaceholder.tsx` 28, `credits/page.tsx` 27, `reading/new/page.tsx` 26.
- Fuera de la tabla: `lime-400` (1 uso).

### Comandos y resultados

Todos corridos en `C:/Users/guill/dev/arcana-lotes/f1-A` sobre el último commit del lote.

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | 0 errores |
| `npm run lint` | 0 errores, 17 avisos (todos previos y en archivos ajenos: `ShareButton`, `AchievementUnlockedModal`, `challenges.ts`, `next-auth.d.ts`, páginas de `cards`, `collection`, `profile/setup`, `referral`, `settings`) |
| `npm test` (`check-messages` + `jest`) | `check-messages: ok (1011 keys)` · **90 suites / 1,182 pruebas, todo verde** (base: 88 / 1,129). Jest avisa «A worker process has failed to exit gracefully»: **ya pasa en la base** (copia de `969bf7b` con el mismo `node_modules`: 88 / 1,129 y el mismo aviso); no lo introduce este lote |
| `npx jest <mis 4 suites> --detectOpenHandles` | 64 pruebas, sin handles abiertos |
| `npm run build` (desde `.next` limpio) | OK. 78 rutas ƒ (dinámicas) + `/sitemap.xml` estático; ninguna página con cabecera se prerenderiza, así que la hora del HTML siempre es la del día |
| CSS compilado | `--color-slate-900:#e2dfd9` en `:root`, `#1a1917` en `.suelo-tinta`, `#e2dfd9` en `.suelo-tinta .suelo-papel`; `--color-purple-500:#e4007c`; única variable de paleta en `oklch`: `lime-400` (fuera de la tabla); `@font-face` de Gloock, Newsreader (normal e itálica), Martian Mono y Water Brush; `.pincel-seco{filter:url(#pincel-seco)}` |
| `npx next start -p 3101` + puppeteer-core (Chrome) | `/`, `/login`, `/about` a 1440 y 390 en es (y 390 en en): **status 200, `scrollWidth − clientWidth = 0`**, ningún elemento fuera de pantalla sin recorte; cabecera 95 px (90 px en < 1024; `/login` 65/90). Menú móvil a 390: abre, Tab 30 veces sin salir, Esc lo cierra, el foco vuelve al botón, lo de atrás `inert`, sin scroll horizontal dentro. Consola: sólo el 500 de `/api/auth/session` (`UntrustedHost`, ver handoff F1-C). `h1`: 1 en `/`, 0 en `/login` y `/about` (L6). Fuentes cargadas: Gloock, Newsreader normal/itálica, Martian Mono. Servidor apagado al terminar |
| Arnés temporal con sesión simulada (`next dev`, borrado, sin commit) | Cabecera con sesión en 1440, 1280, 1024, 820, 390, 360 (es) y 1024, 390 (en): sin desborde de la fila, sin scroll horizontal, ningún botón o enlace de la cabecera bajo 44 px; menú de usuario, menú móvil con las 15 rutas, modal sobre tinta con contenido viejo legible (espejo del remapeo), foco inicial en el primer botón y de regreso al disparador con Esc; la hora corta cabe en 360 (328/328 px) |

Capturas (fuera del repo): `C:/Users/guill/AppData/Local/Temp/claude/C--Users-guill-dev-arcana/ba3d8826-c8e4-418f-8b14-19f131c84e14/scratchpad/{capturas,capturas-en,arnes}/`.

Commits del lote (base `969bf7b`): `7879d5b` tokens y remapeo · `874f43e` fuentes, filtro, viewport, manifest · `1bd0e49`
componentes de tinta · `ae39efb` primitivas · `f3dec85` cabecera, menú móvil y pie · `35071a4` layouts · `61ef46a`
animaciones · `68c5dfc` contraste · `24197f5` test SSR · `a797854` hora en auth y menú de invitados · `56de525` hora corta en
360 · (este parte).

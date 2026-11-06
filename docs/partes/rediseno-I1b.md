## Parte I1b · Correcciones de la revisión de Fable a la Fase 1 (rediseño «Dos tintas»)

Árbol principal `C:/Users/guill/dev/arcana`, rama `rediseno/dos-tintas`, base `84224fd`. 6 nov 2026, de 00:25 a 03:50
(hora de CDMX). Sin `git push`. Ninguna base tocada salvo `arcana_e2e` del clúster local (`127.0.0.1:54329`, siempre
vía `scripts/e2e-db.mjs`). Jest corrió con `DATABASE_URL`/`DIRECT_URL` muertas en la línea. Los seis lotes de la
Fase 2 (`arcana-lotes/f2-L1…L6`) no se tocaron.

| Commit | Qué |
|---|---|
| `6a30e3b` | red de desbordes estricta (`e2e/helpers/responsivo.ts`) |
| `643eaf1` | acentos, eñes y ¿ ¡ en `messages/es.json` + specs que aceptan ambas formas + `docs/partes/acentos-es.md` |
| `ee0fc20` | las dos specs del menú móvil apuntan a la cabecera nueva |
| `143d449` | `e2e/red-desbordes.spec.ts`: la regla de la red sobre una página fija |
| `46bd861` | `cargar()` fuerza el primer pintado (falso rojo del Chromium sin cabeza) |
| `6eff62b` | `HoraDelDia` corta declara su elipsis con `data-recorta` (lo destapó la red) |
| `23a0a55` | el pase sin JS mide cuando las fuentes ya cargaron |
| este | el parte |

`99fb06e` (`fix(ui): buttonClasses in a module without "use client"…`, 03:09) **no es mío**: otra sesión lo commiteó en
esta rama mientras yo trabajaba. Las corridas finales (§5) ya lo incluyen.

### 1 · Regla nueva de la red de desbordes

`medirMaqueta()` (`e2e/helpers/responsivo.ts`, documentada en su comentario) reporta todo elemento que se sale de la
vista salvo que un ancestro debajo de `<body>` lo excuse:

- **`overflow-x: auto | scroll`** (un scroller; ojo: `overflow-y: auto` computa `overflow-x` a `auto`): **siempre** excusa.
- **`overflow-x: hidden | clip`**: excusa **sólo** si el elemento es **decorativo** (`el.closest('[aria-hidden="true"]')`
  o `img[alt=""]`) **o** si ese ancestro opta con el atributo **`data-recorta`** (marquesina, carrusel, línea con puntos
  suspensivos a propósito). Si no, el elemento se reporta con la caja que lo cortó:
  `h2#titulo [0→520 de 360] «…» (recortado por section#escena.escena [0→360 de 360])`.
- Ancestro no renderizado (display none, visibility hidden, recorte `sr-only`) o ya reportado: excusa (un reporte por desborde).

Antes, cualquier `hidden|clip` excusaba todo, y `Escena` es `overflow-clip`: un título cortado dentro de una escena pasaba.
`e2e/red-desbordes.spec.ts` fija la regla sobre una página de prueba (`setContent`, 360 px): un `h2` en una caja
`overflow: clip` y un botón en una tarjeta `overflow: hidden` se reportan; decoración `aria-hidden`, `img alt=""`, caja con
`data-recorta` y tabla en scroller no. Comprobado que **falla con la regla vieja** (parche temporal, revertido).

**Qué destapó.**

1. **La hora corta de la cabecera (`HoraDelDia variante="corta"`, Fase 1) → arreglado en `6eff62b`.** En la corrida
   completa, sin JS a 390 en `/register` y `/blog/[slug]`: `span «· 2 Tochtli · Xiuhtecuhtli · Luna 12%» (recortado por
   p.font-dato.uppercase.truncate)`. Esa medición cayó a media carga de fuentes (con Martian Mono cargada, hoy cabe
   justo: 328 de 328 px a 360). Pero el problema de fondo es real y depende del día: la línea corta es `truncate` a
   propósito (la maqueta aprobada pone `.hora` con `nowrap` + `ellipsis` en móvil) y **no cabe entera a 360 en 186 de
   los 366 días** a partir de hoy (a 390, en 40); la más larga es «14 mar · 13 Cozcacuauhtli · Piltzintecuhtli · Luna
   42%» (400 px de texto en una caja de 328). La red estricta habría fallado según la fecha. Como la elipsis es el diseño
   aprobado y la línea larga completa vive en el menú móvil (y el lector de pantalla lee todo), el `<p>` de la corta
   lleva ahora `data-recorta`. Comprobado en vivo con el texto de ese día en la cabecera a 360: con el atributo, 0
   reportes; quitándolo, 1. **Si Memo o Fable prefieren que la línea se parta en dos en vez de cortar, es otro cambio
   (de diseño).**
2. **El pase sin JS medía a media carga de fuentes → `23a0a55`.** `maqueta` espera `document.fonts.ready` (en
   `cargar()`); `sin JS` medía justo después de `load`, a veces con la cara de respaldo de Martian Mono, más ancha.
   Ahora espera lo mismo antes de medir.
3. **Nada más.** Corrida `ARCANA_E2E_REUSE=1 ARCANA_E2E_DEFECTOS=0 npx playwright test e2e/responsivo.spec.ts` (49 rutas ×
   5 anchos + `@en` a 390 + WebKit 390; 31.8 min con los seis lotes corriendo a la vez): **837 ✓ · 89 ✘** y ningún
   «recortado por». Las páginas de la Fase 2 todavía no usan `Escena` ni tarjetas que corten texto; la red queda lista
   para cuando las adopten.

Las 89 fallas de esa corrida, todas conocidas:

| Grupo | Fallas | Lote | `DEFECTOS` |
|---|---|---|---|
| sin `h1`: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/about`, `/privacy`, `/terms` (6 proyectos + `@en`) | 49 | L6 | ya estaban |
| dos `h1` en `/blog/[slug]` | 7 | L6 | ya estaba |
| `/subscribe/success` sin `h1` | 6 | L6 | ya estaba |
| `/progress` 404 en consola (`/dashboard`, `/dashboard (vacío)`) | 11 | L3 | ya estaba (filtro de consola) |
| `/share/[shareId]` (maqueta y sin JS), `/reading/[id]`, `/reading/new (vacío)` a 390/360 | 13 | L2 | ya estaban |
| `portada /` · movimiento reducido (1440, 820, 360): «float … running» | 3 | — | **falso rojo del arnés**, arreglado (abajo) |

**Filas de `DEFECTOS` agregadas: ninguna. Borradas: ninguna** (las 14 rutas siguen fallando igual que en I1). Lo único
que cayó en archivos de la Fase 1 fue la hora corta, y se arregló.

**El falso rojo de la portada (`46bd861`).** Reproducible: 2 de 8 pasaban (`--repeat-each=4` a 1440 y 1024). Las tres
animaciones `float` tenían ya `duration 0.01ms` e `iterations 1` (la red de reduced-motion de `globals.css` sí aplica),
pero seguían «pending» con `document.timeline.currentTime = 0`: la página **nunca se pintó** (sin entrada `first-paint`,
sin `requestAnimationFrame`). Pasa con la primera página de un Chromium recién lanzado en esta máquina cargada, **con
cualquier ruta y hasta con un `setContent('<p>hola</p>')`**; no es de la app ni del reduced-motion. Sólo se notaba en la
portada porque es la única ruta con animaciones CSS y le tocaba al worker recién arrancado (Playwright reinicia el
worker tras una falla; por eso caía a 1440, 820 y 360). `cargar()` ahora toma una captura cuando no hay entrada de
pintado, lo que fuerza el primer cuadro: **8 de 8**. También protege la carga perezosa por `IntersectionObserver` de
`recorrer()`, que sin cuadros nunca dispara.

### 2 · Las dos specs del menú móvil (`ee0fc20`)

| Spec | Antes | Ahora |
|---|---|---|
| `smoke.spec.ts` «mobile viewport shows hamburger menu» | `nav.hidden.md\:flex` (ya no existe: `toBeHidden` pasaba solo) y `[aria-label*="menu"], button:has(svg)` o cualquier `navigation` visible | `header nav[aria-label]` con `toHaveCount(1)` y `toBeHidden()` a 375; `header button[aria-controls="menu-movil"]` visible y `aria-expanded="false"` |
| `home.spec.ts` «should show mobile menu on small screens» | `[aria-label*="menu"]` (no casa con «menú») dentro de un `if (visible)`: nunca entraba | el botón debe estar visible; el clic (con reintento hasta la hidratación) abre `#menu-movil`, y **dentro del menú** está el enlace «Iniciar sesión» |

Comprobado con un parche temporal que quita todo `<header>` de la página (`addInitScript` + `MutationObserver`, revertido):
**las nuevas fallan las dos** (`toBeVisible` del botón, `toHaveCount(1)` de la nav) y **las viejas pasaban las dos**.
Con la cabecera: 2 ✓.

### 3 · Acentos en `messages/es.json` (`643eaf1`)

- **259 de 1,019 valores** corregidos. Lista completa antes → después y criterio en **`docs/partes/acentos-es.md`**.
- Tres pasos con un script (en el scratchpad de la sesión): (1) palabras que en todo el archivo sólo pueden ir con acento
  o ñ, revisadas a mano sobre la lista de las 991 palabras sin acento del archivo (`Carta del Día`, `Colección`,
  `Desafíos`, `Oráculo`, `sesión`, `créditos`, `Contraseña`, `Credenciales inválidas`, `Posición`, `interpretación`,
  `más`, `aún`, …); (2) palabras de contexto sólo en llaves revisadas: «está» 4, «estás» 3, «cómo» 7, «tú» 2, «qué» 8;
  (3) `¿`/`¡` de apertura (`¿Olvidaste tu contraseña?`, `¡Logro Desbloqueado!`, `Aún no hay artículos publicados.
  ¡Vuelve pronto!`).
- Se dejaron a propósito: «solo» (sin tilde, RAE), «Cuanto más clara…», «donde»/«quien» relativos, «como» comparativo,
  «Formula tu pregunta» (verbo), «si» condicional, «mi» posesivo, «Que este año te traiga…», «Re Pág / Av Pág».
- Llaves, inglés, placeholders y sintaxis ICU intactos: cada valor cambiado se volvió a parsear con `intl-messageformat`
  y conserva los mismos argumentos y selectores (`{dia}`, `{posicion}`, `{diaSemana, select, …}` sin tocar);
  `check-messages: ok (1019 keys in en and es)`.
- **Specs e2e que aceptan ambas formas** (para no chocar con los lotes): `auth` (`iniciar sesi[oó]n` ×3,
  `credenciales inv[aá]lidas`, `t[eé]rminos`), `home` (`iniciar sesi[oó]n` ×3, `c[oó]mo funciona`), `legal`
  (`misi[oó]n`, `c[oó]mo funciona`, `t[eé]rminos` ×2, `aceptaci[oó]n`, `descripci[oó]n`, `cr[eé]ditos`,
  `informaci[oó]n`), `reading` (`cr[eé]dito(s)` ×3, `intenci[oó]n`, `interpretaci[oó]n`), `smoke`
  (`/invalid|inválido|…/` → `/invalid|inv[aá]lid[oa]s?|…/`: «inválido» no casa con «Credenciales inválidas» y el
  aviso de error ya no se habría encontrado). `flujos/registro.spec.ts` ya aceptaba ambas (`cerrar sesi[oó]n`, `men[uú]`).
- Tests unitarios: ninguno buscaba el texto sin acento; `npm test` verde sin tocar ninguno.

### 4 · Para los lotes, la Fase 3 y Fable

- **Todos los lotes**: con la red nueva, un título o botón que se salga de una `Escena` o de una tarjeta con
  `overflow-hidden` **falla** la maqueta. Decoración que se recorta: `aria-hidden="true"`; una caja que corta a propósito
  (marquesina del tonalli de L1, carrusel, línea con puntos suspensivos): `data-recorta` en la caja que corta.
- **Lotes y Fase 3 · `messages/es.json`**: cambiaron 259 valores existentes. Los lotes sólo agregan llaves de su
  namespace, pero un agregado pegado a una línea cambiada puede chocar al fundir: quedarse con el valor acentuado. Textos
  nuevos de los lotes, ya con acentos; sus specs, con regex que acepten ambas formas (`/sesi[oó]n/`).
- **Arnés**: el falso rojo del primer pintado puede aparecer en specs que no pasan por `cargar()` y dependen de
  `requestAnimationFrame` o de animaciones en la primera página de su worker. Si aparece, una captura lo resuelve.
- **Servidor huérfano**: al empezar, `:3000` estaba ocupado por un `node scripts/e2e-db.mjs dev` (`next dev -p 3000` del
  árbol principal) lanzado a las 00:21 por un comando que pretendía detenerlo al final y no lo logró (su sesión ya no
  existía). Lo detuve (`taskkill /T` del árbol 20964 → 52892 → 19732): era de este árbol y bloqueaba el puerto que me
  toca. `tsconfig.json` quedó sin cambios.
- **Clúster no detenido**: los seis lotes tienen sus bases `arcana_e2e_l1…l6` en el clúster; durante la sesión tuvieron
  sus `e2e-db serve` vivos (L6 en `:3016`) y a las 03:47 acababan de cerrar sus partes (L2 commiteó a las 03:46). Por eso
  **no** corrí `node scripts/e2e-db.mjs stop`: el clúster queda arriba. Detenerlo cuando todos hayan terminado.
- `BITACORA.md` no se tocó (la cierra Fable en la Fase 4 con los partes, como en I1).

### 5 · Comandos y resultados

Todo en el árbol principal, en serie salvo donde se dice, con los seis lotes usando la máquina a la vez.

| Comando | Resultado |
|---|---|
| `python acentos.py --write` + validación con `intl-messageformat` | 259 valores; 0 problemas de argumentos/selectores ICU; `check-messages: ok (1019 keys in en and es)` |
| `npx tsc --noEmit` (árbol final, `23a0a55`) | 0 errores (16 s) |
| `npm run lint` (árbol final) | **0 errores**, 16 avisos (los mismos 16 previos de I1, fuera de la Fase 1) |
| `DATABASE_URL=postgresql://nadie@127.0.0.1:1/ninguna DIRECT_URL=… npm test` (árbol final) | `check-messages: ok (1019 keys)` · **99 suites / 1,367 pruebas, todo verde** (27 s). Sigue el aviso previo «A worker process has failed to exit gracefully» |
| `ARCANA_E2E_REUSE=1 npx playwright test e2e/home.spec.ts e2e/smoke.spec.ts -g "…menu…"` | 2 ✓; con la cabecera quitada: nuevas 2 ✘, viejas 2 ✓ |
| `ARCANA_E2E_REUSE=1 npx playwright test e2e/red-desbordes.spec.ts` | 1 ✓; con la regla vieja (parche temporal) 1 ✘ |
| `ARCANA_E2E_REUSE=1 ARCANA_E2E_DEFECTOS=0 npx playwright test e2e/responsivo.spec.ts` (lo mismo que `npm run test:e2e:responsivo`, contra mi `e2e-db serve` en `:3000` con `arcana_e2e`) | **837 ✓ · 89 ✘** (31.8 min); las 89 en §1 |
| portada · movimiento reducido, `--repeat-each=4` a 1440 y 1024 | antes de `46bd861`: 2 de 8; después: **8 de 8** |
| `npm run test:e2e` desde cero sobre `46bd861` (arranca, resetea y siembra, `next build`, `next start :3000`) | 941 ✓ · **3 ✘** · 77 omitidas (22.9 min): las dos de la hora corta sin JS (→ `6eff62b`, `23a0a55`) y `flujos/mapa-arcano` (el clic en «Generar mi síntesis» no mostró la síntesis en 30 s con la máquina saturada; pasa en la corrida final) |
| **`npm run test:e2e` desde cero sobre `23a0a55`** (incluye `99fb06e`) | **944 ✓ · 0 ✘ · 0 inestables · 77 omitidas** (75 `fixme` de `DEFECTOS` + Google apagado + email inválido en `smoke`). 15.1 min de pruebas, 15 min 33 s con el arranque |
| `node scripts/e2e-db.mjs stop` | **no se corrió**: el clúster lo usan los lotes (§4). `:3000` quedó libre |

`npm run test:e2e` final por spec y ancho:

| Spec | 1440 | 1024 | 820 | 390 | 360 | WebKit 390 |
|---|---|---|---|---|---|---|
| `auth` · `home` · `legal` · `reading` · `smoke` | 17 (+1 skip) · 12 · 17 · 13 · 20 (+1 skip) ✓ | — | — | — | — | — |
| `red-desbordes` (nuevo) | 1 ✓ | — | — | — | — | — |
| `flujos/*` | 13 ✓ | — | — | — | — | — |
| `responsivo` | 145 ✓ · 9 | 145 ✓ · 9 | 145 ✓ · 9 | 221 ✓ · 25 (incl. `@en`) | 141 ✓ · 13 | 54 ✓ · 10 |

Commits de I1b: `6a30e3b`, `643eaf1`, `ee0fc20`, `143d449`, `46bd861`, `6eff62b`, `23a0a55` · este parte.

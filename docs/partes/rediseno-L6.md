## Parte L6 · Cuenta, dinero y textos (rediseño «Dos tintas», Fase 2)

Worktree `C:/Users/guill/dev/arcana-lotes/f2-L6`, rama `rediseno/f2-L6`, base `rediseno/dos-tintas` (`84224fd`). Fusionada con la
base tres veces: `6a30e3b` (red de desbordes estricta, al empezar), `643eaf1`+`ee0fc20` (acentos y specs del menú, `05f9d65`) y
`143d449`+`46bd861`+`99fb06e` (`buttonClasses` sin `"use client"`, `f3067fd`). 6 nov 2026. Sin `git push`. Base sólo la local
`arcana_e2e_l6` (127.0.0.1:54329, puerto web 3016) vía `scripts/e2e-db.mjs` (`dev` y `serve`); nunca `npm run dev`, `db push` a
mano, seeds a mano ni `e2e-db.mjs stop`. El clúster quedó arriba; mis `next dev`/`next start` quedaron apagados (:3016 libre).

### Hecho (por ficha, con su commit)

| Ficha | Commit | Qué |
|---|---|---|
| Llaves nuevas | `0ca77d0` | 26 llaves append-only en `auth`, `credits`, `subscribe`, `settings`, `referral`, `blog`, `legal` (mismas en es/en). Pasan a `messages` los textos que estaban fijos en inglés (enlace no válido, «Something went wrong», «Cancels at period end», «Edit profile», «Secure payments…», «Back»); el inglés queda igual que antes. Tras la fusión de acentos se reaplicaron con el mismo script (diff contra la base: sólo líneas nuevas y comas) |
| (a) Cuenta | `a52f2fd` | `/login`, `/register`, `/forgot-password`, `/reset-password` sobre un `Pliego` común (`src/app/(auth)/pliego.tsx`): filete de tinta y la hoja de abajo asomada, `Etiqueta`, **un `h1` real** que nombra la sección (fuera del `Suspense`: existe también en el esqueleto), bajada en grafito, `Input` con `id` explícito y `autoComplete`, aviso de error semántico (`role="alert"`, rojo de error del suelo), botón primario, Google sólo con `NEXT_PUBLIC_GOOGLE_ENABLED`. Desde 1024 px un grabado en tinta asomado detrás del pliego (El Mago, El Loco, El Ermitaño, La Estrella; `alt=""`, `multiply`, `loading="lazy"`). Misma lógica de `signIn`, registro, recuperar y restablecer |
| (b) Dinero | `b83bf20`, `2d2023f` | `/credits`: saldo en mono entre filetes, costos por tirada como `<dl>` con filetes («1 crédito / 2 créditos» con plural ICU), tres láminas con la cifra y el precio MXN en mono; **el popular lleva sello rosa** (`bg-rosa-luz` + `text-tinta`, 5.51:1), filete rosa y `data-popular`; cada «Comprar» nombra su paquete. `/subscribe`: lámina del plan (lo que incluye con filetes numerados, precio en mono), pliego para suscribirse, opción con créditos; la vista «ya suscrito» muestra también la lámina y abre el portal con `<a>` (ruta de API). `credits/success` y `subscribe/success`: pliego con **un `h1` en todos los estados** (verificando, error sin `session_id`, éxito); sin el confeti de colores |
| (c) Ajustes y referidos | `e8a2217` | `/settings`: datos como `<dl>` con filetes, zona de peligro en el rojo de error, modal (sobre tinta) con su `h2` e `Input id="settings-delete-confirm"`. `/referral`: pasos numerados en mono, cifras en mono, **el código en mono grande**, el enlace en un campo de sólo lectura con `<label>`, «Copiar» anunciado en `role="status"`; WhatsApp/Twitter sin verdes ni azules |
| (d) Blog | `5dabb54`, `6540d20` | Índice editorial: número de entrada y fecha en mono, el título como enlace estirado a toda la fila (nombre accesible = título), grabado en tinta por post fijo por slug. Artículo: volver, etiqueta, **un `h1`**, el extracto como bajada en itálica con filete rosa, cuerpo en Newsreader a ~66 ch con estilos propios (sin `prose*`). `contenido.tsx`: el `# ` del Markdown **baja a `h2`** (y se omite si repite el título), `- `/`1. ` seguidos forman `<ul>`/`<ol>` reales, `**negritas**` en línea. El CTA usa `buttonClasses()` desde el servidor |
| (e) Legales | `710364d` | `about`, `privacy`, `terms` sobre `Documento` (`src/app/(legal)/documento.tsx`): «Volver al inicio» traducido, etiqueta (o «Última actualización»), **`h1`**, intro, apartados con filete, `§ 01` en mono y texto a ~66 ch; el aviso legal con filete rosa en lugar de ámbar. Sin el envoltorio de degradado ni `prose` |
| (f) 404 y error | `32fce59`, `6540d20` | 404 «carta perdida»: cabecera y pie, el hueco punteado donde iba la carta y el `ReversoCarta` salido del mazo (`aria-hidden`), «404» en `Etiqueta`, el mensaje como **único `h1`**, enlace a inicio con `buttonClasses()`. `error.tsx`: suelo de tinta, letra papel, dos reversos cruzados, «Intentar de nuevo» (`reset`) e «Ir al inicio» |
| (g) PWA | `d22d24b` | `InstallPWA` como banda de tinta **`sticky bottom-0`** (no `fixed`): último hijo del `body`, al final de la página ocupa su lugar y no tapa contenido en móvil; `<aside>` nombrado, botones de 44 px, `animate-entra` (fill `both`) sólo con movimiento. Misma lógica `beforeinstallprompt`/`sessionStorage` |
| e2e | `e8233ba`, `ae3125c` | Fuera de `DEFECTOS` las 9 filas de L6. `legal.spec.ts`: el título de términos ahora es `h1` y «volver» acepta `/volver\|back/i`. Dos arreglos de arnés que mi `h1` destapó (ver Decisiones) |
| Fusiones | `05f9d65`, `f3067fd` | Conflictos en `messages/es.json` (versión con acentos + mis llaves reaplicadas) y `legal.spec.ts` (sus regex con acento + mis dos cambios). `f3067fd` sin conflictos |

Pruebas unitarias nuevas (4 suites, 50 pruebas): `src/__tests__/app/l6-auth.test.tsx` (15), `l6-cuenta.test.tsx` (16),
`l6-textos.test.tsx` (15), `src/__tests__/components/InstallPWA.test.tsx` (4). Prueban lo que sólo el código correcto produce: un
`h1` por pantalla y por estado (también `/credits/success` y `/subscribe/success` sin `session_id`), el `# ` del Markdown rebajado a
`h2` y omitido si repite el título, listas reales y negritas, el paquete popular con su sello y sólo él, precios en mono y en MXN,
el plan sin repetir su nombre bajo el `h1`, el 404 con cabecera, pie y enlace a inicio, `error.tsx` en tinta con `reset`, campos con
`id` explícito, avisos `role=alert`, copiar anunciado en `role=status`, `InstallPWA` sticky (no fixed), y 0 clases de la paleta
vieja/`text-white`/`prose` en el HTML renderizado.

### Falso o ya hecho

- «`credits/success` sin `session_id` sin `h1`»: ya tenía `h1` en el estado de error; faltaba en carga (ahora «Verificando tu pago…»).
- `(auth)/layout.tsx` y `(legal)/layout.tsx` no se tocaron (F1-A). El layout legal no da márgenes: `Documento` trae `max-w-pliego` y `px-gutter`.
- `InstallPWA` usaba `animate-in slide-in-from-bottom-4`, clases de un plugin que no existe: no animaban nada.
- `grep` de `slate|purple|…|lime-NNN`, `text-white`, `prose` e `imageUrl` en mis 25 archivos: **0**.

### Handoffs

- **Resuelto en la base (`99fb06e`)**: `buttonClasses()` en un módulo `"use client"` daba 500 al llamarlo desde un componente de servidor
  (lo vi en `/blog/[slug]` y el 404 con el navegador). Lo había rodeado con un `EnlaceBoton` cliente; tras la fusión lo quité (`6540d20`) y
  las dos páginas llaman a `buttonClasses()` directo. Comprobado en navegador contra el build final: 200 y el enlace con su aspecto.
- **Integrador · `messages`**: los acentos del otro agente ya llegaron; si quedara algún valor de mis namespaces sin acento, no lo toqué (regla de valores ajenos).
- **Sin dueño · `src/app/api/auth/register`**: sigue aceptando un email sin `@` (`smoke.spec.ts`, `fixme`).
- **Sin dueño · Jest**: sigue el aviso «A worker process has failed to exit gracefully» (previo; probable `setInterval` de `src/lib/rate-limit.ts`).

### Decisiones

- **`?method=credits` en `/subscribe/success`** (presentación, no cobro): `/subscribe` manda ahí tras pagar con créditos (`/api/subscribe/credits` ya cobró), pero la página buscaba un `session_id` de Stripe y mostraba «No se encontró sesión» a quien acababa de suscribirse. Ahora, con `method=credits`, muestra la bienvenida y el sello «Pagado con créditos» sin llamar a Stripe; sin `session_id` ni `method`, el error de siempre. Si Fable prefiere no tocarlo, es la variable `conCreditos`. El flujo e2e `carta-del-dia` (que pasa por ahí) sigue verde.
- **«Monto pagado: … MXN»** en `credits/success`: decía «USD», pero el checkout cobra en `mxn` (`api/stripe/checkout/route.ts:45`). Cambió la etiqueta, no el cálculo.
- **Descripción de los paquetes** en español con `descriptionEs` (antes salía `description`, en inglés, en las dos lenguas).
- **`/login`**: «¿Olvidaste tu contraseña?» quedó debajo del campo de contraseña, antes del botón (orden de Tab: correo, contraseña, olvidé, entrar).
- **`/subscribe` (alta)**: el `h1` ya dice «Oráculo Diario», así que el `h2` de la lámina es «Incluye» (etiqueta en mono como `h2`); en «ya suscrito» el `h2` es el nombre del plan.
- **Blog**: el `# ` inicial que repite el título se omite; cualquier otro `# ` baja a `h2`. Grabados de adorno sólo de Arcanos Mayores amables (fuera el Colgado, la Muerte, el Diablo, la Torre y el Juicio: junto a una guía se leerían como mensaje); FNV-1a para que los tres posts del seed no repitan lámina.
- **404 con cabecera y pie** (`app/not-found.tsx` se renderiza sólo bajo el layout raíz). **`error.tsx` sin cabecera** a propósito: si el error viene de ella, no debe volver a romperse ahí; lleva la marca como enlace a inicio.
- **`InstallPWA` sticky en vez de fixed**: no tapa contenido de forma permanente sin medir alturas ni tocar el `padding` del `body`. Se quitó la «×» que duplicaba «Después» (mismo manejador; dos botones con el mismo nombre).
- **Arnés e2e** (misma intención, aserción más precisa): (1) `responsivo.spec.ts` buscaba el `h1` con `/- heading .*\[level=1\]/`, pero el snapshot ARIA en YAML pone la línea entre comillas cuando el nombre trae «:» (`- 'heading "Guía para principiantes: Cómo…" [level=1]'`); ahora `/- '?heading …/`. Lo escondía el `fixme` de «dos h1». (2) `flujos/registro.spec.ts` esperaba `toHaveURL(/\/history/)` tras iniciar sesión, pero la URL inicial `/login?callbackUrl=/history` ya casa; antes lo salvaba que `/login` no tenía `h1` y la prueba esperaba al de `/history`. Ahora espera `pathname === "/history"`.

### PENDIENTES para Memo

- Ver en vivo la bienvenida tras pagar **con créditos** (antes decía «No se encontró sesión») y decidir si se queda así.
- El blog lleva un grabado de adorno por artículo (el mismo en el índice y en la página) y las pantallas de cuenta uno asomado detrás del formulario en escritorio. Si prefiere sin grabados o elegir la carta de cada post, es un cambio chico.

### Comandos y resultados (sobre `2d2023f`, salvo donde se indica)

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | 0 errores |
| `npm run lint` | **0 errores**, 12 avisos, todos ajenos y previos (`prisma/*`, `scripts/generate-images.ts`, `cards`, `collection`, `profile/setup`, `AchievementUnlockedModal`, `lib/challenges.ts`, `types/next-auth.d.ts`). Eran 16: los 4 de `referral` y `settings` eran de L6 y ya no están |
| `DATABASE_URL=…nadie@127.0.0.1:1… npm test` | `check-messages: ok (1045 keys)` · **103 suites / 1,417 pruebas, todo verde** (aviso previo del worker de Jest) |
| `npm run build` | exit 0 · «Compiled with warnings» (sólo el aviso previo de `jose` en el Edge Runtime y los de lint ajenos) · 63 páginas; `/blog`, `/blog/[slug]`, `/login` ƒ |
| `node scripts/e2e-db.mjs serve` (reset + build en `.next-e2e` + `next start -p 3016`) | base `arcana_e2e_l6` sembrada, «Compiled successfully», listo |
| `ARCANA_E2E_REUSE=1 ARCANA_E2E_DEFECTOS=0 npx playwright test e2e/responsivo.spec.ts --grep "login\|register\|password\|credits\|subscribe\|settings\|referral\|blog\|about\|privacy\|terms\|carta-no-existe\|404"` | **362 pasan, 0 fallan** (5.0 min): 1440, 1024, 820, 390 (+ `@en`), 360 y WebKit 390; maqueta, encabezados, movimiento reducido y sin JS. Se agregó `404` al grep: el título de esa prueba es «404», no la ruta |
| `ARCANA_E2E_REUSE=1 npx playwright test e2e/auth.spec.ts e2e/legal.spec.ts e2e/smoke.spec.ts e2e/flujos/registro.spec.ts e2e/flujos/carta-del-dia.spec.ts` | **59 pasan**, 2 omitidas (Google apagado; `fixme` del email sin `@`), 0 fallan |
| Historia de las corridas | 1ª red responsiva (antes de los arreglos de arnés): 355 ✓ · 7 ✘, todas «`/blog/[slug]` encabezados» por la regex del YAML. 2ª con `DEFECTOS=0`: 50 ✓ · 1 ✘ transitoria (`/blog/[slug]` maqueta a 360; no se reprodujo en 18 repeticiones a 360/390; la traza se perdió al limpiar `test-results`). Specs: 1 ✘ en `registro` por la carrera descrita, arreglada. Luego 362/362 dos veces (antes y después de la última fusión) y 59/59 |

### Capturas

`C:/Users/guill/AppData/Local/Temp/claude/C--Users-guill-dev-arcana/ba3d8826-c8e4-418f-8b14-19f131c84e14/scratchpad/fase2/L6/`
(página completa, Playwright contra el build final de `e2e-db.mjs serve` en :3016, `es-MX`, America/Mexico_City; script `capturas.mjs`
en la misma carpeta, que además mide `h1`, scroll horizontal, desbordes y objetivos < 44 px — todo en cero):
`login`, `registro`, `olvido`, `restablecer` (sin token), `restablecer-token`, `credits`, `credits-success`, `subscribe` (con historia:
ya suscrito), `subscribe-nuevo` (sin suscripción ni perfil), `subscribe-success`, `subscribe-success-creditos`, `settings`, `referral`,
`blog`, `articulo`, `about`, `privacy`, `terms` y `404`, cada una en `-1440`, `-390` y `-360`; `login` y `registro` también en
`-1024` y `-820` (éstas contra `next dev` de `e2e-db.mjs dev`, antes de la última fusión); en inglés a 390 (`-390-en`): `login`, `credits`, `subscribe-nuevo`, `referral`, `articulo`, `about`, `404`.

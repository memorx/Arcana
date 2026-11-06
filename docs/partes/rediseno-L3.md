## Parte L3 · Día y mesa (rediseño «Dos tintas», Fase 2)

Rama `rediseno/f2-L3` (worktree `C:/Users/guill/dev/arcana-lotes/f2-L3`), sobre `rediseno/dos-tintas` (fusionada dos veces:
`6a30e3b`, la red de desbordes estricta, y `ee0fc20`/`643eaf1`, specs del menú y acentos). 6 nov 2026. Sin `git push`. Sólo
la base local `arcana_e2e_l3` (siempre vía `scripts/e2e-db.mjs`: `dev` y `serve`); nunca `npm run dev`, `db push` ni seeds a
mano; el clúster no se detuvo. `npm run build` leyó producción sólo para el sitemap (como en I1).

### Hecho

| Ficha | Commit | Qué |
|---|---|---|
| Dashboard como mesa | `fee33e0`, `12ec0fa` | Banda de tinta arriba (`Escena` + `MesaDeGrabados columnas={8} filas={2}`, ≤ 16 grabados) con las cartas de las 6 lecturas más recientes (si no hay, una mesa fija de 16), velo de tinta, «Mi espacio», pincel «Tu mesa», el saludo (único `h1`), `HoraDelDia` larga y «Nueva lectura». Debajo, sobre papel: tira de contadores y **retícula editorial con filetes** (hueco de 1 px sobre `bg-filete/25`, sin tarjetas con sombra): energías de hoy · Mapa Arcano · lecturas recientes (con abanico de grabados `-mesa`) · racha · nivel · retos · carta del mes · colección · logros · oráculo diario; luego Explora (glifos de la maqueta) y las tiradas, y referidos. Estados vacíos de `nuevo`: mesa fija con su nota, «Aún no has realizado ninguna lectura» + «Hacer mi primera lectura» con un reverso, «Tu racha empieza con tu próxima lectura» (la celda de racha ya no desaparece). Widgets reescritos a tokens: barras en dos tintas con `role="progressbar"`, luna dibujada (`LunaGlifo`), sin emojis (logros, retos, niveles, tonalli), títulos `h2`, enlaces de dato con 44 px. `StreakRewardModal` (pincel «Racha», sin confeti de colores) y `BirthdayBanner` restilizados. |
| **DEFECTO `/progress`** | `fee33e0` | `LevelWidget` enlaza a `/achievements` («Ver logros», `LEVEL_PROGRESS_HREF`); borradas las dos filas `PROGRESO_404` de `DEFECTOS` en `e2e/responsivo.spec.ts`. |
| `/daily` sobre tinta | `6e9490c` | Escena de tinta: «Carta de hoy · 2 Tochtli», pincel «Hoy», `h1`, y la carta del día como `CartaQuemable tamano="grande"` (`key={card.id}`, `prioridad`, `etiqueta={t("carta.voltearPosicion",{posicion})}`, `revelada` controlada + `onRevelada`); `TransicionPincel` una vez al entrar. Al quemarse: nombre (`h2`), invertida, la interpretación en Newsreader y la hora de envío. Los cuatro estados de suscripción intactos (sin suscripción con vista previa y «Suscribirme», créditos agotados, esperando la primera carta, con carta). Energías del día en el formato «El día de hoy» y los días anteriores como grabados en tinta. |
| `/calendar` en dos tintas | `2d277f6` | Cabecera con etiqueta mono y `h1` Gloock; tira de tinta con los 20 signos del tonalpohualli (hoy en rosa) que corre lenta, se pausa con puntero/foco y queda quieta con reduced-motion (`data-recorta`). Retícula de filetes: número del día en Gloock (`text-base`/`sm:text-xl`, ya no `text-xs`), luna en dos tintas, tonalli desde `sm`, día personal en rosa; **hoy** con regla rosa arriba y número rosa, el seleccionado invertido en tinta. Celdas ≥ 46 × 56 px a 360. Teclado intacto. Panel del día como lámina en papel. |
| `/history` y `/history/insights` como archivo | `97f3fa6` | Historial por mes con filetes; cada lectura con su abanico de grabados `-mesa`, sellos de tirada y resonancia, fecha mono; vacío con un reverso. Mi historia: tira de cifras, cartas recurrentes en tinta (la más frecuente con regla rosa), palos y meses en barras CSS de dos tintas (`role="img"` con los valores; el palo mayor y el mes actual en rosa), resonancia en Gloock, el repaso del mes en pliego. Fuera `FadeIn`/`InsightsMotion` (nada depende de una animación para verse). |

Tests nuevos o reescritos (todos míos): `dashboard-page.test.tsx` (7: banda en tinta con un solo `h1`, ≤ 16 grabados con las cartas recientes primero y una sola consulta de nombres, mesa fija y estados vacíos, la banda sobrevive a una consulta fallida, retícula y Explora), `dashboard-mesa.test.ts` (7: mesa fija = 16 slugs reales, orden y tope de 16, consultas), `LevelWidget.test.tsx` (3: el enlace va a una ruta que existe según los `page.tsx`, nunca `/progress`), `daily-page.test.tsx` (+6: carta boca abajo en tinta con el mensaje oculto, voltear muestra nombre y mensaje y se recuerda, cada estado de suscripción, días anteriores en tinta con fecha UTC), `ArcanaCalendar.test.tsx` (+2: hoy en rosa seleccionado o no, RePág/AvPág con Mayús y foco), `SignosDelDia.test.tsx` (3: tira de los 20 signos, hoy marcado, copia oculta, trazo de la luna). Flujo e2e `carta-del-dia.spec.ts`: ahora voltea la carta y comprueba que sigue volteada al recargar.

`messages` (append-only, es/en, `check-messages: ok (1032 keys)`): `dashboard.mesa.{etiqueta,pincel,notaRecientes,notaFijas}`, `dashboard.streak.{title,empty}`, `daily.{pincel,boca}`, `levels.viewAchievements`, `streakReward.pincel`, `calendar.{etiqueta,signos}`, `history.etiqueta`. En el merge con los acentos (`643eaf1`) gané sus valores y volví a poner sólo mis llaves.

Grep en mis archivos de las 18 familias viejas, `text-white`, `prose*` e `imageUrl`: **0**.

### Falso o ya hecho

- «Filtros si existen» en `/history`: no existe ninguno; no se agregó.
- «La hora del día» en la banda repite la de la cabecera (se pidió así; en la banda es la larga en todos los anchos).
- La racha en 3 días muestra la barra vacía: es correcto (`getMilestoneProgress` cuenta desde el hito anterior, 3 días).

### Handoffs

- **F1-A / integrador · `buttonClasses()` no se puede llamar desde un server component**: vive en `ui/button.tsx`, que es `"use client"`; en runtime Next da «Attempted to call buttonClasses() from the server». Lo resolví con `src/components/dashboard/EnlaceBoton.tsx` (client, `<Link className={buttonClasses(...)}>`), usado en mis páginas de servidor. Propuesta: mover `buttonClasses` a un módulo sin `"use client"` (p. ej. `ui/button-classes.ts`, reexportado) para que todos los lotes lo llamen desde el servidor; entonces `EnlaceBoton` se puede borrar.
- **F1-B · `ReversoCarta`**: `.reverso-carta { height: 100% }` está fuera de capa y gana a `h-auto`; para usarla suelta hay que darle una caja con `aspect-[300/520]` (así lo hice).
- **L4 · `BlueprintBadges`** (celda del Mapa Arcano en el dashboard) sigue con `amber/purple/emerald`; es archivo de L4.
- **L5 · logros**: «Ver logros» del nivel lleva a `/achievements`; si L5 quiere, una sección de nivel/XP en esa página le daría sentido completo.
- **L1 · portada**: `SignosDelDia` (`src/components/calendar/`) es la marquesina de la escena 5 con datos reales; si L1 la quiere, se puede mover a `tinta/` en la integración.
- **Integrador**: el flujo `carta-del-dia.spec.ts` cambió (voltea la carta; el mensaje ya no se ve sin voltearla).

### Decisiones

1. **Banda y escena dentro del pliego** (`-mx-gutter`): de borde a borde bajo 1240 px y lámina de 1240 a 1440; nunca `100vw` (con barra de scroll clásica daría scroll horizontal). Separada de la cabecera por papel.
2. **Cartas de la mesa**: una consulta de lectura a `card` (`id`, `name`) para los `cardId` de las 6 lecturas más recientes (antes se pedían 3; la lista sigue mostrando 3). Si falla, mesa fija. El historial usa la misma función para sus miniaturas. Es lectura pura; no cambia datos ni APIs.
3. **El mensaje del día se ve al voltear la carta**, como la escena 3. Se recuerda en `localStorage` por id de lectura (comodidad por navegador, con `try/catch`): al volver ese día ya está volteada.
4. **Fechas de la carta del día en UTC** (`timeZone: "UTC"`): son `@db.Date`; en México se mostraba el día anterior. Sólo presentación.
5. **Color sólo en la carta de hoy revelada**: días anteriores, carta del mes y recurrentes en variante `tinta`; miniaturas y abanicos en `mesa`.
6. **Sin emojis**: la luna es un SVG (`LunaGlifo`: sombra en tinta, luz en papel; sobre tinta la sombra pasa a grafito con `--luna-sombra` para que una luna nueva no parezca llena); niveles con su número en un anillo.
7. **Calendario a 360**: el tonalli de cada celda se ve desde `sm`; abajo, número, luna y día personal (el nombre accesible y el panel lo dicen todo).
8. **Palabras a pincel**: «Tu mesa» (dashboard), «Hoy» (/daily), «Racha» (modal); en inglés «Your table», «Today», «Streak».

### PENDIENTES para Memo

- **«Hoy» en UTC** (ya lo señaló I1): después de las 18:00 de CDMX el calendario, la carta del día y la banda muestran el día siguiente.
- Las palabras a pincel elegidas (arriba, punto 8).
- ¿Quiere una página de progreso de nivel? Hoy «Ver logros» lleva a `/achievements`.

### Comandos y resultados (finales, sobre `083040c`)

| Comando | Resultado |
|---|---|
| `ARCANA_E2E_REUSE=1 ARCANA_E2E_DEFECTOS=0 npx playwright test e2e/responsivo.spec.ts --grep "dashboard\|daily\|calendar\|history"` (servidor `node scripts/e2e-db.mjs serve`: reset de `arcana_e2e_l3`, build en `.next-e2e`, `next start` :3013) | **179 passed, 0 failed** (3.9 min): 5 anchos, `@en` a 390, movimiento reducido, sin JS y WebKit 390 de `/calendar` |
| `npx playwright test e2e/flujos/carta-del-dia.spec.ts e2e/flujos/calendario.spec.ts e2e/flujos/historia.spec.ts` | **5 passed** |
| `npx playwright test e2e/flujos/registro.spec.ts e2e/flujos/lectura.spec.ts e2e/auth.spec.ts` (tocan dashboard e historial) | 21 passed, 1 skipped (Google apagado) |
| `npx tsc --noEmit` | 0 errores |
| `npm run lint` | **0 errores**, 16 avisos (todos previos y ajenos) |
| `npm test` | `check-messages: ok (1032 keys)` · **102 suites / 1,391 pruebas, todo verde** |
| `npm run build` | ver abajo |

### Capturas

`C:/Users/guill/AppData/Local/Temp/claude/C--Users-guill-dev-arcana/ba3d8826-c8e4-418f-8b14-19f131c84e14/scratchpad/fase2/L3/`
(Playwright contra el build de producción en :3013, `es-MX`, America/Mexico_City; script `capturas.cjs`; ninguna con errores de
consola, todas con 1 `h1` y `scrollWidth = clientWidth`): `dashboard-{historia,nuevo}-{1440,390,360}`,
`daily-historia-{1440,390,360}-quemar{,-boca-abajo,-quemando,-revelada}`, `daily-nuevo-*` (sin suscripción),
`calendar-historia-*`, `history-{historia,nuevo}-*`, `history-insights-{historia,nuevo}-*`. En `borrador/` quedan las de
iteración (incluye 1024 y 820).

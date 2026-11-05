## Parte Lote C

Rama `capataz/lote-C` (worktree `C:/Users/guill/dev/arcana-lotes/lote-C`), base `d5b646a`. Sin `git push`, sin `prisma db push/migrate`, sin `npm install`, sin `npm run dev` ni scripts que escriban en la base. Sólo archivos del lote (lista abajo) y este parte.

### Hechas

- **F-40: `/calendar`.** Página pública (no está en el `matcher` del middleware) en `src/app/(main)/calendar/page.tsx` + `layout.tsx` (metadata con `getTranslations("calendar")`, canonical `/calendar`). El servidor sólo calcula "hoy" (`todayUtc()`, regla 9) y se lo pasa al cliente para que SSR e hidratación coincidan. `ArcanaCalendar` (client) arma el mes con `Date.UTC` y calcula cada día con `getDayEnergies` de `@/lib/systems`: número, glifo del signo del tonalpohualli y emoji de la luna; con fecha de nacimiento, el día personal. Hoy con `aria-current="date"` y borde ámbar; el día elegido abre `DayDetail` a la derecha (escritorio, `sticky`) o abajo (móvil, con `scrollIntoView` suave salvo `prefers-reduced-motion`): `Tonalli.label`, significado y rasgos del signo, trecena (náhuatl, nombre, significado), Señor de la Noche, rumbo y patrono, fase lunar con iluminación y guía, día personal con nombre y palabras clave; sin fecha de nacimiento, CTA (invitado → `/register`; con sesión sin perfil → `/profile/setup`); al final `TONALPOHUALLI_INTRO` en un `<details>`. Accesible: `<table role="grid">` con celdas `<button>` y `aria-label` completo ("4 de noviembre, 13 Muerte, luna menguante, día personal 2, hoy"), tabindex itinerante, flechas (día/semana), Inicio/Fin (bordes de la semana), Re Pág/Av Pág (mes; con Shift, año), botones mes anterior/siguiente/Hoy con `aria-label`, título del mes con `aria-live="polite"`, nombres de los días con `sr-only` largo. Semana desde lunes (es) o domingo (en). A 360 px: tabla `table-fixed` de 7 columnas (~42 px por celda) sin scroll horizontal. `GET /api/calendar` devuelve `{ authenticated, birthDate: "YYYY-MM-DD" | null }` con `Cache-Control: private, no-store`; a invitados no toca la base. · Archivos: `src/app/(main)/calendar/{page,layout}.tsx`, `src/components/calendar/{ArcanaCalendar,DayDetail}.tsx`, `src/components/calendar/calendar-utils.ts`, `src/app/api/calendar/route.ts`, namespace `calendar`. · Tests: `src/__tests__/components/calendar-utils.test.ts` (claves de día en UTC con el runner en America/Mexico_City, meses, bisiestos, rejilla de noviembre 2026 con ambos inicios de semana, bordes de semana, formatos es/en), `src/__tests__/components/ArcanaCalendar.test.tsx` (30 botones con su etiqueta, hoy seleccionado, día personal al llegar la fecha, CTA de invitado y de perfil incompleto, sin día personal si falla la API, clic, teclado cruzando meses, botones de mes y "Hoy"), `src/__tests__/api/calendar.test.ts` (invitado sin base, sin perfil, sólo el día UTC, `no-store`, 500). · Commit `d18ed59`.
- **F-41: energías de hoy en `/daily`.** `TodayEnergies({ date, birthDate?, className? })` en `src/components/energies/TodayEnergies.tsx`: tres mosaicos (tonalli, luna con % de iluminación, día personal o link "Agrega tu fecha de nacimiento" a `/profile/setup`) y debajo las líneas de `describeDayEnergies` (el mismo texto que recibe la IA); link a `/calendar`. `src/app/(main)/daily/page.tsx` toma `birthDate` del perfil que ya pedía a `/api/profile` y monta el panel arriba de la carta (vista de suscriptor activo). `api/daily-reading` sin cambios (sólo lee; todas las cartas diarias salen del cron, así que todas llevan energías). · Test `src/__tests__/components/TodayEnergies.test.tsx`. · Commit `4e878a2`.
- **F-42: cron con contexto.** `src/app/api/cron/daily-readings/route.ts`: `dayContext = describeDayEnergies(getDayEnergies(today, profile.birthDate), locale)` (locale del perfil normalizado a en/es; si el cálculo lanzara, se manda sin contexto) a `generateDailyInterpretation` y al correo. En el cumpleaños llama `claimBirthdayGift(user.id, { birthDate, today })` en try/catch (un fallo no detiene la carta). `src/lib/email.ts`: `sendDailyReadingEmail` acepta `dayContext?`, `isBirthday?` y `birthdayGiftCredits?` (opcionales; nadie más la llama y las llamadas viejas siguen igual): caja "Energías del día" bajo la carta (una línea por renglón), cabecera de cumpleaños antes del saludo y asunto "¡Feliz cumpleaños, Ana! Tu carta del día: El Sol"; el texto nuevo va escapado (y el `<title>`, que ahora puede llevar el nombre). Quité el `const dailyReading` sin uso que señaló el Lote 0. · Tests: `src/__tests__/lib/email.test.ts` (nuevo: llamadas viejas sin cambios, energías bajo la carta y antes de la interpretación, inglés, escape, contexto vacío, cumpleaños con y sin créditos confirmados, escape del nombre) y `src/__tests__/api/cron-daily-readings.test.ts` (actualizado: mock de `@/lib/birthday` con `isBirthdayToday` real; 7 casos nuevos con la hora fijada al 2026-11-04 08:00 UTC: contexto con día personal = salida de la librería, inglés, sin fecha de nacimiento, regalo + saludo, regalo ya reclamado, fallo del regalo no corta la carta, "ya enviado hoy" no reclama). Las 5 aserciones originales no cambiaron. · Commit `b0ce31a`.
- **F-43: cumpleaños.** `src/lib/birthday.ts`: `isBirthdayToday(birthDate, today = todayUtc())` (campos UTC) y `claimBirthdayGift(userId, opts?)`: si es el cumpleaños, en `$transaction` hace `user.updateMany({ where: { id, OR: [{ lastBirthdayGiftYear: null }, { lastBirthdayGiftYear: { lt: año } }] }, data: { credits: { increment: 3 }, lastBirthdayGiftYear: año } })` y, sólo si `count === 1`, crea la `creditTransaction` `BIRTHDAY` de +3. `BirthdayBanner({ userId })` (server) la llama al renderizar y saluda si `granted` o si hoy es el cumpleaños; el resto del año devuelve `null` (también si la base falla). · Tests: `src/__tests__/lib/birthday.test.ts` (base en memoria cuyo `updateMany` respeta el `where`: dos llamadas el mismo día regalan una vez, dos simultáneas también, al año siguiente sí, no escribe si no es el día o no hay perfil, UTC con el runner en México, 29 de febrero) y `src/__tests__/components/BirthdayBanner.test.tsx`. · Commits `673f6ed`, `48d8243`.
- **F-44: pulso colectivo.** `src/lib/pulse.ts`: `computeCollectivePulse(today, now)` = `dailyReading.groupBy({ by: ["cardId"], where: { date: today }, _count: true })` + `reading.findMany({ where: { createdAt: { gte: now − 24 h } }, select: { cards: true } })`, cuenta en memoria (cada carta una vez por lectura; JSON mal formado se ignora), total de lecturas = cartas diarias + tiradas con cartas válidas; `< 5` → `{ enough: false }` (sin revelar el total); top 3 (empate por `cardId`) con nombre, imagen, conteo y porcentaje de lecturas. `getCollectivePulse(today)` lo envuelve en `unstable_cache` con llave `["collective-pulse", "YYYY-MM-DD"]`, `revalidate: 600`, tag `collective-pulse`. `GET /api/pulse` público: `Cache-Control: public, s-maxage=600, stale-while-revalidate=60`; si falla, 500 `no-store`. · Tests: `src/__tests__/lib/pulse.test.ts` (consultas exactas, umbral 4 vs 5, suma de ambas fuentes con porcentajes, desempate, una vez por lectura, JSON roto, cartas borradas, nada de usuarios en la salida, llave del caché por día) y `src/__tests__/api/pulse.test.ts`. · Commit `134a572`.
- **F-45: landing.** `CollectivePulse` (server, `src/components/landing/CollectivePulse.tsx`, importado por ruta directa; `landing/index.ts` intacto) dentro de `<Suspense fallback={null}>` justo bajo el héroe: "Hoy en Arcana salió más **El Sol**" con la imagen, "Apareció en el 40% de las lecturas del día", las otras dos como insignias y la nota de anonimato; punto "en vivo" con `motion-safe:animate-ping`. Si `enough: false` o error, no se muestra nada. Sección nueva "Más que tarot" (después de "Por qué Arcana", misma estética de tarjetas `interactive` con icono ámbar) con Mapa Arcano `/blueprint`, Calendario Arcano `/calendar`, Tu mazo `/reading/manual` y Lectura de dos `/compatibility`. `src/app/sitemap.ts`: `/calendar` (daily, 0.7). · Test `src/__tests__/components/CollectivePulse.test.tsx`. · Commit `0d51512`.
- **F-46: widget.** `TodayEnergiesWidget({ userId })` (server, `src/components/dashboard/TodayEnergiesWidget.tsx`): lee `birthDate` del perfil (si no hay o la base falla, sólo falta el día personal), fila de tres mosaicos (tonalli, luna, día personal o link a completar perfil) y botón "Calendario" a `/calendar`. `h-full` para la fila de dos columnas del integrador. · Test `src/__tests__/components/TodayEnergiesWidget.test.tsx`. · Commit `94cdbc0`.
- **F-47: tests y build.** Además de los de arriba: suite completa, `tsc`, `lint` y `build` (resultados al final). Comprobé que los tests nuevos fallan sin el arreglo donde importa (ver "Comandos").

### Falsas o ya hechas

- Ninguna.

### Bloqueadas / handoffs

- **Integrador, F-82 (dashboard, `src/app/(main)/dashboard/page.tsx`):**
  ```tsx
  import { BirthdayBanner } from "@/components/dashboard/BirthdayBanner";
  import { TodayEnergiesWidget } from "@/components/dashboard/TodayEnergiesWidget";
  // arriba de todo, antes de la sección de bienvenida:
  <BirthdayBanner userId={session.user.id} />
  // bajo la racha, en la fila de dos columnas con el BlueprintWidget del Lote B:
  <div className="grid gap-4 md:grid-cols-2">
    <TodayEnergiesWidget userId={session.user.id} />
    <BlueprintWidget userId={session.user.id} />
  </div>
  ```
  Ambos son `async` (server) y no reciben más props. `BirthdayBanner` escribe en la base al renderizar (el regalo), por diseño de F-43, y es idempotente.
- **Integrador, F-81 (navegación, `src/components/layout/Header.tsx`):** link a `/calendar` con `nav.calendar` ("Calendar" / "Calendario") en escritorio y en el menú de usuario. `/calendar` es pública, así que también puede ir en el menú de invitados si se quiere.
- **Rutas de otros lotes:** la sección "Más que tarot" enlaza `/blueprint` (Lote B), `/reading/manual` (Lote E) y `/compatibility` (Lote F); dan 404 hasta la fusión. Verificar después de F-80.
- **Textos de "Más que tarot"** viven en `pulse.moreThanTarot.*` porque la regla 8 sólo me deja agregar `calendar`, `energies`, `pulse` y `birthday`. Si el integrador prefiere `landing.moreThanTarot`, es mover el objeto y cambiar `tPulse("moreThanTarot.…")` en `src/app/page.tsx`.
- **Correo (observación, no lo cambié):** en `sendDailyReadingEmail` las interpolaciones que ya existían (`userName` en el saludo, `interpretation`, `displayCardName`, `keywords`) no se escapan. El nombre lo escribe la propia persona y le llega a su propio correo, así que el riesgo es bajo; si se quiere cerrar, es envolverlas en `escapeHtml` (ya existe en el archivo).

### Decisiones tomadas (con motivo)

1. **`claimBirthdayGift(userId, opts?)` devuelve también `isBirthday`** (además de `{ granted, credits: 3 }`) y acepta `{ birthDate?, today? }` opcionales: el banner necesita saber si es el cumpleaños aunque el regalo ya se haya dado (cron o pestaña previa), y el cron ya trae el perfil cargado. La firma del contrato (`claimBirthdayGift(userId)`) sigue funcionando.
2. **29 de febrero se celebra el 28 en años no bisiestos** (también el regalo).
3. **El cron reclama el regalo antes de generar la carta**: si la IA falla, el regalo ya quedó (es idempotente y el banner lo mostraría igual). Al correo va `birthdayGiftCredits` sólo si el reclamo no lanzó: si la base falla, el correo felicita pero no promete créditos.
4. **Porcentaje del pulso = parte de las lecturas** en que salió la carta (no de las cartas tiradas): "apareció en el 40% de las lecturas" se entiende sin explicar. Una carta cuenta una vez por lectura; una carta diaria es una lectura de una carta. Con `enough: false` no se expone el total.
5. **`/api/calendar` agrega `authenticated`** a `birthDate`: con eso el panel elige el CTA correcto (registrarse o completar el perfil) sin otra petición a `/api/auth/session`. Si la API falla, el calendario sigue y el día personal se omite.
6. **"Hoy" en UTC en todo el lote** (regla 9): calendario, panel de `/daily`, widget, cumpleaños y pulso cambian de día a las 18:00 en el centro de México. Ver PENDIENTES.
7. **Teclado:** las flechas mueven foco y selección juntos (el panel sigue al foco); los botones de mes conservan el día del mes (31 ene → 28 feb).
8. **Movimiento:** sólo animaciones con `motion-safe:` (ping del pulso, flotación del pastel, `pulse` del esqueleto). No usé `FadeIn` porque no respeta `prefers-reduced-motion`. `.animate-float` de `globals.css` es una clase suelta que no acepta variantes, así que el banner usa `motion-safe:animate-[float_6s_ease-in-out_infinite]` con el mismo `@keyframes`.
9. **Fechas legibles con `Intl` y `timeZone: "UTC"`** (`es-MX` / `en-US`), para no depender del huso del navegador.
10. **Iconos de "Más que tarot" como glifos de texto** (✶ ☾ ❖ ♡) para que tomen el ámbar de las tarjetas de "features"; un emoji ignoraría el color.
11. **Español con acentos** en los namespaces nuevos (los viejos no los llevan; no los toqué).
12. **Limpieza mínima en archivos del lote** (sin cambio de comportamiento): `dailyReading` sin uso en el cron y `tSubscribe` sin uso en `/daily` (avisos de lint de la línea base).

### PENDIENTES (decisión del dueño del producto)

- **Textos** para revisión de Memo: banner ("Te dejamos 3 créditos de regalo en tu cuenta. Que este año te traiga buenas preguntas."), asunto del correo de cumpleaños, pulso ("Hoy en Arcana salió más…", "Anónimo: sólo contamos cartas, nunca quién las sacó."), "Más que tarot".
- **Quién recibe el regalo:** cualquiera con perfil y cuenta de al menos 30 días (regla de Fable en la revisión) que abra el dashboard en su cumpleaños, además de los suscriptores por el cron. 3 créditos al año. Confirmar.
- **Umbral del pulso (5 personas distintas):** con poco tráfico puede no mostrarse casi nunca; es una perilla (`PULSE_MIN_PEOPLE`).
- **"Hoy" en UTC:** para alguien en México el calendario, el saludo de cumpleaños y el pulso cambian de día a las 18:00. Usar el huso de la persona (ya hay `date-fns-tz`) sería una ronda aparte que toca también `daily-reading` y el cron.
- Lo que heredo del Lote A: que alguien de la tradición revise los textos del tonalpohualli, ahora visibles en el calendario.

### Comandos corridos al final y su resultado (jest / tsc / lint / build)

Corridos en el worktree sobre `48d8243` (la máquina estaba cargada con los otros lotes; los tiempos no son representativos).

| Comando | Base del lote (`d5b646a`) | Ahora |
|---|---|---|
| `npx jest` | 38 suites (30 del Lote 0 + 8 del Lote A) | **49 suites, 49 verdes; 648 de 648 tests verdes** (11 suites nuevas) |
| `npx tsc --noEmit` | 0 errores | **0 errores** (exit 0) |
| `npm run lint` | 0 errores, 23 avisos | **exit 0: 0 errores, 21 avisos**, todos en archivos fuera del lote (los 2 que estaban en archivos míos, `dailyReading` del cron y `tSubscribe` de `/daily`, ya no están) |
| `npm run build` | exit 0 | **exit 0** con Next 15.5.29: compila con avisos (los de `jose` en Edge y los de lint de arriba), 53/53 páginas; `/`, `/calendar`, `/daily`, `/api/calendar` y `/api/pulse` dinámicas (ƒ), `/sitemap.xml` estático |
| Paridad `messages/en.json` / `es.json` | idénticas | **idénticas: 638 llaves en cada uno, 0 de un solo lado**; namespaces nuevos al final en el mismo orden: `birthday`, `pulse`, `calendar`, `energies` |
| Mutaciones (los tests nuevos fallan sin el arreglo) | — | regalo sin la condición del año (`lt: year + 1`), cron sin `dayContext` y pulso sin umbral → **3 suites rojas, 6 tests rojos**; archivos restaurados desde copia y `git status` limpio |

Suites nuevas: `src/__tests__/lib/{birthday,email,pulse}.test.ts`, `src/__tests__/api/{calendar,pulse}.test.ts`, `src/__tests__/components/{calendar-utils.test.ts,ArcanaCalendar.test.tsx,CollectivePulse.test.tsx,TodayEnergies.test.tsx,TodayEnergiesWidget.test.tsx,BirthdayBanner.test.tsx}`. Actualizada: `src/__tests__/api/cron-daily-readings.test.ts` (sólo casos y mocks añadidos).

### Correcciones de revisión (commit `fix(calendar): apply review corrections (F-40..F-47)`)

Todo dentro de los archivos del lote. Lo de arriba describe la entrega original; donde choca, manda esta sección.

- **C1** `calendar.metaTitle` sin " | Arcana" en es/en (la plantilla `%s | Arcana` del layout raíz lo agrega). Test `src/__tests__/app/calendar-layout.test.ts` con los mensajes reales: título exacto en es y en, la marca aparece una sola vez con la plantilla, canonical `/calendar`.
- **C2** `text-slate-500` → `text-slate-400` en las cabeceras de los días, la leyenda y la ayuda de teclado de `ArcanaCalendar.tsx`, y en los tres `dt` de `DayDetail.tsx`.
- **N1** `claimBirthdayGift`: el `updateMany` exige además `createdAt: { lt: hoy − 30 días }` (`BIRTHDAY_GIFT_MIN_ACCOUNT_DAYS = 30`). Una cuenta nueva en su cumpleaños recibe `isBirthday: true`, `granted: false`, sin transacción. Para que el banner no le diga "tus créditos ya están en tu cuenta", el resultado agrega `alreadyGranted` (si `count === 0`, se lee `lastBirthdayGiftYear` dentro de la misma transacción): el banner muestra `granted`, `alreadyGranted` o, si no aplica, sólo el saludo (`birthday.greetingOnly`, llave nueva en en/es). Tests: cuenta de 5 días → `granted: false`, saldo intacto, sin `creditTransaction`; cuenta de 60 días → `granted: true` con su transacción; el `where` lleva la fecha límite; banner con saludo sin créditos.
- **N2** Cron: `birthdayGiftCredits` sólo si `gift.granted`. Si el regalo ya se dio hoy desde el dashboard, o la cuenta es nueva, el correo felicita sin mencionar créditos (test actualizado con los dos casos).
- **N4** Cron: `const locale = profile.locale === "en" ? "en" : "es"` una sola vez, para la IA, `describeDayEnergies` y el correo; en `sendDailyReadingEmail`, `isSpanish = locale !== "en"`. Tests: `"fr"`, `""` y `null` llegan como `"es"` a la IA y al correo con el contexto en español; el correo con `locale: "fr"` sale en español. Las otras dos plantillas de `email.ts` (restablecer contraseña, suscripción expirada) conservan su `locale === "es"`: no las llama el cron y cambiarlas mueve comportamiento fuera de la ficha.
- **N5** Pulso: el umbral cuenta **personas distintas** (≥ 5) entre las cartas diarias de hoy y las tiradas de las últimas 24 h; se lee `userId` sólo para contarlas. Consultas: `dailyReading.findMany({ where: { date: today }, select: { userId, cardId } })` (sustituye al `groupBy`, que no da usuarios) y `reading.findMany({ …, select: { userId, cards } })`. Una persona cuyas tiradas tienen JSON roto no cuenta. La respuesta pública (lib, `/api/pulse` y lo que usa `CollectivePulse`) es sólo `{ enough, date, cards: [{ name, nameEs, imageUrl, percent }] }`: sin `totalReadings`, `count` ni `cardId`. Tests reescritos (4 personas con 8 lecturas → `enough: false`; 5 personas entre ambas fuentes → sí; llaves exactas de la salida).
- **N6** Las etiquetas `aria-label` se arman en el mismo `useMemo` que las energías, con un solo `Intl.DateTimeFormat` por mes (`dayMonthFormatter` nuevo en `calendar-utils.ts`; `formatDayMonth` lo usa).
- **N7** `export const dynamic = "force-dynamic"` en `src/app/(main)/calendar/page.tsx`.
- **N8** `email.ts`: `escapeHtml` en el nombre del saludo, el nombre de la carta (preheader, `alt` y título), las palabras clave y la interpretación. La interpretación ya se mostraba con `white-space: pre-line` (no había `<br>`), así que sólo se escapa y los saltos de línea quedan igual. Test: nombre, carta, palabras clave e interpretación con `<…>` salen escapados y el salto de línea se conserva.
- **N9** `pulse.moreThanTarot.blueprint.description`: "Cinco sistemas a partir de tu fecha de nacimiento y tu nombre…" / "Five systems from your birth date and your name…".
- **N10** Tests nuevos: `src/__tests__/app/landing.test.tsx` (la sección "Más que tarot" enlaza exactamente `/blueprint`, `/calendar`, `/reading/manual`, `/compatibility`, en ese orden) y `src/__tests__/app/daily-page.test.tsx` (`/daily` monta `TodayEnergies` con `todayUtc()` y la fecha de nacimiento del perfil; `null` sin perfil).

Resultado después de la revisión:

| Comando | Resultado |
|---|---|
| Suites del lote + `cron-daily-readings.test.ts` (15 suites) | **15 verdes, 96 de 96 tests** |
| `npx tsc --noEmit` | **0 errores** |
| `npm run lint` | **exit 0: 0 errores, 21 avisos** (los mismos, todos fuera del lote) |
| `npm run build` | **exit 0**: 52/52 páginas; `/`, `/calendar`, `/api/calendar`, `/api/pulse` dinámicas |
| Paridad en/es | **639 llaves en cada uno**, 0 de un solo lado (nueva: `birthday.greetingOnly`) |

### Exports para el integrador (firmas exactas)

```ts
// src/components/dashboard/BirthdayBanner.tsx  (server, async)
export async function BirthdayBanner({ userId }: { userId: string }): Promise<JSX.Element | null>;
// src/components/dashboard/TodayEnergiesWidget.tsx  (server, async)
export async function TodayEnergiesWidget({ userId }: { userId: string }): Promise<JSX.Element>;
// src/components/landing/CollectivePulse.tsx  (server, async; envolver en <Suspense>)
export async function CollectivePulse(): Promise<JSX.Element | null>;
// src/components/energies/TodayEnergies.tsx  (sin directiva; hoy lo usa /daily, que es client)
export function TodayEnergies(props: { date: Date; birthDate?: Date | null; className?: string }): JSX.Element;
// src/components/calendar/ArcanaCalendar.tsx  ("use client")
export function ArcanaCalendar(props: { today: string /* "YYYY-MM-DD", UTC */ }): JSX.Element;
// src/components/calendar/DayDetail.tsx  ("use client")
export type ProfileStatus = "loading" | "guest" | "no-profile" | "ready" | "error";
export function DayDetail(props: { dayKey: string; birthDate: Date | null; profileStatus: ProfileStatus; locale: Locale; isToday: boolean }): JSX.Element;

// src/lib/birthday.ts
export const BIRTHDAY_GIFT_CREDITS: 3; export const BIRTHDAY_GIFT_MIN_ACCOUNT_DAYS: 30;
export interface BirthdayGiftResult { granted: boolean; alreadyGranted: boolean; credits: 3; isBirthday: boolean }
export function isBirthdayToday(birthDate: Date | null | undefined, today?: Date /* todayUtc() */): boolean;
export async function claimBirthdayGift(userId: string, opts?: { birthDate?: Date | null; today?: Date }): Promise<BirthdayGiftResult>;

// src/lib/pulse.ts
export const PULSE_MIN_PEOPLE: 5; export const PULSE_TOP_CARDS: 3; export const PULSE_REVALIDATE_SECONDS: 600;
export interface PulseCard { name: string; nameEs: string; imageUrl: string; percent: number }   // sin ids ni conteos
export type CollectivePulse = { enough: false } | { enough: true; date: string; cards: PulseCard[] };
export async function computeCollectivePulse(today?: Date, now?: Date): Promise<CollectivePulse>;   // sin caché
export function getCollectivePulse(today?: Date): Promise<CollectivePulse>;                         // unstable_cache 600 s

// src/lib/email.ts — DailyReadingEmailParams agrega (opcionales):
dayContext?: string; isBirthday?: boolean; birthdayGiftCredits?: number;
```

APIs: `GET /api/calendar` → `{ authenticated: boolean; birthDate: "YYYY-MM-DD" | null }` (`private, no-store`; 500 `{ error: "calendar_unavailable" }`). `GET /api/pulse` → `CollectivePulse` (`public, s-maxage=600, stale-while-revalidate=60`; 500 `{ error: "pulse_unavailable" }` con `no-store`).

### Commits (rama `capataz/lote-C`, sin push)

```
48d8243 test(birthday): cover the dashboard birthday banner (F-43, F-47)
94cdbc0 feat(dashboard): today's energies widget linking to the calendar (F-46)
4e878a2 feat(daily): today's energies panel above the daily card (F-41)
d18ed59 feat(calendar): Arcana Calendar month view with day detail (F-40)
0d51512 feat(landing): collective pulse and "more than tarot" section (F-45)
134a572 feat(pulse): anonymous collective pulse of today's cards (F-44)
b0ce31a feat(cron): weave day energies and birthday into the daily card email (F-42)
673f6ed feat(birthday): yearly birthday gift and dashboard greeting (F-43)
```

`npm-ci.log` (sin seguimiento, de la preparación del worktree) no es mío; no lo toqué ni lo commiteé. La bitácora del proyecto (`BITACORA.md`) queda fuera de los archivos del lote: la escribe Fable en la Fase 4 con este parte.

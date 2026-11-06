# Bitácora — Arcana

**Qué es:** lecturas de tarot con IA en inglés y español, con cuentas, créditos (Stripe en MXN), oráculo diario por correo y capa de juego. Side project de Memo.
**Dónde vive:** repo `memorx/Arcana` (público), producción en https://www.readarcana.com (Vercel, proyecto `izalith/arcana`, Node 24.x, despliega en cada push a `main`). Base en Supabase.
**Stack:** Next.js 15.5 (App Router), React 19, Prisma 6.19, Auth.js 5 beta.32, next-intl, Tailwind 4, Jest + Playwright, next-pwa. IA: Claude Opus 5.5 (lecturas y síntesis) y Haiku 4.5 (carta diaria), configurables por env en `src/lib/ai/config.ts`.

---

## 📸 ESTADO AL 06/11/2026

*(Esta sección se reescribe completa en cada actualización.)*

**Hecho y funcionando**
- **El rediseño «Dos tintas» está en producción** desde el 6 nov, 11:10 CDMX (PR #3, merge `af30337`, deploy `arcana-ep9xf5fft`). Las 46 rutas usan tinta, papel y rosa mexicano. Las cartas viven en `public/cartas/`: 234 archivos, tres variantes por carta.
- **Verificado por HTTP en producción:**
  - 15 rutas públicas responden 200; la carta inexistente y el blueprint compartido inexistente, 404.
  - Las protegidas redirigen al login con 307.
  - `/cartas/*` sale con 30 días de caché, y `sw.js` ya no precarga cartas.
  - La imagen del correo diario sale en JPEG por `/_next/image`.
- **Verificado en Chrome:** la portada carga sin errores de consola y sin imágenes rotas, y el cambio entre español e inglés funciona.
- **Lighthouse móvil de `/` en producción:** puntaje 90–93, LCP 3.1–3.5 s y CLS 0.001–0.006. Con el diseño viejo daba 98–99.
- **Pruebas:**
  - Jest: 127 suites, 1,624 pruebas.
  - E2E contra Postgres local (`npm run test:e2e`): 1,114 ✓ en Chromium a cinco anchos y en WebKit.
  - Para ver la app con datos locales: `npm run dev:e2e`.
- Concepto en `docs/DISENO-2026-11-05.md`, plan en `docs/PLAN-2026-11-05-rediseno.md`, partes en `docs/partes/rediseno-*.md`.
- La mega actualización del 4-5 nov sigue igual (entrada del 05/11).

**A medias**
- **Probar con sesión en producción.** Falta que Memo haga una lectura completa: elegir tirada, quemar las cartas e interpretación. También revisar la carta del día, el dashboard y la colección. Si algo falla, se regresa con `vercel rollback` al deploy `arcana-8e67hwd3k`.
- **Rendimiento:** subir PageSpeed móvil a 95 o más. La deuda está en `docs/partes/rediseno-F4-C.md`:
  - recortar los `messages` del HTML;
  - sacar framer-motion del JS inicial de la portada;
  - bajar los grabados `mesa` a calidad 40.

**Bloqueado**
- **Decisiones de Memo, pendientes desde el 6 nov:**
  - el «hoy» en hora de México: hoy cambia a las 18:00 CDMX;
  - aplicar `docs/sql/2026-11-06-acentos-tiradas.sql` en producción (no se ha aplicado);
  - el texto de la pregunta frecuente 2;
  - testimonios, contador o precio en la portada;
  - glifos propios para el zodiaco chino y el tonalli.
  La lista completa está en `docs/partes/rediseno-I2.md` §6.
- **Google Play:** espera la cuenta de desarrollador y la decisión sobre compras dentro de la app (Fase 5 del plan del 4 nov).

**Siguiente paso**
- Que Memo pruebe con su cuenta en producción y conteste las cinco decisiones.

---

## 06/11/2026 — El rediseño «Dos tintas» llegó a producción con la suite e2e completa

**Qué cambió**
- **169 commits y 542 archivos**; casi la mitad son imágenes de cartas.
- **Ciclo seguido:** maqueta aprobada, plan revisado por Fable y Fase 1 en tres lotes (tokens y primitivas, componentes de tinta, infraestructura e2e). Siguieron seis lotes de pantallas en worktrees, cada uno con su base `arcana_e2e_l<n>` y su puerto. Al final, integración, inspección de Fable, dos revisiones de código y tres lotes de correcciones.
- **Paleta vieja:** 1,681 clases en 87 archivos bajaron a 0. Una prueba de Jest impide que vuelvan, y el remapeo provisional se borró.
- **Pruebas:** Jest pasó de 1,129 a 1,624. Los e2e pasaron de 49 pruebas públicas sin base a 1,114 contra Postgres local.

**Por qué**
- Memo, 5 nov: «esta horrible el sitio». Eligió la referencia de 4C's ad. («este está poca madre») y aprobó la maqueta («me encanta»). Luego pidió que fuera «100% responsivo, con todos los tests».

**Decisiones y descartes**
- **Antes de cualquier e2e hubo guardas contra producción,** porque el `.env` local apunta a producción:
  - la siembra sólo borra con una bandera y en un host local;
  - la IA falsa sólo se enciende con `ARCANA_AI_FAKE=1` y fuera de Vercel;
  - Jest corre contra una base inalcanzable.
- **Velocidad:** tras las correcciones, Lighthouse local daba 70 contra 92 del diseño viejo. La causa eran 379 KB de fuentes web que Lantern cuenta antes del primer pintado. Fable eligió tres cambios:
  - Newsreader estática 400;
  - Water Brush recortada a 35 KB (OFL, se regenera con `scripts/fuente-pincel.py`);
  - El Loco con carga perezosa.
  Con eso dio 80–81 en local y 90–93 en producción. Se descartó cargar menos grabados en el héroe móvil, porque cambiaría el LCP real (1.2 s con Slow 4G). También se descartó quitar sólo la precarga, que no movía nada.
- **Cambiar de idioma recarga la página.** Chrome cortaba la respuesta de `router.refresh()` en la portada y no se aisló la causa.
- **Salieron de la portada** los testimonios inventados y el contador inflado.
- **Firefox salió de la matriz e2e** porque no está instalado. WebKit de escritorio sí entró.

**Lo que salió mal**
- **`buttonClasses` vivía en un módulo `"use client"`** y tronaba al llamarlo desde un server component. Jest no lo veía; lo vieron dos lotes en el navegador. Se movió a `button-classes.ts`.
- **El rediseño quitó el permiso de imágenes de Wikimedia,** y el correo diario se habría quedado sin imagen. Lo atrapó la revisión de código antes del merge: ahora usa las cartas locales.
- **`next dev` reescribía `tsconfig.json`.** Se fijaron sus includes.
- **`npm run build` lee la base de producción para el sitemap.** Sigue así; los lotes construyen con la base local.
- **Bugs que ya estaban en `main` y se corrigieron:**
  - las miniaturas de cartas recientes del dashboard daban 404;
  - faltaba `dashboard.welcomeDefault`;
  - las cartas de la corte mostraban números romanos.
- **Error propio:** un `taskkill` por nombre de imagen (`python.exe`) en plena sesión. Se reportó; los demás procesos de Python sobrevivieron.

---

## 05/11/2026 — Mega actualización en producción tras el ciclo capataz (Fable planea, Opus ejecuta)

**Qué cambió**
- 200 archivos, +31.5k líneas. Siete lotes de Opus 5.5 en worktrees con dueño exclusivo de archivos, cada uno con su parte en `docs/partes/`; un lector escéptico por lote; una vuelta de correcciones por lote; integrador; `/code-review high` con 10 hallazgos, 6 corregidos antes del merge.
- Tests de 284 (17 rojos) a 1129 verdes. Build de 63 páginas. Playwright público 49/49 (las 9 fallas previas eran specs viejas, no regresiones).

**Por qué**
- Memo pidió "una mega actualizada" con otros sistemas (chino, azteca, numerología) y mínimo cinco cosas que otras apps no hagan. El plan las define en §1 del PLAN.

**Decisiones y descartes**
- **Esquema por SQL, no `db push`.** `prisma db push` quería borrar una tabla `products` (84 filas) que no está en el esquema. Se generó el diff con `prisma migrate diff --script`, se quitó el `DROP TABLE` y se aplicó con `prisma db execute`. La tabla sigue ahí; Memo decide.
- **Modelos:** Opus 5.5 para lecturas (effort low, medido: 12 cartas = 32–35 s) y Haiku 4.5 para la carta diaria (cost). Cliente con `timeout 45 s, maxRetries 0` y un reintento manual sólo si el primer intento falló en menos de 5 s: antes `50 s + 1 reintento` rebasaba los 60 s de Vercel.
- **nanoid 5.1.16 en vez de 6.x** (6 exige Node 22; después se confirmó Node 24 en Vercel, así que da igual).
- **Privacidad de la tarjeta pública del Mapa Arcano:** las cinco insignias permiten deducir la fecha de nacimiento exacta. Se dejó con confirmación y aviso honesto; la versión estricta queda para Memo. La fecha exacta ya no viaja en ningún prompt.
- **Mazo propio no descubre cartas de la colección** (elegirlas a mano permitía completar las 78 y cobrar logros en créditos).
- **Regalo de cumpleaños sólo con 30 días de cuenta** (cambiar la fecha de nacimiento a hoy regalaba créditos a cuentas nuevas).
- **Pulso colectivo:** umbral de 5 personas distintas, sin volúmenes públicos, excluye tiradas manuales.
- **Medidor "Conjunto" de la lectura de dos reescalado a 1–5**: con las escalas originales nunca bajaba de 3.
- **No se hizo (backlog en PLAN §1b):** Next 16, Auth.js estable, Prisma 7, `next-pwa` → `@serwist/next`, web push, ascendente/carta astral, I Ching, runas, Lenormand, portugués.

**Hallazgos de paso**
- El cron de renovación por créditos fallaba en cada corrida (consulta con `select` + `include` al mismo nivel, que Prisma rechaza). Corregido; falta ver en logs de Vercel desde cuándo y si hay suscripciones por regularizar.
- El XP de racha nunca se otorgaba (`lastReadingDate` se leía después de actualizarlo). Corregido.
- `send-daily-reading.ts` usaba un modelo de 2025. Corregido.
- Los previews de Vercel están tras SSO: `curl` da 302; se verifican desde el Chrome de Memo.
- El build lee la base de producción para el sitemap: una caída de red tumba el build (pasó una vez).

**Lo que salió mal**
- El plan de Fable tenía dos errores que el Lote A detectó: "13 trecenas" (son 20) y un vector numerológico equivocado. Se corrigieron en el plan.
- `jest.config.ts` no fijaba `TZ`: varios tests de campos UTC sólo pasaban por el huso de la laptop. Ahora fija `America/Mexico_City` y hay un test independiente del huso.

# Bitácora — Arcana

**Qué es:** lecturas de tarot con IA en inglés y español, con cuentas, créditos (Stripe en MXN), oráculo diario por correo y capa de juego. Side project de Memo.
**Dónde vive:** repo `memorx/Arcana` (público), producción en https://www.readarcana.com (Vercel, proyecto `izalith/arcana`, Node 24.x, despliega en cada push a `main`). Base en Supabase.
**Stack:** Next.js 15.5 (App Router), React 19, Prisma 6.19, Auth.js 5 beta.32, next-intl, Tailwind 4, Jest + Playwright, next-pwa. IA: Claude Opus 5.5 (lecturas y síntesis) y Haiku 4.5 (carta diaria), configurables por env en `src/lib/ai/config.ts`.

---

## 📸 ESTADO AL 05/11/2026

*(Esta sección se reescribe completa en cada actualización.)*

**Hecho y funcionando**
- Mega actualización del 4-5 nov en producción (PR #2, merge `9ed9a25`, deploy `arcana-hwc155trk`). Verificado por HTTP el 5 nov 15:34 UTC: `/`, `/calendar`, `/api/pulse`, `/api/health`, `/sitemap.xml` → 200; `/share/blueprint/<inexistente>` → 404; `/blueprint`, `/compatibility`, `/history/insights`, `/reading/manual` → 307 al login. Landing y calendario vistos en Chrome sin errores de consola.
- Funciones nuevas: Mapa Arcano (`/blueprint`, cinco sistemas + síntesis de IA + tarjeta pública opcional), Calendario Arcano (`/calendar`, tonalpohualli mexica + luna + día personal; energías del día en la carta diaria y el correo), Mi historia (`/history/insights`, memoria de lecturas en el prompt, analítica, recap mensual, resonancia días después), tirada con mazo propio (`/reading/manual`), lectura de dos (`/compatibility`, 2 créditos), preguntas de seguimiento (primera gratis, luego 1 crédito, máx. 5) y leer en voz alta en cada lectura, pulso colectivo en la landing, regalo de cumpleaños (3 créditos, cuentas de 30+ días).
- Cimientos: modelos actuales; una lectura nunca se cobra si la IA falla; débitos condicionales (sin saldos negativos); crons que exigen `CRON_SECRET`; renovación por créditos idempotente; 0 vulnerabilidades críticas; ESLint funcionando; 88 suites / 1129 tests verdes.
- Esquema: 4 tablas y 6 columnas nuevas aplicadas en producción por SQL aditivo (ver entrada del 5 nov).
- Documentación de la ronda: `docs/PLAN-2026-11-04.md` (plan y catálogo de ideas), `docs/REVISION-2026-11-04.md` (inspección, decisiones, pendientes), `docs/partes/` (parte de cada lote).

**A medias**
- Verificación con sesión en producción: sólo se probó lo público. Falta que Memo entre, vea el dashboard nuevo, genere su Mapa Arcano y haga una lectura con seguimiento. Si algo falla, `vercel rollback` al deploy anterior (`arcana-ob4zkrrc8`).

**Bloqueado**
- Nada bloqueado. Decisiones de Memo pendientes (lista completa en `docs/REVISION-2026-11-04.md` §Pendientes): precios provisionales, textos nuevos en es/en, tabla `products` ajena en la base, cron diario de Vercel Hobby (sólo 08:00 UTC recibe correo), "hoy" en UTC, privacidad de la tarjeta pública del Mapa Arcano.

**Siguiente paso**
- Publicar en Google Play (Fase 5 del plan, §9): Memo abre la cuenta de desarrollador y decide qué hacer con las compras dentro de la app; después se genera el paquete TWA con Bubblewrap.

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

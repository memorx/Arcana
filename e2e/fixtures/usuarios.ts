/**
 * Test users and fixed ids of the LOCAL e2e database (127.0.0.1:54329, PLAN 2026-11-05 §5.2).
 * The password exists only in this file and in that throwaway database; it is
 * never a real account. `e2e/fixtures/sembrar.ts` creates all of this from
 * `npm run e2e:db -- reset`.
 */

/** Same password for every e2e user. Local database only. */
export const CONTRASENA_E2E = "arcana-e2e-local-2026";

export interface UsuarioE2E {
  id: string;
  email: string;
  password: string;
  /** User.name */
  nombre: string;
  /** UserProfile.fullName (null = no profile) */
  nombreCompleto: string | null;
  /** UserProfile.birthDate, YYYY-MM-DD (null = no profile) */
  nacimiento: string | null;
  creditos: number;
  lecturasGratis: number;
}

/** Empty states: no readings, no profile, no credits, the 3 free readings of a new account. */
export const USUARIO_NUEVO: UsuarioE2E = {
  id: "e2e-usuario-nuevo",
  email: "nuevo@arcana.local",
  password: CONTRASENA_E2E,
  nombre: "Nuevo",
  nombreCompleto: null,
  nacimiento: null,
  creditos: 0,
  lecturasGratis: 3,
};

/**
 * A lived-in account: profile, 10 readings (all shared), 2 readings for two,
 * an Arcana Map with synthesis and public link, achievements, collection,
 * a golden card and an active daily-oracle subscription with today's card.
 * Read-only in the tests (the responsive pass and history/insights).
 */
export const USUARIO_CON_HISTORIA: UsuarioE2E = {
  id: "e2e-usuario-historia",
  email: "historia@arcana.local",
  password: CONTRASENA_E2E,
  nombre: "Ana",
  nombreCompleto: "Ana Lucía López",
  nacimiento: "1990-05-17",
  creditos: 50,
  lecturasGratis: 0,
};

/** Users created for parallel workers (Playwright's parallelIndex is 0..workers-1). */
export const USUARIOS_DE_WORKER = 8;

/** One user per Playwright worker, for flows that write (readings, subscriptions…). */
export function usuarioDeWorker(n: number): UsuarioE2E {
  return {
    id: `e2e-usuario-w${n}`,
    email: `e2e-w${n}@arcana.local`,
    password: CONTRASENA_E2E,
    nombre: `Sofía ${n}`,
    nombreCompleto: "Sofía Prueba Ruiz",
    nacimiento: "1992-08-21",
    creditos: 1000,
    lecturasGratis: 0,
  };
}

const pad = (i: number) => String(i).padStart(2, "0");

/** Fixed ids of what the fixtures create, for the dynamic routes. */
export const IDS = {
  /** Readings of USUARIO_CON_HISTORIA, 1..10 (1 is the newest). */
  lectura: (i: number) => `e2e-lectura-${pad(i)}`,
  /** Their public share ids (nanoid-like, 10 characters). */
  compartida: (i: number) => `e2eShare${pad(i)}`,
  compatibilidad: (i: number) => `e2e-compat-${pad(i)}`,
  /** Public Arcana Map link (/share/blueprint/[shareId], /^[A-Za-z0-9_-]{6,32}$/). */
  mapaCompartido: "e2eMapaAna1",
} as const;

/** The reading the responsive pass opens: 30 h old (resonance form), with a follow-up. */
export const LECTURA_PRINCIPAL = 4;

/** A card slug and a blog post the seeds always create. */
export const CARTA_SLUG = "the-fool";
export const BLOG_SLUG = "beginners-guide-tarot-interpretation";

/** Where sembrar.ts writes the ids it cannot fix in advance (spread types come from prisma/seed.ts). */
export const DATOS_GENERADOS = "e2e/.generado/datos.json";

export interface DatosGenerados {
  /** Spread type ids by prisma/seed.ts English name, e.g. "Three Card Spread". */
  tiradas: Record<string, string>;
}

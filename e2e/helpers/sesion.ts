/**
 * Shared Playwright fixtures for every e2e spec (PLAN 2026-11-05 §2.4, §5.2).
 *
 * - `cuenta`: which e2e user the test runs as ("worker" = its own user per worker,
 *   "historia" = the lived-in account, "nuevo" = empty states; null = guest).
 *   Each worker logs in once per account through Auth.js's credentials endpoint and
 *   reuses that storageState.
 * - Every test gets its own `x-forwarded-for`: the app rate-limits in memory by IP + path,
 *   and every worker shares localhost.
 * - Card images still point to upload.wikimedia.org until lot F1-B moves them to
 *   /cartas/*: those requests get a local stand-in, the tests never depend on the network.
 * - A test fails if the browser ever asks a production host (Supabase, readarcana.com).
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { test as base, expect, request, type Page } from "@playwright/test";
import { USUARIO_CON_HISTORIA, USUARIO_NUEVO, usuarioDeWorker, type UsuarioE2E } from "../fixtures/usuarios";
import { AUTH_DIR, BASE_URL } from "./entorno";

export { expect };

export type Cuenta = "worker" | "historia" | "nuevo";

const CARTA_PNG = path.join(process.cwd(), "e2e", "fixtures", "carta-e2e.png");
const HOSTS_DE_PRODUCCION = /(^|\.)supabase\.(co|com)$|(^|\.)readarcana\.com$/;

export function usuarioDe(cuenta: Cuenta, parallelIndex: number): UsuarioE2E {
  if (cuenta === "historia") return USUARIO_CON_HISTORIA;
  if (cuenta === "nuevo") return USUARIO_NUEVO;
  return usuarioDeWorker(parallelIndex);
}

/** Logs in with Auth.js's credentials endpoint (no UI: the login screen is tested in its own flow). */
export async function guardarSesion(usuario: UsuarioE2E, archivo: string, ip: string): Promise<void> {
  const ctx = await request.newContext({ baseURL: BASE_URL, extraHTTPHeaders: { "x-forwarded-for": ip } });
  try {
    const { csrfToken } = (await (await ctx.get("/api/auth/csrf")).json()) as { csrfToken: string };
    await ctx.post("/api/auth/callback/credentials", {
      form: { email: usuario.email, password: usuario.password, csrfToken, callbackUrl: `${BASE_URL}/dashboard` },
      headers: { "X-Auth-Return-Redirect": "1" },
      maxRedirects: 0,
    });
    const sesion = (await (await ctx.get("/api/auth/session")).json()) as { user?: { email?: string } } | null;
    if (sesion?.user?.email !== usuario.email) {
      throw new Error(`e2e login failed for ${usuario.email}: is the e2e database seeded?`);
    }
    mkdirSync(path.dirname(archivo), { recursive: true });
    await ctx.storageState({ path: archivo });
  } finally {
    await ctx.dispose();
  }
}

let pruebasEnEsteWorker = 0;

interface OpcionesDePrueba {
  /** Account the test runs as; null = guest. */
  cuenta: Cuenta | null;
  /** Internal: network stand-ins and the production tripwire (auto). */
  _red: void;
}

interface FixturesDeWorker {
  /** Returns the storageState file of an account for this worker, logging in the first time. */
  sesiones: (cuenta: Cuenta) => Promise<string>;
}

export const test = base.extend<OpcionesDePrueba, FixturesDeWorker>({
  cuenta: [null, { option: true }],

  sesiones: [
    async ({}, usar, workerInfo) => {
      const cache = new Map<Cuenta, string>();
      await usar(async (cuenta) => {
        let archivo = cache.get(cuenta);
        if (!archivo) {
          const usuario = usuarioDe(cuenta, workerInfo.parallelIndex);
          archivo = path.join(AUTH_DIR, `${cuenta}-w${workerInfo.parallelIndex}.json`);
          await guardarSesion(usuario, archivo, `10.250.${workerInfo.parallelIndex % 250}.1`);
          cache.set(cuenta, archivo);
        }
        return archivo;
      });
    },
    { scope: "worker" },
  ],

  storageState: async ({ cuenta, sesiones, storageState }, usar) => {
    await usar(cuenta ? await sesiones(cuenta) : storageState);
  },

  extraHTTPHeaders: async ({ extraHTTPHeaders }, usar, testInfo) => {
    pruebasEnEsteWorker++;
    const n = pruebasEnEsteWorker;
    const ip = `10.${testInfo.workerIndex % 250}.${(n >> 8) & 255}.${n & 255}`;
    await usar({ ...extraHTTPHeaders, "x-forwarded-for": ip });
  },

  _red: [
    async ({ context }, usar, testInfo) => {
      await context.route(/^https:\/\/upload\.wikimedia\.org\//, (route) =>
        route.fulfill({ path: CARTA_PNG, contentType: "image/png" })
      );
      const externos = new Set<string>();
      context.on("request", (req) => {
        const url = new URL(req.url());
        if (/^https?:$/.test(url.protocol) && !["localhost", "127.0.0.1"].includes(url.hostname)) {
          externos.add(url.hostname);
        }
      });

      await usar();

      if (externos.size) {
        testInfo.annotations.push({ type: "hosts externos", description: [...externos].sort().join(", ") });
      }
      expect([...externos].filter((host) => HOSTS_DE_PRODUCCION.test(host)), "the browser reached production").toEqual(
        []
      );
    },
    { auto: true },
  ],
});

/**
 * Closes the chain of celebration modals (golden card, new cards, achievements,
 * level, challenges, streak) that follows a reading. They come one after another
 * with short delays, so it waits a moment after each one. Uses Escape, which every
 * Modal honours (and the redesigned one must keep honouring).
 */
export async function cerrarModales(page: Page, { maxMs = 20_000, calmaMs = 1_600 } = {}): Promise<number> {
  const dialogo = page.getByRole("dialog");
  const fin = Date.now() + maxMs;
  let cerrados = 0;
  while (Date.now() < fin) {
    const visible = await dialogo
      .first()
      .waitFor({ state: "visible", timeout: calmaMs })
      .then(() => true)
      .catch(() => false);
    if (!visible) return cerrados;
    await page.keyboard.press("Escape");
    await dialogo.first().waitFor({ state: "hidden", timeout: 5_000 }).catch(() => undefined);
    cerrados++;
  }
  return cerrados;
}

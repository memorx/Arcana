/**
 * Tripwire before any spec runs: the server on :3000 must be the e2e one, wired to
 * the seeded local database. It logs in as the e2e "con historia" user and checks its
 * fixed id, which only exists in arcana_e2e. If this fails nothing else runs.
 */
import path from "node:path";
import type { FullConfig } from "@playwright/test";
import { USUARIO_CON_HISTORIA } from "./fixtures/usuarios";
import { AUTH_DIR } from "./helpers/entorno";
import { guardarSesion } from "./helpers/sesion";

export default async function globalSetup(config: FullConfig) {
  void config;
  await guardarSesion(USUARIO_CON_HISTORIA, path.join(AUTH_DIR, "comprobacion.json"), "10.250.250.250");
}

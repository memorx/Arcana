import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { DATOS_GENERADOS, type DatosGenerados } from "../fixtures/usuarios";

/** The e2e server (`next start -p 3000` from scripts/e2e-db.mjs serve). */
export const BASE_URL = `http://localhost:${process.env.ARCANA_E2E_WEB_PORT || "3000"}`;

/** Folder for the per-worker storageState files (gitignored). */
export const AUTH_DIR = path.join(process.cwd(), "e2e", ".auth");

let datos: DatosGenerados | null = null;

/** Ids written by e2e/fixtures/sembrar.ts on the last reset (read lazily: the reset runs after test collection). */
export function datosGenerados(): DatosGenerados {
  if (datos) return datos;
  const file = path.join(process.cwd(), DATOS_GENERADOS);
  if (!existsSync(file)) {
    throw new Error(`${DATOS_GENERADOS} not found: run "npm run e2e:db -- reset" (the webServer does it).`);
  }
  datos = JSON.parse(readFileSync(file, "utf8")) as DatosGenerados;
  return datos;
}

/** Id of a spread type by its prisma/seed.ts English name ("Three Card Spread"). */
export function idDeTirada(nombre: string): string {
  const id = datosGenerados().tiradas[nombre];
  if (!id) throw new Error(`spread type "${nombre}" not in ${DATOS_GENERADOS}`);
  return id;
}

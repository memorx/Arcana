/**
 * @jest-environment node
 *
 * worker/index.js (next-pwa builds it into public/worker-<buildId>.js, imported by sw.js): on activate it deletes
 * the orphan runtime cache of the old Wikimedia card images ("tarot-images"), which Workbox never cleans.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const CODIGO = fs.readFileSync(path.join(process.cwd(), "worker", "index.js"), "utf8");

function cargarWorker() {
  const escuchas: Record<string, (evento: unknown) => void> = {};
  const borrar = jest.fn().mockResolvedValue(true);
  vm.runInNewContext(CODIGO, {
    self: { addEventListener: (tipo: string, fn: (evento: unknown) => void) => (escuchas[tipo] = fn) },
    caches: { delete: borrar },
  });
  return { escuchas, borrar };
}

describe("custom service worker", () => {
  it("deletes the tarot-images cache on activate and keeps the worker alive until it is done", async () => {
    const { escuchas, borrar } = cargarWorker();
    expect(Object.keys(escuchas)).toEqual(["activate"]);

    const waitUntil = jest.fn();
    escuchas.activate({ waitUntil });

    expect(borrar).toHaveBeenCalledTimes(1);
    expect(borrar).toHaveBeenCalledWith("tarot-images");
    expect(waitUntil).toHaveBeenCalledTimes(1);
    await expect(waitUntil.mock.calls[0][0]).resolves.toBe(true);
  });

  it("does not touch the caches in use (cartas, api-cache, start-url, precache)", () => {
    const { escuchas, borrar } = cargarWorker();
    escuchas.activate({ waitUntil: jest.fn() });
    expect(borrar.mock.calls.flat()).toEqual(["tarot-images"]);
  });
});

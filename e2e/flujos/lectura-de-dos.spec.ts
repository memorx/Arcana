/**
 * Flow: a reading for two (/compatibility) with this worker's user (profile + 1000 credits).
 */
import { FAKE_TITULO_VINCULO, creditosDe } from "./comun";
import { expect, test } from "../helpers/sesion";

test.describe.serial("lectura de dos", () => {
  test.use({ cuenta: "worker" });

  test("datos de la otra persona → lectura del vínculo", async ({ page }) => {
    test.setTimeout(90_000);
    const antes = await creditosDe(page);

    await page.goto("/compatibility");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/lectura de dos|reading for two/i);

    await page.getByLabel(/^nombre$|^name$/i).fill("Luis");
    await page.getByLabel(/fecha de nacimiento|date of birth|birth date/i).fill("1988-11-02");
    await page.getByRole("button", { name: /leer el v[ií]nculo|read the bond/i }).click();

    await expect(page).toHaveURL(/\/compatibility\/[^/]+$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Sofía.*Luis/);
    await expect(page.getByText(FAKE_TITULO_VINCULO.es).first()).toBeVisible();
    // One meter per system plus the overall one
    await expect(page.getByRole("meter").first()).toBeVisible();
    // A reading for two costs 2 credits and never uses free readings
    await expect.poll(() => creditosDe(page)).toBe(antes - 2);

    // It is listed back on /compatibility
    await page.goto("/compatibility");
    await expect(page.getByRole("link", { name: /Luis/ }).first()).toBeVisible();
  });
});

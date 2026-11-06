/**
 * Flow: history and insights with the lived-in account (10 readings, read-only).
 */
import { IDS, LECTURA_PRINCIPAL } from "../fixtures/usuarios";
import { FAKE_FRASE_LECTURA } from "./comun";
import { expect, test } from "../helpers/sesion";

test.describe("historial e insights", () => {
  test.use({ cuenta: "historia" });

  test("el historial lista las 10 lecturas y abre una", async ({ page }) => {
    await page.goto("/history");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/historial|history/i);
    await expect(page.getByText(/10 lecturas|10 readings/i).first()).toBeVisible();

    const lecturas = page.locator(`a[href^="/reading/e2e-lectura-"]`);
    await expect(lecturas).toHaveCount(10);

    await page.getByRole("link", { name: /etapa de mudanza/i }).click();
    await expect(page).toHaveURL(new RegExp(`/reading/${IDS.lectura(LECTURA_PRINCIPAL)}$`));
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/tu lectura|your reading/i);
    await expect(page.getByText("¿Qué me pide esta etapa de mudanza?")).toBeVisible();
    await expect(page.getByText(FAKE_FRASE_LECTURA.es)).toBeVisible();
    // The follow-up already asked, and the resonance question (the reading is 30 h old)
    await expect(page.getByText("¿Y si la conversación no sale como espero?")).toBeVisible();
    await expect(page.getByRole("heading", { name: /c[oó]mo reson[oó]|how did this reading resonate/i })).toBeVisible();
  });

  test("insights: cartas recurrentes, palos, meses, resonancia y el resumen del mes", async ({ page }) => {
    await page.goto("/history/insights");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/mi historia|my story/i);
    for (const seccion of [
      /cartas recurrentes|recurring cards/i,
      /tus palos|your suits/i,
      /tus meses|your months/i,
      /c[oó]mo resonaron|how your readings resonated/i,
      /tu mes en cartas|your month in cards/i,
    ]) {
      await expect(page.getByRole("heading", { name: seccion })).toBeVisible();
    }
    // The recap can be written for a month with 3+ readings (not clicked: this account is shared)
    await expect(page.getByRole("combobox", { name: /mes|month/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /escribir mi mes|write my month/i })).toBeVisible();
  });
});

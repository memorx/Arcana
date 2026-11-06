/**
 * Flow: the daily card (/daily).
 * - "con historia" is subscribed and has today's card (seeded): it reads it.
 * - This worker's user is not subscribed: it subscribes with credits and lands on the
 *   daily page waiting for its first card (cards are drawn by the cron, not the UI).
 */
import { FAKE_FRASE_DIARIA, creditosDe } from "./comun";
import { expect, test } from "../helpers/sesion";

test.describe("carta del día con suscripción", () => {
  test.use({ cuenta: "historia" });

  test("la carta de hoy boca abajo, se voltea y deja su mensaje", async ({ page }) => {
    await page.goto("/daily");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/tu carta diaria|your daily card/i);

    // On ink, face down: the message waits until the card is turned (burned)
    const carta = page.getByRole("button", { name: /voltear|turn over|flip/i });
    await expect(carta).toBeVisible();
    await expect(page.getByText(FAKE_FRASE_DIARIA.es)).toHaveCount(0);
    await carta.click();
    await expect(page.locator('.cq[data-estado="revelada"]')).toHaveCount(1, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /la estrella|the star/i }).first()).toBeVisible();
    await expect(page.getByText(FAKE_FRASE_DIARIA.es).first()).toBeVisible();

    // Back the same day: already turned
    await page.reload();
    await expect(page.locator('.cq[data-estado="revelada"]')).toHaveCount(1);
    await expect(page.getByText(FAKE_FRASE_DIARIA.es).first()).toBeVisible();
  });
});

test.describe.serial("suscribirse al oráculo diario con créditos", () => {
  test.use({ cuenta: "worker" });

  test("sin suscripción → suscribirse con créditos → la página espera la primera carta", async ({ page }) => {
    await page.goto("/daily");
    const titulo = page.getByRole("heading", { level: 1 });
    await expect(titulo).toBeVisible();

    if (/suscr[ií]bete|subscribe/i.test((await titulo.textContent()) ?? "")) {
      const antes = await creditosDe(page);
      await page.getByRole("link", { name: /suscribirme|subscribe/i }).first().click();
      await expect(page).toHaveURL(/\/subscribe/);
      await page.getByRole("button", { name: /suscribirse con cr[eé]ditos|subscribe with credits/i }).click();
      await expect(page).toHaveURL(/\/subscribe\/success/, { timeout: 20_000 });
      // The welcome only appears once /api/subscription confirms the subscription is active.
      await expect(page.getByRole("heading", { level: 1 })).toContainText(/bienvenid|welcome/i);
      await expect.poll(() => creditosDe(page)).toBeLessThan(antes);
      await page.goto("/daily");
    }

    await expect(titulo).toContainText(/tu carta diaria|your daily card/i);
    await expect(page.getByText(/a[uú]n no ha sido sacada|not been drawn yet|hasn't been drawn/i)).toBeVisible();
  });
});

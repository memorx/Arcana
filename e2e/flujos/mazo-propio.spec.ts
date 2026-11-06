/**
 * Flow: a reading with your own physical deck (/reading/manual) with this worker's user.
 * Spread → pick the three cards (search + picker, one reversed) → intention → interpretation.
 */
import { FAKE_FRASE_LECTURA } from "./comun";
import { expect, test } from "../helpers/sesion";

test.describe.serial("mazo propio", () => {
  test.use({ cuenta: "worker" });

  test("elegir tirada, cartas e intención y recibir la lectura", async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto("/reading/manual");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/propio mazo|own deck/i);

    // Step 1: which spread did you lay out
    await page.getByRole("button", { name: /tirada de tres cartas|three card spread/i }).click();

    // Step 2: which cards came out. The picker fills the active slot and jumps to the next one.
    await expect(page.getByRole("heading", { name: /qu[eé] cartas salieron|which cards/i })).toBeVisible();
    const buscar = page.getByRole("searchbox", { name: /buscar|search/i });
    for (const [busqueda, carta] of [
      ["loco", /^elegir el loco$|^choose the fool$/i],
      ["estrella", /^elegir la estrella$|^choose the star$/i],
      ["luna", /^elegir la luna$|^choose the moon$/i],
    ] as const) {
      await buscar.fill(busqueda);
      await page.getByRole("button", { name: carta }).click();
    }
    // The middle card came out reversed
    await page.getByRole("button", { name: /presente.*invertida|present.*reversed/i }).click();

    const continuar = page.getByRole("button", { name: /^continuar$|^continue$/i });
    await expect(continuar).toBeEnabled();
    await continuar.click();

    // Step 3: the question asked to the cards
    await page.getByRole("textbox", { name: /pregunta|question|intenci[oó]n|intention/i }).fill(
      "¿Qué me dicen mis propias cartas sobre este cambio de trabajo?"
    );
    await page.getByRole("button", { name: /interpretar mis cartas|interpret my cards/i }).click();

    await expect(page).toHaveURL(/\/reading\/[^/]+$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/tu lectura|your reading/i);
    await expect(page.getByText(/con tu mazo|with your deck/i).first()).toBeVisible();
    await expect(page.getByText(FAKE_FRASE_LECTURA.es)).toBeVisible();
    // Credits are not compared: the first-reading achievement gives 1 back.
  });
});

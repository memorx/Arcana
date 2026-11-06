/**
 * Flow: a 3-card reading with this worker's user (1000 credits, fake AI).
 * Spread → intention → shuffle → reveal the three cards → interpretation → saved reading.
 */
import { FAKE_FRASE_LECTURA } from "./comun";
import { cerrarModales, expect, test } from "../helpers/sesion";

test.describe.serial("tirada de tres cartas", () => {
  test.use({ cuenta: "worker" });

  test("intención, barajar, revelar e interpretación", async ({ page }) => {
    test.setTimeout(180_000);

    await page.goto("/reading/new");
    await page.getByRole("link", { name: /tirada de tres cartas|three card spread/i }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/tres cartas|three card/i);

    // Intention (min. 10 characters); the button stays disabled below that
    const intencion = page.getByRole("textbox").first();
    const comenzar = page.getByRole("button", { name: /comenzar lectura|start reading|begin reading/i });
    await intencion.fill("corto");
    await expect(comenzar).toBeDisabled();
    await intencion.fill("¿Qué necesito ver de mi semana para cuidar mi energía?");
    await expect(comenzar).toBeEnabled();
    await comenzar.click();

    // Shuffle, then the reveal stage with three face-down cards
    await expect(page.getByText(/0 de 3 cartas reveladas|0 of 3 cards revealed/i)).toBeVisible({ timeout: 45_000 });

    // Today a face-down card is a div reading "Toca"; the redesign makes it a <button>
    // (CartaQuemable, aria-label "Revelar…"): either works here.
    const bocaAbajo = page
      .getByRole("button", { name: /revela|voltea|reveal|flip/i })
      .or(page.getByText(/^(toca|tap)$/i));
    for (let revelada = 1; revelada <= 3; revelada++) {
      await bocaAbajo.first().click();
      await expect(
        page
          .getByText(new RegExp(`${revelada} de 3 cartas reveladas|${revelada} of 3 cards revealed`, "i"))
          .or(page.getByText(/todas las cartas reveladas|all cards revealed/i))
          .first()
      ).toBeVisible();
    }

    // The celebration modals (new cards, first-reading achievement…) start ~1 s after the last card
    await cerrarModales(page, { calmaMs: 3_000 });
    await page.getByRole("button", { name: /ver interpretaci[oó]n|see interpretation|view interpretation/i }).click();
    await cerrarModales(page);

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/tu lectura|your reading/i);
    await expect(page.getByText(FAKE_FRASE_LECTURA.es)).toBeVisible();

    // It was saved (credits are not compared: achievements and level-ups can give some back)
    await page.getByRole("link", { name: /ver lectura guardada|view saved reading/i }).click();
    await expect(page).toHaveURL(/\/reading\/[^/]+$/);
    await expect(page.getByText("¿Qué necesito ver de mi semana para cuidar mi energía?")).toBeVisible();
    await page.goto("/history");
    await expect(page.getByRole("link", { name: /cuidar mi energ[ií]a/i }).first()).toBeVisible();
  });
});

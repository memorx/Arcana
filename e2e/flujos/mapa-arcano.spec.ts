/**
 * Flow: the Arcana Map (/blueprint). The worker's user has a profile but no synthesis:
 * it generates one (fake AI: 4 paragraphs + 2 questions), shares it and the public page
 * shows it to a guest. The "con historia" account already has one cached: no button.
 */
import { FAKE_FRASE_SINTESIS } from "./comun";
import { expect, test } from "../helpers/sesion";
import { BASE_URL } from "../helpers/entorno";

test.describe.serial("mapa arcano", () => {
  test.use({ cuenta: "worker" });

  test("generar la síntesis, compartirla y verla como invitado", async ({ page, browser }) => {
    test.setTimeout(90_000);
    await page.goto("/blueprint");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Sofía/);

    await page.getByRole("button", { name: /generar mi s[ií]ntesis|generate my synthesis/i }).click();
    await expect(page.getByText(FAKE_FRASE_SINTESIS.es)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /preguntas para tu a[ñn]o|questions for your year/i })).toBeVisible();
    await expect(page.getByText(/¿Qué empezarías este año/)).toBeVisible();
    await expect(page.getByText(/¿A quién le pedirías ayuda/)).toBeVisible();

    // Share: confirm, then the public link appears in a read-only field
    await page.getByRole("button", { name: /compartir mi mapa|share my map/i }).click();
    await page.getByRole("button", { name: /crear enlace|create link/i }).click();
    const enlace = page.getByRole("textbox", { name: /enlace p[uú]blico|public link/i });
    await expect(enlace).toHaveValue(/\/share\/blueprint\/[A-Za-z0-9_-]{6,32}$/);
    const url = new URL(await enlace.inputValue());

    // A guest (no session) sees the shared map with its synthesis
    const invitado = await browser.newContext({ baseURL: BASE_URL, locale: "es-MX", serviceWorkers: "block" });
    try {
      const publica = await invitado.newPage();
      await publica.goto(url.pathname);
      await expect(publica.getByRole("heading", { level: 1 })).toContainText(/Sofía/);
      await expect(publica.getByText(FAKE_FRASE_SINTESIS.es)).toBeVisible();
    } finally {
      await invitado.close();
    }
  });
});

test.describe("mapa arcano ya escrito", () => {
  test.use({ cuenta: "historia" });

  test("la síntesis guardada se muestra sin volver a pedirla", async ({ page }) => {
    await page.goto("/blueprint");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Ana/);
    await expect(page.getByText(FAKE_FRASE_SINTESIS.es)).toBeVisible();
    await expect(page.getByRole("button", { name: /generar mi s[ií]ntesis|generate my synthesis/i })).toHaveCount(0);
  });
});

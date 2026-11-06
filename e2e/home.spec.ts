import { test, expect } from "./helpers/sesion";

// The app picks the language from the locale cookie, then Accept-Language (default es).
// These checks were written for the Spanish default, so the browser asks for Spanish.
test.use({ locale: "es-MX" });

test.describe("Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display the hero section", async ({ page }) => {
    // The thesis is the only h1 (in Spanish by default)
    await expect(
      page.getByRole("heading", { level: 1, name: /las cartas son de 1909/i })
    ).toBeVisible();
  });

  test("should display navigation links", async ({ page }) => {
    // Home is the logo link (there is no "Inicio" text link)
    await expect(page.getByRole("link", { name: "Arcana", exact: true })).toHaveAttribute("href", "/");
    await expect(
      page.getByRole("link", { name: /iniciar sesi[oó]n|log in/i })
    ).toBeVisible();
  });

  test("should display CTA buttons", async ({ page }) => {
    // Guests: "Haz tu lectura" goes to sign-up; "Ver la carta de hoy" jumps to the card of the day
    const cta = page.getByRole("link", { name: /^haz tu lectura|^get your reading/i }).first();
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/register");
    await expect(page.getByRole("link", { name: /ver la carta de hoy|see today's card/i })).toHaveAttribute("href", "#hoy");
  });

  test("should display how it works section", async ({ page }) => {
    // «Del grabado a la IA» explains the product: a 1909 engraving becomes a reading
    await expect(
      page.getByRole("heading", { level: 2, name: /un grabado de 1909|a 1909 engraving/i })
    ).toBeVisible();
  });

  test("should display features section", async ({ page }) => {
    await expect(
      page.getByText(/78 grabados de 1909|78 engravings from 1909/i)
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: /más que tarot|more than tarot/i })).toBeVisible();
  });

  test("should display FAQ section", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /preguntas frecuentes|frequently asked/i })
    ).toBeVisible();
  });

  test("should display footer", async ({ page }) => {
    // The footer shows "© <year>" and the legal links (no "all rights reserved" line)
    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText(`© ${new Date().getFullYear()}`);
    await expect(footer.getByRole("link", { name: /privacidad|privacy/i })).toBeVisible();
  });

  test("should navigate to login page", async ({ page }) => {
    await page.getByRole("link", { name: /iniciar sesi[oó]n|log in/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: /bienvenido|welcome/i })
    ).toBeVisible();
  });

  test("should navigate to register page", async ({ page }) => {
    // Click on register link in nav or CTA
    await page
      .getByRole("link", { name: /registrarse|sign up|crear cuenta/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe("Language Switching", () => {
  test("should be able to switch to English", async ({ page }) => {
    await page.goto("/");

    // Open the language selector and pick English (options read "🇪🇸 ES" / "🇺🇸 EN")
    await page.getByRole("button", { name: "Change language" }).click();
    await page.getByRole("button", { name: /\bEN$/ }).click();

    // The locale cookie is set and the page re-renders in English
    await expect(page.getByRole("heading", { level: 1, name: /who reads them today is an ai/i })).toBeVisible();
  });
});

test.describe("Responsive Design", () => {
  test("should be responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Hero should still be visible
    await expect(
      page.getByRole("heading", { level: 1 })
    ).toBeVisible();

    // CTA button should be visible
    await expect(
      page.getByRole("link", { name: /haz tu lectura|get your reading/i }).first()
    ).toBeVisible();
  });

  test("should show mobile menu on small screens", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // The header's hamburger must be there (no "if visible": a missing button must fail)
    const mobileMenuButton = page.locator('header button[aria-controls="menu-movil"]');
    await expect(mobileMenuButton).toBeVisible();

    // It opens the full-screen menu (retry the click until hydration wires it up)
    const menu = page.locator("#menu-movil");
    await expect(async () => {
      if (!(await menu.isVisible())) await mobileMenuButton.click();
      await expect(menu).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 30_000 });

    // and the menu itself offers the log in link
    await expect(menu.getByRole("link", { name: /iniciar sesi[oó]n|log in/i })).toBeVisible();
  });
});

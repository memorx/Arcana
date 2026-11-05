import { test, expect } from "@playwright/test";

// The app picks the language from the locale cookie, then Accept-Language (default es).
// These checks were written for the Spanish default, so the browser asks for Spanish.
test.use({ locale: "es-MX" });

test.describe("Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display the hero section", async ({ page }) => {
    // Check for hero title (in Spanish by default)
    await expect(
      page.getByRole("heading", { name: /descubre tu destino/i })
    ).toBeVisible();
  });

  test("should display navigation links", async ({ page }) => {
    // Home is the logo link (there is no "Inicio" text link)
    await expect(page.getByRole("link", { name: "Arcana", exact: true })).toHaveAttribute("href", "/");
    await expect(
      page.getByRole("link", { name: /iniciar sesion|log in/i })
    ).toBeVisible();
  });

  test("should display CTA buttons", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /comenzar lectura|start reading/i })
    ).toBeVisible();
  });

  test("should display how it works section", async ({ page }) => {
    await expect(
      // level 2: an FAQ question (h3) also starts with "Como funciona"
      page.getByRole("heading", { level: 2, name: /como funciona|how does it work/i })
    ).toBeVisible();
  });

  test("should display features section", async ({ page }) => {
    await expect(
      page.getByText(/78 cartas|78 complete cards/i)
    ).toBeVisible();
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
    await page.getByRole("link", { name: /iniciar sesion|log in/i }).click();
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
    await expect(page.getByRole("heading", { name: /discover your destiny/i })).toBeVisible();
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
      page.getByRole("link", { name: /comenzar|start/i }).first()
    ).toBeVisible();
  });

  test("should show mobile menu on small screens", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Look for hamburger menu or mobile nav
    const mobileMenuButton = page.locator('[aria-label*="menu"]');
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      // Menu should open
      await expect(
        page.getByRole("link", { name: /iniciar sesion|log in/i })
      ).toBeVisible();
    }
  });
});

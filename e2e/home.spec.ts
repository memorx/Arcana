import { test, expect } from "@playwright/test";

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
    await expect(page.getByRole("link", { name: /inicio/i })).toBeVisible();
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
      page.getByRole("heading", { name: /como funciona|how does it work/i })
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
    await expect(
      page.getByText(/todos los derechos|all rights/i)
    ).toBeVisible();
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

    // Find and click language selector
    const languageButton = page.locator("button", { hasText: /es|en/i });
    if (await languageButton.isVisible()) {
      await languageButton.click();

      // Select English if available
      const englishOption = page.getByText("English");
      if (await englishOption.isVisible()) {
        await englishOption.click();

        // Wait for page to update
        await page.waitForTimeout(500);

        // Check for English content
        await expect(
          page.getByText(/discover your destiny/i)
        ).toBeVisible();
      }
    }
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

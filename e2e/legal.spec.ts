import { test, expect } from "@playwright/test";

test.describe("Legal Pages", () => {
  test.describe("About Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/about");
    });

    test("should display about page", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /sobre arcana|about arcana/i })
      ).toBeVisible();
    });

    test("should display mission section", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /mision|mission/i })
      ).toBeVisible();
    });

    test("should display how it works section", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /como funciona|how it works/i })
      ).toBeVisible();
    });

    test("should display disclaimer", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /aviso legal|disclaimer/i })
      ).toBeVisible();
    });

    test("should have back link", async ({ page }) => {
      await expect(
        page.getByRole("link", { name: /back/i })
      ).toBeVisible();
    });
  });

  test.describe("Terms Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/terms");
    });

    test("should display terms of service", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /terminos|terms of service/i })
      ).toBeVisible();
    });

    test("should display acceptance section", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /aceptacion|acceptance/i })
      ).toBeVisible();
    });

    test("should display service description", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /descripcion|description/i })
      ).toBeVisible();
    });

    test("should display user accounts section", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /cuentas|accounts/i })
      ).toBeVisible();
    });

    test("should display credits section", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /creditos|credits/i })
      ).toBeVisible();
    });
  });

  test.describe("Privacy Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/privacy");
    });

    test("should display privacy policy", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /privacidad|privacy policy/i })
      ).toBeVisible();
    });

    test("should display information collection section", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /informacion|information/i }).first()
      ).toBeVisible();
    });

    test("should display data storage section", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /almacenamiento|storage/i })
      ).toBeVisible();
    });

    test("should display cookies section", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /cookies/i })
      ).toBeVisible();
    });

    test("should display rights section", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /derechos|rights/i })
      ).toBeVisible();
    });
  });

  test.describe("Footer Links", () => {
    test("footer privacy link goes to privacy page", async ({ page }) => {
      await page.goto("/");

      // Scroll to footer
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      const privacyLink = page.getByRole("link", { name: /privacidad|privacy/i }).last();
      await privacyLink.click();

      await expect(page).toHaveURL(/\/privacy/);
    });

    test("footer terms link goes to terms page", async ({ page }) => {
      await page.goto("/");

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      const termsLink = page.getByRole("link", { name: /terminos|terms/i }).last();
      await termsLink.click();

      await expect(page).toHaveURL(/\/terms/);
    });
  });
});

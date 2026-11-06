import { test, expect } from "./helpers/sesion";
import { IDS, LECTURA_PRINCIPAL } from "./fixtures/usuarios";

// Signed-in tests use the users of the local e2e database (e2e/fixtures/usuarios.ts).

test.describe("Reading Flow - Unauthenticated", () => {
  test("clicking start reading redirects to login", async ({ page }) => {
    await page.goto("/");

    // Click on the reading CTA ("Haz tu lectura": a guest is sent to sign up first)
    const ctaButton = page.getByRole("link", { name: /haz tu lectura|get your reading/i }).first();
    await ctaButton.click();

    // Should land on an auth page (sign up for guests; /reading/new itself redirects to login)
    await expect(page).toHaveURL(/\/(register|login)/);
  });
});

test.describe("Spread Selection Page", () => {
  // Signed in as this worker's e2e user (1000 credits, no free readings left)
  test.use({ cuenta: "worker" });

  test("should display all spread types", async ({ page }) => {
    await page.goto("/reading/new");

    // Should show the 4 classic spread types
    await expect(page.getByText(/tres cartas|three cards/i).first()).toBeVisible();
    await expect(page.getByText(/cruz simple|simple cross/i).first()).toBeVisible();
    await expect(page.getByText(/herradura|horseshoe/i).first()).toBeVisible();
    await expect(page.getByText(/cruz celta|celtic cross/i).first()).toBeVisible();
  });

  test("should show credit costs for each spread", async ({ page }) => {
    await page.goto("/reading/new");

    // Each spread should show its cost
    await expect(page.getByText(/^1 cr[eé]dito|^1 credit/i).first()).toBeVisible();
    await expect(page.getByText(/^2 cr[eé]ditos|^2 credits/i).first()).toBeVisible();
    await expect(page.getByText(/^3 cr[eé]ditos|^3 credits/i).first()).toBeVisible();
  });

  test.describe("new account", () => {
    test.use({ cuenta: "nuevo" });

    test("should show free reading indicator for new users", async ({ page }) => {
      await page.goto("/reading/new");

      // Should indicate free readings available
      await expect(page.getByText(/gratis|free/i).first()).toBeVisible();
    });
  });
});

test.describe("Shared Readings", () => {
  test("should show 404 for non-existent shared reading", async ({ page }) => {
    const response = await page.goto("/share/non-existent-id");

    // A real 404 (not a 200 page that happens to say "404"), with the "lost card" page's h1
    // ("Esta página no existe en el mazo..." / "This page doesn't exist in the deck...").
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/no existe|doesn't exist/i);
  });

  test("public shared reading page should be accessible", async ({ page }) => {
    // This would need a real shared reading ID from the database
    // For now, we just test that the route exists
    const response = await page.goto("/share/test-share-id");

    // Either 200 (found) or 404 (not found) - not 500
    expect([200, 404]).toContain(response?.status());
  });
});

test.describe("Reading Page Structure", () => {
  test.use({ cuenta: "historia" });

  test("reading page shows all expected sections", async ({ page }) => {
    // A reading of the e2e "con historia" account
    await page.goto(`/reading/${IDS.lectura(LECTURA_PRINCIPAL)}`);

    // Intention section
    await expect(
      page.getByRole("heading", { name: /intenci[oó]n|intention/i })
    ).toBeVisible();

    // Cards section
    await expect(
      page.getByRole("heading", { name: /cartas|cards/i }).first()
    ).toBeVisible();

    // Interpretation section
    await expect(
      page.getByRole("heading", { name: /interpretaci[oó]n|interpretation/i })
    ).toBeVisible();
  });
});

test.describe("Accessibility", () => {
  test("login page should be accessible", async ({ page }) => {
    await page.goto("/login");

    // Check for proper form labels
    const emailInput = page.getByLabel(/email|correo/i);
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute("type", "email");

    const passwordInput = page.getByLabel(/password|contrase[ñn]a/i);
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("register page should be accessible", async ({ page }) => {
    await page.goto("/register");

    // Check for proper form structure
    await expect(page.getByLabel(/email|correo/i)).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test("pages should have proper heading structure", async ({ page }) => {
    await page.goto("/");

    // Should have an h1
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible();
  });

  test("buttons should be keyboard accessible", async ({ page }) => {
    await page.goto("/login");

    // Tab through the page until the submit button takes the focus (skip link, logo and
    // fields come first; the exact count changes with the layout)
    const submitButton = page.locator("form").getByRole("button", { name: /iniciar|sign in/i });
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Tab");
      if (await submitButton.evaluate((el) => el === document.activeElement)) break;
    }

    // Submit button should be focusable
    await expect(submitButton).toBeFocused();
  });
});

test.describe("Error Handling", () => {
  test("404 page for invalid routes", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
  });

  test("API returns proper error for invalid requests", async ({ page }) => {
    const response = await page.request.post("/api/auth/register", {
      data: {}, // Empty body
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});

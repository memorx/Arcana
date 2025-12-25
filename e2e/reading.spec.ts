import { test, expect } from "@playwright/test";

// Note: These tests assume an authenticated user.
// In a real scenario, you would:
// 1. Create a test user in a test database
// 2. Use a fixture to authenticate before each test
// 3. Clean up after tests

test.describe("Reading Flow - Unauthenticated", () => {
  test("clicking start reading redirects to login", async ({ page }) => {
    await page.goto("/");

    // Click on start reading CTA
    const ctaButton = page.getByRole("link", { name: /comenzar lectura|start reading/i }).first();
    await ctaButton.click();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Spread Selection Page", () => {
  // These tests will work once authenticated
  test.skip("should display all spread types", async ({ page }) => {
    await page.goto("/reading/new");

    // Should show 4 spread types
    await expect(page.getByText(/tres cartas|three cards/i)).toBeVisible();
    await expect(page.getByText(/cruz simple|simple cross/i)).toBeVisible();
    await expect(page.getByText(/herradura|horseshoe/i)).toBeVisible();
    await expect(page.getByText(/cruz celta|celtic cross/i)).toBeVisible();
  });

  test.skip("should show credit costs for each spread", async ({ page }) => {
    await page.goto("/reading/new");

    // Each spread should show its cost
    await expect(page.getByText(/1 credito|1 credit/i)).toBeVisible();
    await expect(page.getByText(/2 creditos|2 credits/i)).toBeVisible();
    await expect(page.getByText(/3 creditos|3 credits/i)).toBeVisible();
  });

  test.skip("should show free reading indicator for new users", async ({ page }) => {
    await page.goto("/reading/new");

    // Should indicate free readings available
    await expect(page.getByText(/gratis|free/i)).toBeVisible();
  });
});

test.describe("Shared Readings", () => {
  test("should show 404 for non-existent shared reading", async ({ page }) => {
    await page.goto("/share/non-existent-id");

    // Should show not found
    await expect(page.locator("body")).toContainText(/not found|no encontrado/i);
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
  test.skip("reading page shows all expected sections", async ({ page }) => {
    // This would require an actual reading ID
    await page.goto("/reading/test-reading-id");

    // Intention section
    await expect(
      page.getByRole("heading", { name: /intencion|intention/i })
    ).toBeVisible();

    // Cards section
    await expect(
      page.getByRole("heading", { name: /cartas|cards/i })
    ).toBeVisible();

    // Interpretation section
    await expect(
      page.getByRole("heading", { name: /interpretacion|interpretation/i })
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

    const passwordInput = page.getByLabel(/password|contraseña/i);
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

    // Tab through the form
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    // Submit button should be focusable
    const submitButton = page.getByRole("button", { name: /iniciar|sign in/i });
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

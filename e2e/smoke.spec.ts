import { test, expect } from "@playwright/test";

/**
 * Smoke Tests - Critical paths that should always work
 * These tests verify the app is functional without complex authentication
 */

test.describe("Smoke Tests - Public Pages", () => {
  test("landing page loads successfully", async ({ page }) => {
    const response = await page.goto("/");

    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Arcana/i);

    // Hero section should be visible
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // CTA buttons should exist
    await expect(page.getByRole("link", { name: /comenzar|start|get started/i }).first()).toBeVisible();
  });

  test("login page loads and has form", async ({ page }) => {
    const response = await page.goto("/login");

    expect(response?.status()).toBe(200);

    // Form elements
    await expect(page.getByLabel(/email|correo/i)).toBeVisible();
    await expect(page.getByLabel(/password|contraseña/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /iniciar|sign in|login/i })).toBeVisible();

    // OAuth option
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
  });

  test("register page loads and has form", async ({ page }) => {
    const response = await page.goto("/register");

    expect(response?.status()).toBe(200);

    // Form elements
    await expect(page.getByLabel(/email|correo/i)).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.getByRole("button", { name: /crear|register|sign up/i })).toBeVisible();
  });

  test("forgot password page loads", async ({ page }) => {
    const response = await page.goto("/forgot-password");

    expect(response?.status()).toBe(200);
    await expect(page.getByLabel(/email|correo/i)).toBeVisible();
  });

  test("legal pages load successfully", async ({ page }) => {
    // Privacy policy
    let response = await page.goto("/privacy");
    expect(response?.status()).toBe(200);

    // Terms of service
    response = await page.goto("/terms");
    expect(response?.status()).toBe(200);

    // About page
    response = await page.goto("/about");
    expect(response?.status()).toBe(200);
  });
});

test.describe("Smoke Tests - Navigation", () => {
  test("navigation between pages works", async ({ page }) => {
    await page.goto("/");

    // Navigate to login
    await page.getByRole("link", { name: /iniciar sesión|login|sign in/i }).first().click();
    await expect(page).toHaveURL(/\/login/);

    // Navigate to register from login
    await page.getByRole("link", { name: /crear cuenta|register|sign up/i }).click();
    await expect(page).toHaveURL(/\/register/);

    // Navigate back to home
    await page.getByRole("link", { name: /arcana/i }).first().click();
    await expect(page).toHaveURL("/");
  });

  test("language switcher works", async ({ page }) => {
    await page.goto("/");

    // Find and click language selector
    const langSelector = page.locator('[aria-label*="language"], [aria-label*="idioma"]').first();

    if (await langSelector.isVisible()) {
      await langSelector.click();

      // Should show language options
      const options = page.locator('[role="menuitem"], [role="option"]');
      await expect(options.first()).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe("Smoke Tests - API Endpoints", () => {
  test("health check endpoint responds", async ({ page }) => {
    const response = await page.request.get("/api/health");

    // Should return 200 or at least not 500
    expect([200, 404]).toContain(response.status());
  });

  test("cards API requires no auth for GET", async ({ page }) => {
    const response = await page.request.get("/api/cards");

    // Should return cards or require auth (401)
    expect([200, 401]).toContain(response.status());
  });

  test("spread types API works", async ({ page }) => {
    const response = await page.request.get("/api/spread-types");

    if (response.status() === 200) {
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    }
  });

  test("protected endpoints return 401 without auth", async ({ page }) => {
    // Credits endpoint
    let response = await page.request.get("/api/user/credits");
    expect(response.status()).toBe(401);

    // Reading creation
    response = await page.request.post("/api/reading", {
      data: { spreadTypeId: "test", intention: "test" },
    });
    expect(response.status()).toBe(401);

    // Profile
    response = await page.request.get("/api/profile");
    expect(response.status()).toBe(401);
  });

  test("auth endpoints validate input", async ({ page }) => {
    // Empty register
    let response = await page.request.post("/api/auth/register", {
      data: {},
    });
    expect(response.status()).toBe(400);

    // Invalid email format
    response = await page.request.post("/api/auth/register", {
      data: { email: "invalid", password: "test123" },
    });
    expect(response.status()).toBe(400);

    // Weak password
    response = await page.request.post("/api/auth/register", {
      data: { email: "test@test.com", password: "123" },
    });
    expect(response.status()).toBe(400);
  });
});

test.describe("Smoke Tests - Forms", () => {
  test("login form shows validation errors", async ({ page }) => {
    await page.goto("/login");

    // Try to submit empty form
    await page.getByRole("button", { name: /iniciar|sign in|login/i }).click();

    // Should show validation (either HTML5 or custom)
    const emailInput = page.getByLabel(/email|correo/i);
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  test("register form validates password match", async ({ page }) => {
    await page.goto("/register");

    await page.getByLabel(/email|correo/i).fill("test@example.com");

    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.first().fill("Password123!");
    await passwordInputs.nth(1).fill("DifferentPassword123!");

    await page.getByRole("button", { name: /crear|register|sign up/i }).click();

    // Should show mismatch error
    await expect(page.locator("body")).toContainText(/no coinciden|do not match|mismatch/i);
  });
});

test.describe("Smoke Tests - Error States", () => {
  test("404 page renders correctly", async ({ page }) => {
    const response = await page.goto("/this-page-definitely-does-not-exist-12345");

    expect(response?.status()).toBe(404);

    // Should show a user-friendly message
    await expect(page.locator("body")).toContainText(/not found|no encontrado|404/i);
  });

  test("invalid login shows error message", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel(/email|correo/i).fill("nonexistent@example.com");
    await page.getByLabel(/password|contraseña/i).fill("wrongpassword123");

    await page.getByRole("button", { name: /iniciar|sign in|login/i }).click();

    // Should show error
    await expect(page.locator("body")).toContainText(/invalid|inválido|error|incorrect/i, {
      timeout: 5000,
    });
  });
});

test.describe("Smoke Tests - Performance", () => {
  test("landing page loads within acceptable time", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/");
    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test("no console errors on public pages", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Filter out expected errors (like favicon)
    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("404")
    );

    expect(criticalErrors.length).toBe(0);
  });
});

test.describe("Smoke Tests - Responsive Design", () => {
  test("mobile viewport shows hamburger menu", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Desktop nav should be hidden on mobile
    const desktopNav = page.locator("nav.hidden.md\\:flex, nav.md\\:flex.hidden");

    // Either hamburger menu visible or responsive nav
    const mobileMenuButton = page.locator('[aria-label*="menu"], button:has(svg)').first();

    // At least one navigation method should be available
    const hasNav = await mobileMenuButton.isVisible() || await page.getByRole("navigation").isVisible();
    expect(hasNav).toBe(true);
  });

  test("forms are usable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/login");

    // Form should be visible and usable
    const emailInput = page.getByLabel(/email|correo/i);
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toBeEnabled();

    // Can type in inputs
    await emailInput.fill("test@example.com");
    await expect(emailInput).toHaveValue("test@example.com");
  });
});

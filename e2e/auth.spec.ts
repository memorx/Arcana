import { test, expect } from "@playwright/test";

test.describe("Authentication - Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("should display login form", async ({ page }) => {
    await expect(page.getByLabel(/email|correo/i)).toBeVisible();
    await expect(page.getByLabel(/password|contraseña/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /iniciar sesion|sign in/i })
    ).toBeVisible();
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.getByLabel(/email|correo/i).fill("invalid@example.com");
    await page.getByLabel(/password|contraseña/i).fill("wrongpassword");
    await page
      .getByRole("button", { name: /iniciar sesion|sign in/i })
      .click();

    // Should show error message
    await expect(
      page.getByText(/credenciales invalidas|invalid credentials/i)
    ).toBeVisible();
  });

  test("should have link to register page", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /crear cuenta|create account/i })
    ).toBeVisible();
  });

  test("should have link to forgot password", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /olvidaste|forgot/i })
    ).toBeVisible();
  });

  test("should navigate to forgot password", async ({ page }) => {
    await page.getByRole("link", { name: /olvidaste|forgot/i }).click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test("should have Google sign-in button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /google/i })
    ).toBeVisible();
  });
});

test.describe("Authentication - Register", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
  });

  test("should display register form", async ({ page }) => {
    await expect(page.getByLabel(/nombre|name/i)).toBeVisible();
    await expect(page.getByLabel(/email|correo/i)).toBeVisible();
    await expect(
      page.locator('input[type="password"]').first()
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /crear cuenta|create account/i })
    ).toBeVisible();
  });

  test("should show password mismatch error", async ({ page }) => {
    await page.getByLabel(/email|correo/i).fill("new@example.com");

    // Fill password fields
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.first().fill("password123");
    await passwordInputs.nth(1).fill("differentpassword");

    await page
      .getByRole("button", { name: /crear cuenta|create account/i })
      .click();

    // Should show mismatch error
    await expect(
      page.getByText(/no coinciden|do not match/i)
    ).toBeVisible();
  });

  test("should show weak password error", async ({ page }) => {
    await page.getByLabel(/email|correo/i).fill("new@example.com");

    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.first().fill("12345");
    await passwordInputs.nth(1).fill("12345");

    await page
      .getByRole("button", { name: /crear cuenta|create account/i })
      .click();

    await expect(
      page.getByText(/6 caracteres|6 characters/i)
    ).toBeVisible();
  });

  test("should have link to login page", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /iniciar sesion|sign in/i })
    ).toBeVisible();
  });

  test("should display terms and privacy links", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /terminos|terms/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /privacidad|privacy/i })
    ).toBeVisible();
  });
});

test.describe("Authentication - Forgot Password", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/forgot-password");
  });

  test("should display forgot password form", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /recupera|reset/i })
    ).toBeVisible();
    await expect(page.getByLabel(/email|correo/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /enviar|send/i })
    ).toBeVisible();
  });

  test("should show success message after submit", async ({ page }) => {
    await page.getByLabel(/email|correo/i).fill("test@example.com");
    await page.getByRole("button", { name: /enviar|send/i }).click();

    // Should show success message (the API always returns success)
    await expect(
      page.getByText(/revisa tu email|check your email/i)
    ).toBeVisible();
  });

  test("should have link back to login", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /volver|back/i })
    ).toBeVisible();
  });
});

test.describe("Protected Routes", () => {
  test("should redirect to login when accessing dashboard without auth", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect to login when accessing history without auth", async ({
    page,
  }) => {
    await page.goto("/history");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect to login when accessing new reading without auth", async ({
    page,
  }) => {
    await page.goto("/reading/new");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect to login when accessing credits without auth", async ({
    page,
  }) => {
    await page.goto("/credits");
    await expect(page).toHaveURL(/\/login/);
  });
});

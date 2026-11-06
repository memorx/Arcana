/**
 * Flow: create an account, land on the dashboard, sign out, sign back in, sign out.
 * Selectors by role and accessible text (es/en) so they survive the redesign.
 */
import { CONTRASENA_E2E } from "../fixtures/usuarios";
import { expect, test } from "../helpers/sesion";

/** Opens the user menu if the sign-out control lives inside it, then signs out. */
async function cerrarSesion(page: import("@playwright/test").Page) {
  const salir = page.getByRole("button", { name: /cerrar sesi[oó]n|sign out|log ?out/i });
  if (!(await salir.isVisible())) {
    await page.getByRole("button", { name: /men[uú] de usuario|user menu/i }).click();
  }
  await salir.click();
  await expect(page).toHaveURL(/\/$/);
}

test.describe.serial("registro, inicio y cierre de sesión", () => {
  const email = `registro-${Date.now().toString(36)}@arcana.local`;

  test("crear cuenta lleva al dashboard con sesión", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel(/nombre|name/i).first().fill("Lucía");
    await page.getByLabel(/correo|email/i).fill(email);
    await page.getByLabel(/^contrase[ñn]a|^password/i).fill(CONTRASENA_E2E);
    await page.getByLabel(/confirmar contrase[ñn]a|confirm password/i).fill(CONTRASENA_E2E);
    await page.getByRole("button", { name: /crear cuenta|create account/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Lucía/);

    await cerrarSesion(page);

    // Signed out: private pages send you to /login again
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("iniciar sesión con la cuenta nueva y cerrarla", async ({ page }) => {
    await page.goto("/login?callbackUrl=/history");
    await page.getByLabel(/correo|email/i).fill(email);
    await page.getByLabel(/contrase[ñn]a|password/i).fill(CONTRASENA_E2E);
    await page.locator("form").getByRole("button", { name: /iniciar sesi[oó]n|sign in/i }).click();

    // Lands on the callbackUrl (by pathname: the starting URL /login?callbackUrl=/history already matches /\/history/)
    await expect(page).toHaveURL((url) => url.pathname === "/history", { timeout: 20_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Signed in, /login sends you to the dashboard
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard/);

    await cerrarSesion(page);
  });

  test("una contraseña equivocada no entra", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/correo|email/i).fill(email);
    await page.getByLabel(/contrase[ñn]a|password/i).fill("no-es-la-contrasena");
    await page.locator("form").getByRole("button", { name: /iniciar sesi[oó]n|sign in/i }).click();

    await expect(page.getByText(/credenciales inv[aá]lidas|invalid credentials/i)).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});

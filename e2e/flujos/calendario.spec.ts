/**
 * Flow: the Arcana calendar (/calendar) driven only by the keyboard.
 * The browser clock is fixed on 5 Nov 2026 (page.clock); the grid opens on the server's
 * today, so the test walks there with PageUp/PageDown and the arrows, whatever the date
 * of the run, and checks the tonalli of that day: 1 Mázatl (1 Venado), Tláloc.
 */
import type { Locator, Page } from "@playwright/test";
import { expect, test } from "../helpers/sesion";

const DIA_OBJETIVO = new Date(Date.UTC(2026, 10, 5));

/** The focused day button: its accessible name starts with the day of the month. */
function enfocado(page: Page): Locator {
  return page.locator(":focus");
}

async function diaEnfocado(page: Page): Promise<number> {
  const nombre = (await enfocado(page).getAttribute("aria-label")) ?? (await enfocado(page).textContent()) ?? "";
  const dia = Number(/^\s*(\d{1,2})/.exec(nombre)?.[1]);
  if (!dia) throw new Error(`the focused element is not a day: "${nombre}"`);
  return dia;
}

async function pulsar(page: Page, tecla: string, veces: number) {
  for (let i = 0; i < veces; i++) await page.keyboard.press(tecla);
}

test.describe("calendario con teclado", () => {
  test("de hoy al 5 de noviembre de 2026 con flechas: 1 Mázatl", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-11-05T12:00:00-06:00"));
    await page.goto("/calendar");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/calendario|calendar/i);

    // Only the selected day is in the Tab order; focus it.
    const seleccionado = page.getByRole("gridcell", { selected: true }).getByRole("button");
    await seleccionado.focus();

    // Walk month by month from the server's today (UTC, like todayUtc()) to November 2026.
    const hoy = new Date();
    const meses = (DIA_OBJETIVO.getUTCFullYear() - hoy.getUTCFullYear()) * 12 + (DIA_OBJETIVO.getUTCMonth() - hoy.getUTCMonth());
    await pulsar(page, meses >= 0 ? "PageDown" : "PageUp", Math.abs(meses));
    await expect(page.getByRole("grid")).toBeVisible();

    // Then day by day to the 5th.
    const dia = await diaEnfocado(page);
    await pulsar(page, dia < 5 ? "ArrowRight" : "ArrowLeft", Math.abs(5 - dia));
    await expect(enfocado(page)).toHaveAccessibleName(/^5 de noviembre|^november 5/i);
    await expect(page.getByRole("gridcell", { selected: true })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: /5 de noviembre de 2026|november 5, 2026/i })).toBeVisible();
    await expect(page.getByText(/1 Mázatl/).first()).toBeVisible();
    await expect(page.getByText(/Tláloc/).first()).toBeVisible();

    // Arrows move the selection and the focus together: +1 day, back, +7 days, back.
    await page.keyboard.press("ArrowRight");
    await expect(enfocado(page)).toHaveAccessibleName(/^6 de noviembre|^november 6/i);
    await expect(page.getByRole("heading", { name: /6 de noviembre de 2026|november 6, 2026/i })).toBeVisible();
    await expect(page.getByText(/2 Tochtli/).first()).toBeVisible();

    await page.keyboard.press("ArrowLeft");
    await expect(enfocado(page)).toHaveAccessibleName(/^5 de noviembre|^november 5/i);

    await page.keyboard.press("ArrowDown");
    await expect(enfocado(page)).toHaveAccessibleName(/^12 de noviembre|^november 12/i);
    await page.keyboard.press("ArrowUp");
    await expect(enfocado(page)).toHaveAccessibleName(/^5 de noviembre|^november 5/i);
    await expect(page.getByText(/1 Mázatl/).first()).toBeVisible();
  });
});

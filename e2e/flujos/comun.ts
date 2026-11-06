/**
 * Shared bits of the flows. The fake AI texts live in src/lib/ai/config.ts
 * (FAKE_AI_TEXTS); these are distinctive phrases of them, kept in sync by
 * src/__tests__/lib/ai-fake.test.ts.
 */
import type { Page } from "@playwright/test";

export const FAKE_FRASE_LECTURA = {
  es: "las cartas no te dan una respuesta cerrada",
  en: "the cards don't hand you a closed answer",
} as const;
export const FAKE_FRASE_DIARIA = { es: "no todo se resuelve empujando" } as const;
export const FAKE_FRASE_SINTESIS = { es: "dibujan a alguien que aprende haciendo" } as const;
export const FAKE_TITULO_VINCULO = { es: "Cómo se encuentran" } as const;

/** Credits of the signed-in user, from the API the header uses. */
export async function creditosDe(page: Page): Promise<number> {
  const res = await page.request.get("/api/user/credits");
  const body = (await res.json()) as { credits?: number };
  if (typeof body.credits !== "number") throw new Error(`/api/user/credits answered ${res.status()}`);
  return body.credits;
}

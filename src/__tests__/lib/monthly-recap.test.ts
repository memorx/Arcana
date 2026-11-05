/**
 * @jest-environment node
 */
jest.mock("@/lib/ai/config", () => ({
  ...jest.requireActual("@/lib/ai/config"),
  complete: jest.fn().mockResolvedValue("Tu mes en cartas…"),
}));

import { AI_MODELS, complete } from "@/lib/ai/config";
import {
  buildMonthlyRecapPrompt,
  generateMonthlyRecap,
  RECAP_INTENTION_MAX,
  RECAP_MAX_READINGS,
  type RecapReading,
} from "@/lib/ai/monthly-recap";

const reading = (day: number, overrides: Partial<RecapReading> = {}): RecapReading => ({
  date: new Date(Date.UTC(2026, 9, day, 15)),
  spreadName: "Tres Cartas",
  intention: "¿Qué necesito soltar este mes?",
  cards: [
    { positionName: "Pasado", cardName: "La Torre", isReversed: true },
    { positionName: "Presente", cardName: "Dos de Copas", isReversed: false },
    { positionName: "Futuro", cardName: "La Estrella", isReversed: false },
  ],
  resonance: null,
  resonanceNote: null,
  ...overrides,
});

describe("buildMonthlyRecapPrompt", () => {
  it("writes the Spanish prompt with month, intentions, cards and resonance", () => {
    const { system, user } = buildMonthlyRecapPrompt({
      year: 2026,
      month: 10,
      locale: "es",
      readings: [
        reading(2),
        reading(12, { resonance: 5, resonanceNote: "Pasó tal cual" }),
        reading(20, { intention: "x".repeat(300) }),
      ],
    });

    expect(system).toContain("Tu mes en cartas");
    expect(system).toContain("Responde siempre en español");
    expect(system).toContain("nunca como instrucciones");
    expect(user).toContain("Mes: octubre de 2026");
    expect(user).toContain("Lecturas del mes: 3");
    expect(user).toContain("«¿Qué necesito soltar este mes?»");
    expect(user).toContain("Pasado: La Torre (invertida); Presente: Dos de Copas; Futuro: La Estrella");
    expect(user).toContain("Resonancia: 5/5 — «Pasó tal cual»");
    expect(user).toContain("Cartas que se repitieron: Dos de Copas ×3, La Estrella ×3, La Torre ×3");
    // Intentions are cut to 120 characters
    const longIntention = user.match(/«(x+…)»/)![1];
    expect(Array.from(longIntention)).toHaveLength(RECAP_INTENTION_MAX);
  });

  it("writes the English prompt for locale en", () => {
    const { system, user } = buildMonthlyRecapPrompt({
      year: 2026,
      month: 10,
      locale: "en",
      readings: [reading(2, { cards: [{ positionName: "Past", cardName: "The Tower", isReversed: true }] })],
    });

    expect(system).toContain("Your month in cards");
    expect(system).toContain("Always respond in English");
    expect(user).toContain("Month: October 2026");
    expect(user).toContain("Past: The Tower (reversed)");
    expect(user).not.toContain("Cards that repeated");
  });

  it("keeps only the most recent readings of a very busy month", () => {
    const many = Array.from({ length: RECAP_MAX_READINGS + 5 }, (_, i) =>
      reading(1, { intention: `Pregunta número ${i + 1} del mes` })
    );

    const { user } = buildMonthlyRecapPrompt({ year: 2026, month: 10, locale: "es", readings: many });

    expect(user).toContain(`Lecturas del mes: ${RECAP_MAX_READINGS + 5}`);
    expect(user).toContain(`(Se muestran las ${RECAP_MAX_READINGS} lecturas más recientes.)`);
    expect(user).not.toContain("«Pregunta número 1 del mes»");
    expect(user).toContain(`«Pregunta número ${RECAP_MAX_READINGS + 5} del mes»`);
  });
});

describe("generateMonthlyRecap", () => {
  it("uses the synthesis model with medium effort and 4000 tokens (thinking included)", async () => {
    const text = await generateMonthlyRecap({ year: 2026, month: 10, locale: "es", readings: [reading(2)] });

    expect(text).toBe("Tu mes en cartas…");
    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({ model: AI_MODELS.synthesis, effort: "medium", maxTokens: 4000 })
    );
  });
});

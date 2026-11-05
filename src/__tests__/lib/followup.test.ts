import {
  FOLLOWUP_COST,
  FOLLOWUP_LIMIT,
  FOLLOWUP_MAX_TOKENS,
  FOLLOWUP_QUESTION_MAX_LENGTH,
  buildFollowUpPrompt,
  followUpCost,
  type FollowUpContext,
} from "@/lib/ai/followup";

const context: FollowUpContext = {
  locale: "es",
  spreadName: "Tres Cartas",
  intention: "¿Debo cambiar de trabajo este año?",
  cards: [
    { position: 2, positionName: "Presente", cardName: "El Ermitaño", isReversed: false },
    { position: 1, positionName: "Pasado", cardName: "La Torre", isReversed: true },
    { position: 3, positionName: "Futuro", cardName: "Seis de Copas", isReversed: false },
  ],
  interpretation: "La Torre invertida habla de un cambio que ya empezó por dentro...",
  previous: [{ question: "¿Qué me pide El Ermitaño?", answer: "Te pide una pausa para escucharte." }],
  question: "¿Cómo sé si estoy lista para dar el paso?",
};

describe("follow-up prompt and pricing (F-63)", () => {
  it("has the agreed limits: 5 per reading, first free, then 1 credit, 500 characters", () => {
    expect(FOLLOWUP_LIMIT).toBe(5);
    expect(FOLLOWUP_COST).toBe(1);
    expect(FOLLOWUP_QUESTION_MAX_LENGTH).toBe(500);
    // A ceiling (thinking counts inside it), not what gets billed
    expect(FOLLOWUP_MAX_TOKENS).toBe(4000);
    expect(followUpCost(0)).toBe(0);
    expect(followUpCost(1)).toBe(1);
    expect(followUpCost(4)).toBe(1);
  });

  it("puts the intention, the cards with positions and orientation, the interpretation, earlier follow-ups and the question in the prompt", () => {
    const { user } = buildFollowUpPrompt(context);

    expect(user).toContain("¿Debo cambiar de trabajo este año?");
    expect(user).toContain("Tirada: Tres Cartas");
    expect(user).toContain("Posición 1 · Pasado: La Torre (invertida)");
    expect(user).toContain("Posición 2 · Presente: El Ermitaño\n");
    expect(user).toContain("Posición 3 · Futuro: Seis de Copas");
    expect(user).toContain("La Torre invertida habla de un cambio");
    expect(user).toContain("Pregunta: ¿Qué me pide El Ermitaño?");
    expect(user).toContain("Respuesta: Te pide una pausa para escucharte.");
    expect(user.trim().endsWith("¿Cómo sé si estoy lista para dar el paso?")).toBe(true);
    // Cards in position order regardless of the stored order
    expect(user.indexOf("Posición 1")).toBeLessThan(user.indexOf("Posición 2"));
  });

  it("omits the earlier follow-ups block on the first question", () => {
    const { user } = buildFollowUpPrompt({ ...context, previous: [] });

    expect(user).not.toContain("Preguntas de seguimiento anteriores");
  });

  it("asks for 2–3 paragraphs in the question's language, with no new cards and no predictions", () => {
    const { system } = buildFollowUpPrompt(context);

    expect(system).toContain("2 o 3 párrafos");
    expect(system).toContain("mismo idioma en el que está escrita la pregunta");
    expect(system).toContain("No sacas cartas nuevas");
    expect(system).toContain("No predices el futuro");
  });

  it("adds what each position represents when the spread has it", () => {
    const { user } = buildFollowUpPrompt({
      ...context,
      cards: [
        { position: 1, positionName: "Pasado", positionDescription: "Lo que quedó atrás", cardName: "La Torre", isReversed: true },
        { position: 2, positionName: "Presente", positionDescription: "  ", cardName: "El Ermitaño", isReversed: false },
      ],
    });

    expect(user).toContain("- Posición 1 · Pasado: La Torre (invertida)\n  Representa: Lo que quedó atrás\n");
    // A blank description adds nothing
    expect(user).toContain("- Posición 2 · Presente: El Ermitaño\n\n");
  });

  it("tells the model the person drew the cards with their own deck only for manual readings", () => {
    expect(buildFollowUpPrompt({ ...context, source: "manual" }).system).toContain(
      "La persona tiró estas cartas con su propio mazo físico. Respeta esa elección y no menciones el azar."
    );
    expect(buildFollowUpPrompt({ ...context, locale: "en", source: "manual" }).system).toContain(
      "drew these cards with their own physical deck"
    );
    expect(buildFollowUpPrompt({ ...context, source: "app" }).system).not.toContain("propio mazo");
    expect(buildFollowUpPrompt(context).system).not.toContain("propio mazo");
  });

  it("uses English labels and instructions for the en locale", () => {
    const { system, user } = buildFollowUpPrompt({
      ...context,
      locale: "en",
      spreadName: "Three Cards",
      cards: [{ position: 1, positionName: "Past", cardName: "The Tower", isReversed: true }],
      previous: [],
    });

    expect(user).toContain("Position 1 · Past: The Tower (reversed)");
    expect(user).toContain("Original interpretation:");
    expect(system).toContain("2 or 3 short paragraphs");
    expect(system).toContain("same language the question is written in");
    expect(system).toContain("don't draw new cards");
  });
});

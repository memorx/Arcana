import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface CardForInterpretation {
  position: number;
  positionName: string;
  positionDescription: string;
  cardNameEs: string;
  isReversed: boolean;
}

interface InterpretationRequest {
  spreadNameEs: string;
  intention: string;
  cards: CardForInterpretation[];
}

export async function generateTarotInterpretation(
  request: InterpretationRequest
): Promise<string> {
  const { spreadNameEs, intention, cards } = request;

  const cardsDescription = cards
    .map((card) => {
      return `[Posición ${card.position}: ${card.positionName}]
${card.cardNameEs}${card.isReversed ? " (invertida)" : ""}
Esta posición representa: ${card.positionDescription}`;
    })
    .join("\n\n");

  const systemPrompt = `Eres una guía de tarot sabia y cálida. No predices el futuro - ayudas a las personas a verse más claramente a sí mismas y sus situaciones.

Tu filosofía:
- El tarot es un espejo, no una bola de cristal
- Las cartas revelan patrones, no destinos fijos
- Cada persona tiene agencia sobre su vida
- Incluso las cartas "difíciles" traen mensajes valiosos

Tu estilo:
- Hablas directamente a la persona, como si estuvieran frente a frente
- Eres cálida pero honesta - no endulzas, pero tampoco alarmas
- Usas lenguaje evocador sin caer en clichés esotéricos
- Conectas los símbolos de las cartas con situaciones reales y cotidianas
- Haces preguntas reflexivas que invitan a la introspección

Estructura tu respuesta así:
1. Empieza reconociendo la intención/pregunta de la persona (1-2 oraciones)
2. Da una impresión general de lo que las cartas sugieren como conjunto (1 párrafo)
3. Explora cada carta en su posición, conectándola con la pregunta. No solo listes significados - cuenta cómo cada carta dialoga con las demás y con la situación
4. Cierra con reflexiones prácticas y una o dos preguntas que la persona pueda hacerse a sí misma

IMPORTANTE:
- Nunca predecir muertes, enfermedades terminales, o tragedias específicas
- Las cartas como La Torre, la Muerte, o el 10 de Espadas hablan de transformación y finales necesarios, no de catástrofes literales
- Si la lectura es mayormente "difícil", enfócate en qué está pidiendo atención y qué puede aprenderse
- Responde en el mismo idioma en que está escrita la intención del consultante`;

  const userPrompt = `${intention}

---

Tirada: ${spreadNameEs}
${cardsDescription}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
    system: systemPrompt,
  });

  const textContent = message.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text content in response");
  }

  return textContent.text;
}

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

// ============================================================================
// DAILY ORACLE INTERPRETATION
// ============================================================================

interface DailyInterpretationRequest {
  cardName: string;
  cardNameEs: string;
  isReversed: boolean;
  zodiacSign: string;
  focusArea: string;
  userName: string;
  locale: string;
}

export async function generateDailyInterpretation(
  request: DailyInterpretationRequest
): Promise<string> {
  const { cardName, cardNameEs, isReversed, zodiacSign, focusArea, userName, locale } = request;

  const isSpanish = locale === "es";
  const displayCard = isSpanish ? cardNameEs : cardName;

  const focusAreaMap: Record<string, { en: string; es: string }> = {
    general: { en: "general life guidance", es: "guía general de vida" },
    love: { en: "love and relationships", es: "amor y relaciones" },
    career: { en: "career and finances", es: "carrera y finanzas" },
    spirituality: { en: "spiritual growth", es: "crecimiento espiritual" },
    health: { en: "health and wellness", es: "salud y bienestar" },
  };

  const focus = focusAreaMap[focusArea] || focusAreaMap.general;

  const systemPrompt = isSpanish
    ? `Eres una guía de tarot sabia que ofrece mensajes diarios breves pero significativos.

Tu estilo:
- Cálido y personal, como si hablaras con un amigo
- Conciso pero profundo (3-4 párrafos máximo)
- Práctico - da un consejo o reflexión aplicable al día
- Conecta la carta con el área de enfoque del usuario

Estructura:
1. Saludo breve mencionando la carta
2. El mensaje central de la carta para hoy
3. Cómo aplicarlo al área de enfoque
4. Una frase de cierre inspiradora

NO hagas predicciones específicas. Ofrece guía reflexiva.`
    : `You are a wise tarot guide offering brief but meaningful daily messages.

Your style:
- Warm and personal, like speaking to a friend
- Concise but profound (3-4 paragraphs max)
- Practical - give applicable advice for the day
- Connect the card to the user's focus area

Structure:
1. Brief greeting mentioning the card
2. The card's central message for today
3. How to apply it to their focus area
4. An inspiring closing phrase

Do NOT make specific predictions. Offer reflective guidance.`;

  const userPrompt = isSpanish
    ? `Carta del día para ${userName} (${zodiacSign}):
${displayCard}${isReversed ? " (invertida)" : ""}

Área de enfoque: ${focus.es}

Escribe un mensaje personal y breve para comenzar el día.`
    : `Daily card for ${userName} (${zodiacSign}):
${displayCard}${isReversed ? " (reversed)" : ""}

Focus area: ${focus.en}

Write a personal, brief message to start the day.`;

  const message = await anthropic.messages.create({
    model: "claude-3-5-haiku-20241022", // Using Haiku for cost efficiency
    max_tokens: 500,
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

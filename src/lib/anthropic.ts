import { AI_MODELS, complete } from "@/lib/ai/config";

interface CardForInterpretation {
  position: number;
  positionName: string;
  positionDescription: string;
  cardName: string;
  isReversed: boolean;
}

interface InterpretationRequest {
  spreadName: string;
  intention: string;
  cards: CardForInterpretation[];
  locale: string;
  /** Plain-text summary of the person's previous readings (reading memory). */
  history?: string;
  /** "manual" = the person drew the cards with their own physical deck. */
  source?: "app" | "manual";
}

/** Readings: thinking tokens count inside this budget. */
const READING_MAX_TOKENS = 4000;
/** Daily card: short message from a model without thinking. */
const DAILY_MAX_TOKENS = 700;

export async function generateTarotInterpretation(
  request: InterpretationRequest
): Promise<string> {
  const { spreadName, intention, cards, locale, history, source } = request;
  const isSpanish = locale === "es";

  const cardsDescription = cards
    .map((card) => {
      const positionLabel = isSpanish ? "Posición" : "Position";
      const reversedLabel = isSpanish ? "(invertida)" : "(reversed)";
      const representsLabel = isSpanish ? "Esta posición representa" : "This position represents";
      return `[${positionLabel} ${card.position}: ${card.positionName}]
${card.cardName}${card.isReversed ? ` ${reversedLabel}` : ""}
${representsLabel}: ${card.positionDescription}`;
    })
    .join("\n\n");

  const systemPromptEs = `Eres una guía de tarot sabia y cálida. No predices el futuro - ayudas a las personas a verse más claramente a sí mismas y sus situaciones.

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
- Responde siempre en español`;

  const systemPromptEn = `You are a wise and warm tarot guide. You don't predict the future - you help people see themselves and their situations more clearly.

Your philosophy:
- Tarot is a mirror, not a crystal ball
- The cards reveal patterns, not fixed destinies
- Each person has agency over their life
- Even "difficult" cards bring valuable messages

Your style:
- You speak directly to the person, as if face to face
- You're warm but honest - you don't sugarcoat, but you don't alarm either
- You use evocative language without falling into esoteric clichés
- You connect the symbols of the cards with real, everyday situations
- You ask reflective questions that invite introspection

Structure your response like this:
1. Start by acknowledging the person's intention/question (1-2 sentences)
2. Give a general impression of what the cards suggest as a whole (1 paragraph)
3. Explore each card in its position, connecting it to the question. Don't just list meanings - tell how each card dialogues with the others and with the situation
4. Close with practical reflections and one or two questions the person can ask themselves

IMPORTANT:
- Never predict deaths, terminal illnesses, or specific tragedies
- Cards like The Tower, Death, or the 10 of Swords speak of transformation and necessary endings, not literal catastrophes
- If the reading is mostly "difficult", focus on what is asking for attention and what can be learned
- Always respond in English`;

  const manualDeckNote = isSpanish
    ? "\n\nLa persona tiró estas cartas con su propio mazo físico. Respeta esa elección y no menciones el azar."
    : "\n\nThe person drew these cards with their own physical deck. Respect that choice and don't mention chance or randomness.";

  const systemPrompt =
    (isSpanish ? systemPromptEs : systemPromptEn) + (source === "manual" ? manualDeckNote : "");
  const spreadLabel = isSpanish ? "Tirada" : "Spread";

  const historyBlock = history?.trim()
    ? `\n\n---\n\n${
        isSpanish
          ? "Contexto de lecturas anteriores (úsalo sólo si aporta; no lo recites)"
          : "Context from previous readings (use it only if it adds something; don't recite it)"
      }:\n${history.trim()}`
    : "";

  const userPrompt = `${intention}

---

${spreadLabel}: ${spreadName}
${cardsDescription}${historyBlock}`;

  return complete({
    model: AI_MODELS.reading,
    maxTokens: READING_MAX_TOKENS,
    system: systemPrompt,
    user: userPrompt,
  });
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
  /** Plain-text "energies of the day" (tonalli, moon, personal day). */
  dayContext?: string;
}

export async function generateDailyInterpretation(
  request: DailyInterpretationRequest
): Promise<string> {
  const { cardName, cardNameEs, isReversed, zodiacSign, focusArea, userName, locale, dayContext } =
    request;

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
  const hasDayContext = Boolean(dayContext?.trim());

  const baseSystemPrompt = isSpanish
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

  const dayContextInstruction = isSpanish
    ? "\n\nSi recibes las energías del día, téjelas en una sola frase dentro del mensaje, sin convertirlas en el tema: la carta sigue siendo el centro."
    : "\n\nIf you receive the energies of the day, weave them into a single sentence of the message without making them the topic: the card stays at the center.";

  const systemPrompt = baseSystemPrompt + (hasDayContext ? dayContextInstruction : "");

  const dayContextBlock = hasDayContext
    ? `\n\n${isSpanish ? "Energías del día" : "Energies of the day"}: ${dayContext!.trim()}`
    : "";

  const userPrompt = isSpanish
    ? `Carta del día para ${userName} (${zodiacSign}):
${displayCard}${isReversed ? " (invertida)" : ""}

Área de enfoque: ${focus.es}${dayContextBlock}

Escribe un mensaje personal y breve para comenzar el día.`
    : `Daily card for ${userName} (${zodiacSign}):
${displayCard}${isReversed ? " (reversed)" : ""}

Focus area: ${focus.en}${dayContextBlock}

Write a personal, brief message to start the day.`;

  return complete({
    model: AI_MODELS.daily,
    maxTokens: DAILY_MAX_TOKENS,
    system: systemPrompt,
    user: userPrompt,
  });
}

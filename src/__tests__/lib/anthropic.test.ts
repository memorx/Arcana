/**
 * @jest-environment node
 */

// Mock Anthropic SDK - complete() (src/lib/ai/config.ts) calls client.beta.messages.create
const mockCreate = jest.fn();

jest.mock("@anthropic-ai/sdk", () => {
  // Real error classes: complete() uses instanceof on them to decide its single retry (F-90)
  const actual = jest.requireActual("@anthropic-ai/sdk");
  return {
    __esModule: true,
    APIError: actual.APIError,
    APIConnectionError: actual.APIConnectionError,
    APIConnectionTimeoutError: actual.APIConnectionTimeoutError,
    default: jest.fn().mockImplementation(() => ({
      beta: {
        messages: {
          create: (...args: unknown[]) => mockCreate(...args),
        },
      },
    })),
  };
});

import { generateTarotInterpretation, generateDailyInterpretation } from "@/lib/anthropic";
import { AI_MODELS } from "@/lib/ai/config";

const textResponse = (text: string) => ({
  content: [{ type: "text", text }],
  stop_reason: "end_turn",
});

describe("generateTarotInterpretation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseRequest = {
    spreadName: "Three Card Spread",
    intention: "What should I focus on this week?",
    cards: [
      {
        position: 1,
        positionName: "Past",
        positionDescription: "What is behind you",
        cardName: "The Fool",
        isReversed: false,
      },
      {
        position: 2,
        positionName: "Present",
        positionDescription: "Current situation",
        cardName: "The Magician",
        isReversed: true,
      },
    ],
    locale: "en",
  };

  it("returns interpretation text from API response", async () => {
    mockCreate.mockResolvedValue(textResponse("Your reading shows a journey..."));

    const result = await generateTarotInterpretation(baseRequest);

    expect(result).toBe("Your reading shows a journey...");
  });

  it("calls Anthropic API with the configured reading model and max_tokens", async () => {
    mockCreate.mockResolvedValue(textResponse("Interpretation..."));

    await generateTarotInterpretation(baseRequest);

    // Readings keep the default 45 s budget (F-90)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: AI_MODELS.reading,
        max_tokens: 4000,
      }),
      { timeout: 45_000 }
    );
  });

  it("uses English system prompt for locale 'en'", async () => {
    mockCreate.mockResolvedValue(textResponse("Interpretation..."));

    await generateTarotInterpretation({ ...baseRequest, locale: "en" });

    const call = mockCreate.mock.calls[0][0];
    expect(call.system).toContain("You are a wise and warm tarot guide");
    expect(call.system).toContain("Always respond in English");
  });

  it("uses Spanish system prompt for locale 'es'", async () => {
    mockCreate.mockResolvedValue(textResponse("Interpretación..."));

    await generateTarotInterpretation({ ...baseRequest, locale: "es" });

    const call = mockCreate.mock.calls[0][0];
    expect(call.system).toContain("Eres una guía de tarot sabia y cálida");
    expect(call.system).toContain("Responde siempre en español");
  });

  it("includes card details in user prompt", async () => {
    mockCreate.mockResolvedValue(textResponse("Interpretation..."));

    await generateTarotInterpretation(baseRequest);

    const call = mockCreate.mock.calls[0][0];
    const userMessage = call.messages[0].content;

    expect(userMessage).toContain("The Fool");
    expect(userMessage).toContain("The Magician");
    expect(userMessage).toContain("(reversed)");
    expect(userMessage).toContain("Position 1: Past");
    expect(userMessage).toContain("Position 2: Present");
  });

  it("includes user intention in prompt", async () => {
    mockCreate.mockResolvedValue(textResponse("Interpretation..."));

    await generateTarotInterpretation(baseRequest);

    const call = mockCreate.mock.calls[0][0];
    expect(call.messages[0].content).toContain("What should I focus on this week?");
  });

  it("adds the reading history to the user prompt when provided", async () => {
    mockCreate.mockResolvedValue(textResponse("Interpretation..."));

    await generateTarotInterpretation({
      ...baseRequest,
      locale: "es",
      history: "12 oct · Tres cartas · El Loco, La Torre (inv.)",
    });

    const call = mockCreate.mock.calls[0][0];
    const userMessage = call.messages[0].content;
    expect(userMessage).toContain("Contexto de lecturas anteriores");
    expect(userMessage).toContain("12 oct · Tres cartas · El Loco, La Torre (inv.)");
  });

  it("leaves the history block out when there is no history", async () => {
    mockCreate.mockResolvedValue(textResponse("Interpretation..."));

    await generateTarotInterpretation(baseRequest);

    const call = mockCreate.mock.calls[0][0];
    expect(call.messages[0].content).not.toContain("previous readings");
  });

  it("tells the model the cards come from the person's own deck when source is manual", async () => {
    mockCreate.mockResolvedValue(textResponse("Interpretation..."));

    await generateTarotInterpretation({ ...baseRequest, source: "manual" });

    const call = mockCreate.mock.calls[0][0];
    expect(call.system).toContain("their own physical deck");
  });

  it("does not add the own-deck note for app readings", async () => {
    mockCreate.mockResolvedValue(textResponse("Interpretation..."));

    await generateTarotInterpretation({ ...baseRequest, source: "app" });

    const call = mockCreate.mock.calls[0][0];
    expect(call.system).not.toContain("physical deck");
  });

  it("throws error if no text content in response", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "image", source: {} }], // No text block
      stop_reason: "end_turn",
    });

    await expect(generateTarotInterpretation(baseRequest)).rejects.toThrow(
      "No text content in response"
    );
  });

  it("handles empty content array", async () => {
    mockCreate.mockResolvedValue({
      content: [],
      stop_reason: "end_turn",
    });

    await expect(generateTarotInterpretation(baseRequest)).rejects.toThrow(
      "No text content in response"
    );
  });
});

describe("generateDailyInterpretation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseRequest = {
    cardName: "The Sun",
    cardNameEs: "El Sol",
    isReversed: false,
    zodiacSign: "Leo",
    focusArea: "career",
    userName: "Maria",
    locale: "en",
  };

  it("returns interpretation text from API response", async () => {
    mockCreate.mockResolvedValue(textResponse("Good morning, Maria! The Sun shines..."));

    const result = await generateDailyInterpretation(baseRequest);

    expect(result).toBe("Good morning, Maria! The Sun shines...");
  });

  it("uses the configured daily model for cost efficiency", async () => {
    mockCreate.mockResolvedValue(textResponse("Daily message..."));

    await generateDailyInterpretation(baseRequest);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: AI_MODELS.daily,
        max_tokens: 700,
      }),
      { timeout: 45_000 }
    );
  });

  it("passes a per-call time budget to the SDK when given (the cron uses 15 s, F-90)", async () => {
    mockCreate.mockResolvedValue(textResponse("Daily message..."));

    await generateDailyInterpretation({ ...baseRequest, timeoutMs: 15_000 });

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: AI_MODELS.daily }), {
      timeout: 15_000,
    });
  });

  it("includes user name and zodiac sign in prompt", async () => {
    mockCreate.mockResolvedValue(textResponse("Daily message..."));

    await generateDailyInterpretation(baseRequest);

    const call = mockCreate.mock.calls[0][0];
    expect(call.messages[0].content).toContain("Maria");
    expect(call.messages[0].content).toContain("Leo");
  });

  it("uses English card name for English locale", async () => {
    mockCreate.mockResolvedValue(textResponse("Daily message..."));

    await generateDailyInterpretation({ ...baseRequest, locale: "en" });

    const call = mockCreate.mock.calls[0][0];
    expect(call.messages[0].content).toContain("The Sun");
  });

  it("uses Spanish card name for Spanish locale", async () => {
    mockCreate.mockResolvedValue(textResponse("Mensaje diario..."));

    await generateDailyInterpretation({ ...baseRequest, locale: "es" });

    const call = mockCreate.mock.calls[0][0];
    expect(call.messages[0].content).toContain("El Sol");
  });

  it("indicates reversed card in prompt", async () => {
    mockCreate.mockResolvedValue(textResponse("Daily message..."));

    await generateDailyInterpretation({ ...baseRequest, isReversed: true });

    const call = mockCreate.mock.calls[0][0];
    expect(call.messages[0].content).toContain("(reversed)");
  });

  it("maps focus areas correctly", async () => {
    mockCreate.mockResolvedValue(textResponse("Daily message..."));

    await generateDailyInterpretation({ ...baseRequest, focusArea: "love" });

    const call = mockCreate.mock.calls[0][0];
    expect(call.messages[0].content).toContain("love and relationships");
  });

  it("defaults to general focus area for unknown values", async () => {
    mockCreate.mockResolvedValue(textResponse("Daily message..."));

    await generateDailyInterpretation({ ...baseRequest, focusArea: "unknown" });

    const call = mockCreate.mock.calls[0][0];
    expect(call.messages[0].content).toContain("general life guidance");
  });

  it("adds the energies of the day to the prompt and asks to weave them in", async () => {
    mockCreate.mockResolvedValue(textResponse("Mensaje diario..."));

    await generateDailyInterpretation({
      ...baseRequest,
      locale: "es",
      dayContext: "13 Miquiztli · luna menguante · día personal 4",
    });

    const call = mockCreate.mock.calls[0][0];
    expect(call.messages[0].content).toContain(
      "Energías del día: 13 Miquiztli · luna menguante · día personal 4"
    );
    expect(call.system).toContain("una sola frase");
  });

  it("leaves the energies out when there is no day context", async () => {
    mockCreate.mockResolvedValue(textResponse("Daily message..."));

    await generateDailyInterpretation(baseRequest);

    const call = mockCreate.mock.calls[0][0];
    expect(call.messages[0].content).not.toContain("Energies of the day");
    expect(call.system).not.toContain("energies of the day");
  });

  it("throws error if no text content in response", async () => {
    mockCreate.mockResolvedValue({
      content: [],
      stop_reason: "end_turn",
    });

    await expect(generateDailyInterpretation(baseRequest)).rejects.toThrow(
      "No text content in response"
    );
  });
});

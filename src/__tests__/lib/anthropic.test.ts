/**
 * @jest-environment node
 */

// Mock Anthropic SDK - declare mockCreate before using it in the mock
const mockCreate = jest.fn();

jest.mock("@anthropic-ai/sdk", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: (...args: unknown[]) => mockCreate(...args),
      },
    })),
  };
});

import { generateTarotInterpretation, generateDailyInterpretation } from "@/lib/anthropic";

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
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "Your reading shows a journey..." }],
    });

    const result = await generateTarotInterpretation(baseRequest);

    expect(result).toBe("Your reading shows a journey...");
  });

  it("calls Anthropic API with correct model and max_tokens", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "Interpretation..." }],
    });

    await generateTarotInterpretation(baseRequest);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
      })
    );
  });

  it("uses English system prompt for locale 'en'", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "Interpretation..." }],
    });

    await generateTarotInterpretation({ ...baseRequest, locale: "en" });

    const call = mockCreate.mock.calls[0][0];
    expect(call.system).toContain("You are a wise and warm tarot guide");
    expect(call.system).toContain("Always respond in English");
  });

  it("uses Spanish system prompt for locale 'es'", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "Interpretación..." }],
    });

    await generateTarotInterpretation({ ...baseRequest, locale: "es" });

    const call = mockCreate.mock.calls[0][0];
    expect(call.system).toContain("Eres una guía de tarot sabia y cálida");
    expect(call.system).toContain("Responde siempre en español");
  });

  it("includes card details in user prompt", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "Interpretation..." }],
    });

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
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "Interpretation..." }],
    });

    await generateTarotInterpretation(baseRequest);

    const call = mockCreate.mock.calls[0][0];
    expect(call.messages[0].content).toContain("What should I focus on this week?");
  });

  it("throws error if no text content in response", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "image", source: {} }], // No text block
    });

    await expect(generateTarotInterpretation(baseRequest)).rejects.toThrow(
      "No text content in response"
    );
  });

  it("handles empty content array", async () => {
    mockCreate.mockResolvedValue({
      content: [],
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
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "Good morning, Maria! The Sun shines..." }],
    });

    const result = await generateDailyInterpretation(baseRequest);

    expect(result).toBe("Good morning, Maria! The Sun shines...");
  });

  it("uses Haiku model for cost efficiency", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "Daily message..." }],
    });

    await generateDailyInterpretation(baseRequest);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 500,
      })
    );
  });

  it("includes user name and zodiac sign in prompt", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "Daily message..." }],
    });

    await generateDailyInterpretation(baseRequest);

    const call = mockCreate.mock.calls[0][0];
    expect(call.messages[0].content).toContain("Maria");
    expect(call.messages[0].content).toContain("Leo");
  });

  it("uses English card name for English locale", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "Daily message..." }],
    });

    await generateDailyInterpretation({ ...baseRequest, locale: "en" });

    const call = mockCreate.mock.calls[0][0];
    expect(call.messages[0].content).toContain("The Sun");
  });

  it("uses Spanish card name for Spanish locale", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "Mensaje diario..." }],
    });

    await generateDailyInterpretation({ ...baseRequest, locale: "es" });

    const call = mockCreate.mock.calls[0][0];
    expect(call.messages[0].content).toContain("El Sol");
  });

  it("indicates reversed card in prompt", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "Daily message..." }],
    });

    await generateDailyInterpretation({ ...baseRequest, isReversed: true });

    const call = mockCreate.mock.calls[0][0];
    expect(call.messages[0].content).toContain("(reversed)");
  });

  it("maps focus areas correctly", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "Daily message..." }],
    });

    await generateDailyInterpretation({ ...baseRequest, focusArea: "love" });

    const call = mockCreate.mock.calls[0][0];
    expect(call.messages[0].content).toContain("love and relationships");
  });

  it("defaults to general focus area for unknown values", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "Daily message..." }],
    });

    await generateDailyInterpretation({ ...baseRequest, focusArea: "unknown" });

    const call = mockCreate.mock.calls[0][0];
    expect(call.messages[0].content).toContain("general life guidance");
  });

  it("throws error if no text content in response", async () => {
    mockCreate.mockResolvedValue({
      content: [],
    });

    await expect(generateDailyInterpretation(baseRequest)).rejects.toThrow(
      "No text content in response"
    );
  });
});

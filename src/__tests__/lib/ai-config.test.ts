/**
 * @jest-environment node
 */

const mockCreate = jest.fn();
const mockConstructor = jest.fn();

jest.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((options: unknown) => {
    mockConstructor(options);
    return {
      beta: {
        messages: {
          create: (...args: unknown[]) => mockCreate(...args),
        },
      },
    };
  }),
}));

import {
  AI_DEFAULT_EFFORT,
  AI_MODELS,
  AIRefusalError,
  AIUnavailableError,
  complete,
  getAnthropicClient,
} from "@/lib/ai/config";

const base = { system: "You are a tarot guide.", user: "What do the cards say?" };

describe("complete", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("returns the text of the answer", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "thinking", thinking: "" },
        { type: "text", text: "The cards speak of change." },
      ],
      stop_reason: "end_turn",
    });

    await expect(complete({ ...base, model: "claude-opus-5-5" })).resolves.toBe(
      "The cards speak of change."
    );
  });

  it("sends system, user message and the default max_tokens", async () => {
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" });

    await complete({ ...base, model: "claude-opus-5-5" });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-opus-5-5",
        max_tokens: 4000,
        system: base.system,
        messages: [{ role: "user", content: base.user }],
      })
    );
  });

  it("uses the reading model when no model is given", async () => {
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" });

    await complete(base);

    expect(mockCreate.mock.calls[0][0].model).toBe(AI_MODELS.reading);
  });

  it("sends effort and server-side fallback for Opus, and never sends thinking", async () => {
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" });

    await complete({ ...base, model: "claude-opus-5-5", effort: "medium" });

    const params = mockCreate.mock.calls[0][0];
    expect(params.output_config).toEqual({ effort: "medium" });
    expect(params.betas).toEqual(["server-side-fallback-2026-07-01"]);
    expect(params.fallbacks).toBe("default");
    expect(params).not.toHaveProperty("thinking");
  });

  it("uses the default effort when none is given", async () => {
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" });

    await complete({ ...base, model: "claude-opus-5-5" });

    expect(mockCreate.mock.calls[0][0].output_config).toEqual({ effort: AI_DEFAULT_EFFORT });
  });

  it("omits output_config, thinking and fallbacks for Haiku", async () => {
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" });

    await complete({ ...base, model: "claude-haiku-4-5", effort: "high" });

    const params = mockCreate.mock.calls[0][0];
    expect(params).not.toHaveProperty("output_config");
    expect(params).not.toHaveProperty("thinking");
    expect(params).not.toHaveProperty("fallbacks");
    expect(params).not.toHaveProperty("betas");
  });

  it("sends effort but no fallbacks for non-Opus, non-Haiku models", async () => {
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" });

    await complete({ ...base, model: "claude-sonnet-5-5", effort: "low" });

    const params = mockCreate.mock.calls[0][0];
    expect(params.output_config).toEqual({ effort: "low" });
    expect(params).not.toHaveProperty("fallbacks");
  });

  it("throws AIRefusalError when stop_reason is refusal", async () => {
    mockCreate.mockResolvedValue({
      content: [],
      stop_reason: "refusal",
      stop_details: { type: "refusal", category: "general_harms", explanation: null },
    });

    const promise = complete({ ...base, model: "claude-opus-5-5" });
    await expect(promise).rejects.toBeInstanceOf(AIRefusalError);
    await expect(promise).rejects.toMatchObject({ category: "general_harms" });
  });

  it("wraps SDK errors in AIUnavailableError and keeps the cause", async () => {
    const sdkError = Object.assign(new Error("529 Overloaded"), { status: 529 });
    mockCreate.mockRejectedValue(sdkError);

    const promise = complete({ ...base, model: "claude-opus-5-5" });
    await expect(promise).rejects.toBeInstanceOf(AIUnavailableError);
    await expect(promise).rejects.toMatchObject({ cause: sdkError });
  });

  it("throws AIUnavailableError when the answer has no text", async () => {
    mockCreate.mockResolvedValue({ content: [{ type: "thinking", thinking: "" }], stop_reason: "end_turn" });

    const promise = complete({ ...base, model: "claude-opus-5-5" });
    await expect(promise).rejects.toBeInstanceOf(AIUnavailableError);
    await expect(promise).rejects.toThrow("No text content in response");
  });

  it("keeps only the text after the last fallback block", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: "partial text from the model that declined" },
        {
          type: "fallback",
          from: { model: "claude-opus-5-5" },
          to: { model: "claude-opus-5" },
          trigger: { type: "refusal", category: null },
        },
        { type: "text", text: "Answer from the fallback model." },
      ],
      stop_reason: "end_turn",
    });

    await expect(complete({ ...base, model: "claude-opus-5-5" })).resolves.toBe(
      "Answer from the fallback model."
    );
  });
});

/** Fresh copy of the module (re-reads env, new client singleton). */
const loadConfig = () => {
  let config: typeof import("@/lib/ai/config") | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    config = require("@/lib/ai/config");
  });
  return config!;
};

describe("getAnthropicClient", () => {
  it("is the client complete() uses", () => {
    expect(getAnthropicClient()).toBe(getAnthropicClient());
  });

  it("creates a single client with a 50 s timeout and one retry", () => {
    const config = loadConfig();
    mockConstructor.mockClear();

    const first = config.getAnthropicClient();
    const second = config.getAnthropicClient();

    expect(first).toBe(second);
    expect(mockConstructor).toHaveBeenCalledTimes(1);
    expect(mockConstructor).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 50_000, maxRetries: 1 })
    );
  });
});

describe("AI configuration from env", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("defaults to Opus 5.5 for readings and synthesis, Haiku 4.5 for the daily card, low effort", () => {
    delete process.env.ARCANA_MODEL_READING;
    delete process.env.ARCANA_MODEL_DAILY;
    delete process.env.ARCANA_MODEL_SYNTHESIS;
    delete process.env.ARCANA_AI_EFFORT;

    const config = loadConfig();
    expect(config.AI_MODELS).toEqual({
      reading: "claude-opus-5-5",
      daily: "claude-haiku-4-5",
      synthesis: "claude-opus-5-5",
    });
    expect(config.AI_DEFAULT_EFFORT).toBe("low");
  });

  it("reads models and effort from env, ignoring blank and invalid values", () => {
    process.env.ARCANA_MODEL_READING = "claude-sonnet-5-5";
    process.env.ARCANA_MODEL_DAILY = "  ";
    process.env.ARCANA_AI_EFFORT = "HIGH";

    const config = loadConfig();
    expect(config.AI_MODELS.reading).toBe("claude-sonnet-5-5");
    expect(config.AI_MODELS.daily).toBe("claude-haiku-4-5");
    expect(config.AI_DEFAULT_EFFORT).toBe("high");

    process.env.ARCANA_AI_EFFORT = "max";
    expect(loadConfig().AI_DEFAULT_EFFORT).toBe("low");
  });
});

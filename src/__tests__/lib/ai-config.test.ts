/**
 * @jest-environment node
 */

const mockCreate = jest.fn();
const mockConstructor = jest.fn();

jest.mock("@anthropic-ai/sdk", () => {
  // The real error classes: complete() decides its single retry with instanceof.
  const actual = jest.requireActual("@anthropic-ai/sdk");
  return {
    __esModule: true,
    APIError: actual.APIError,
    APIConnectionError: actual.APIConnectionError,
    APIConnectionTimeoutError: actual.APIConnectionTimeoutError,
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
  };
});

import { APIConnectionError, APIConnectionTimeoutError, APIError } from "@anthropic-ai/sdk";
import {
  AI_DEFAULT_EFFORT,
  AI_FAST_FAILURE_MS,
  AI_MODELS,
  AI_TIMEOUT_MS,
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
      }),
      { timeout: 45_000 }
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

describe("complete: time budget and the single fast retry (F-90)", () => {
  const ok = { content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" };
  const overloaded = () =>
    APIError.generate(529, { type: "error", error: { type: "overloaded_error", message: "Overloaded" } }, undefined, new Headers());

  beforeEach(() => {
    mockCreate.mockReset();
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("stays under Vercel's 60 s: one 45 s attempt, retries only failures under 5 s", () => {
    expect(AI_TIMEOUT_MS).toBe(45_000);
    expect(AI_FAST_FAILURE_MS).toBe(5_000);
    expect(AI_FAST_FAILURE_MS + AI_TIMEOUT_MS).toBeLessThan(60_000);
  });

  it("passes timeoutMs to the SDK as the per-request timeout", async () => {
    mockCreate.mockResolvedValue(ok);

    await complete({ ...base, model: "claude-haiku-4-5", timeoutMs: 15_000 });

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: "claude-haiku-4-5" }), {
      timeout: 15_000,
    });
  });

  it("retries a fast 529 exactly once and returns the second answer", async () => {
    mockCreate.mockRejectedValueOnce(overloaded()).mockResolvedValueOnce(ok);

    await expect(complete({ ...base, model: "claude-opus-5-5" })).resolves.toBe("ok");
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockCreate.mock.calls[1]).toEqual(mockCreate.mock.calls[0]);
  });

  it("gives up after the one retry", async () => {
    const second = overloaded();
    mockCreate.mockRejectedValueOnce(overloaded()).mockRejectedValueOnce(second).mockResolvedValue(ok);

    const promise = complete({ ...base, model: "claude-opus-5-5" });
    await expect(promise).rejects.toBeInstanceOf(AIUnavailableError);
    await expect(promise).rejects.toMatchObject({ cause: second });
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["a connection error", () => new APIConnectionError({ message: "socket hang up" })],
    ["a 429", () => APIError.generate(429, { type: "error", error: { type: "rate_limit_error" } }, undefined, new Headers())],
    ["a 500", () => APIError.generate(500, { type: "error", error: { type: "api_error" } }, undefined, new Headers())],
    ["a 408", () => APIError.generate(408, undefined, "Request Timeout", new Headers())],
    ["a 409", () => APIError.generate(409, undefined, "Conflict", new Headers())],
  ])("retries %s that fails fast", async (_label, makeError) => {
    mockCreate.mockRejectedValueOnce(makeError()).mockResolvedValueOnce(ok);

    await expect(complete({ ...base, model: "claude-opus-5-5" })).resolves.toBe("ok");
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("never retries a timeout", async () => {
    const timeout = new APIConnectionTimeoutError();
    mockCreate.mockRejectedValueOnce(timeout).mockResolvedValue(ok);

    const promise = complete({ ...base, model: "claude-opus-5-5" });
    await expect(promise).rejects.toBeInstanceOf(AIUnavailableError);
    await expect(promise).rejects.toMatchObject({ cause: timeout });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("does not retry a retryable error that took 5 s or more", async () => {
    const now = jest.spyOn(Date, "now");
    now.mockReturnValueOnce(1_000_000).mockReturnValueOnce(1_000_000 + AI_FAST_FAILURE_MS);
    mockCreate.mockRejectedValueOnce(overloaded()).mockResolvedValue(ok);

    await expect(complete({ ...base, model: "claude-opus-5-5" })).rejects.toBeInstanceOf(AIUnavailableError);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["a 400", () => APIError.generate(400, { type: "error", error: { type: "invalid_request_error" } }, undefined, new Headers())],
    ["a 401", () => APIError.generate(401, { type: "error", error: { type: "authentication_error" } }, undefined, new Headers())],
    ["a plain error", () => new Error("boom")],
  ])("does not retry %s", async (_label, makeError) => {
    mockCreate.mockRejectedValueOnce(makeError()).mockResolvedValue(ok);

    await expect(complete({ ...base, model: "claude-opus-5-5" })).rejects.toBeInstanceOf(AIUnavailableError);
    expect(mockCreate).toHaveBeenCalledTimes(1);
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

  it("creates a single client with a 45 s timeout and no SDK retries (F-90)", () => {
    const config = loadConfig();
    mockConstructor.mockClear();

    const first = config.getAnthropicClient();
    const second = config.getAnthropicClient();

    expect(first).toBe(second);
    expect(mockConstructor).toHaveBeenCalledTimes(1);
    expect(mockConstructor).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 45_000, maxRetries: 0 })
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

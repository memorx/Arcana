import Anthropic from "@anthropic-ai/sdk";

/**
 * Central place for every Claude call in Arcana: which model each feature uses,
 * the shared client, and a single `complete()` helper with refusal and error
 * handling. Model IDs live only in this file.
 */

/** Treats unset or blank env vars as missing so a stray "" never reaches the API. */
function envOr(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

export const AI_MODELS = {
  reading: envOr("ARCANA_MODEL_READING", "claude-opus-5-5"),
  daily: envOr("ARCANA_MODEL_DAILY", "claude-haiku-4-5"),
  synthesis: envOr("ARCANA_MODEL_SYNTHESIS", "claude-opus-5-5"),
};

export type AIEffort = "low" | "medium" | "high";

const AI_EFFORTS: readonly AIEffort[] = ["low", "medium", "high"];

function parseEffort(value: string | undefined): AIEffort {
  const normalized = value?.trim().toLowerCase();
  return AI_EFFORTS.find((effort) => effort === normalized) ?? "low";
}

/** Default effort for models that accept `output_config.effort` (ARCANA_AI_EFFORT, default "low"). */
export const AI_DEFAULT_EFFORT: AIEffort = parseEffort(process.env.ARCANA_AI_EFFORT);

/** Default output budget. On thinking models the thinking tokens count inside it. */
export const AI_DEFAULT_MAX_TOKENS = 4000;

/** Server-side fallback: if the requested model declines, the API retries on its default fallback. */
const SERVER_SIDE_FALLBACK_BETA = "server-side-fallback-2026-07-01";

/** The model declined the request (`stop_reason: "refusal"`), including every fallback. */
export class AIRefusalError extends Error {
  readonly category: string | null;

  constructor(message = "The model declined to answer", category: string | null = null) {
    super(message);
    this.name = "AIRefusalError";
    this.category = category;
  }
}

/** The model could not produce an answer (network, timeout, 4xx/5xx, overload, empty response). */
export class AIUnavailableError extends Error {
  constructor(message = "AI service unavailable", options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AIUnavailableError";
  }
}

let client: Anthropic | null = null;

/** Shared client. Created lazily so importing this module never needs the API key. */
export function getAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      timeout: 50_000, // stay under Vercel's 60 s function limit
      maxRetries: 1,
    });
  }
  return client;
}

type BetaContent = Anthropic.Beta.BetaMessage["content"];

/**
 * Text of the answer. When a fallback happened, the content before the last
 * `fallback` block belongs to the model that declined, so only what follows it
 * is the answer.
 */
function extractText(content: BetaContent): string {
  let start = 0;
  content.forEach((block, index) => {
    if (block.type === "fallback") start = index + 1;
  });

  return content
    .slice(start)
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

export interface CompleteOptions {
  system: string;
  user: string;
  model?: string;
  maxTokens?: number;
  effort?: AIEffort;
}

/**
 * One text completion.
 * - Haiku models get neither `output_config` nor `thinking`.
 * - Every other model gets `output_config: { effort }` and keeps its default
 *   (adaptive) thinking; `thinking` is never sent.
 * - Opus models opt into server-side fallback on refusals.
 *
 * Throws AIRefusalError on `stop_reason: "refusal"` and wraps any SDK error
 * (or an empty answer) in AIUnavailableError.
 */
export async function complete(opts: CompleteOptions): Promise<string> {
  const model = opts.model ?? AI_MODELS.reading;
  const isHaiku = model.startsWith("claude-haiku");
  const isOpus = model.startsWith("claude-opus");

  let message: Anthropic.Beta.BetaMessage;
  try {
    message = await getAnthropicClient().beta.messages.create({
      model,
      max_tokens: opts.maxTokens ?? AI_DEFAULT_MAX_TOKENS,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
      ...(isHaiku ? {} : { output_config: { effort: opts.effort ?? AI_DEFAULT_EFFORT } }),
      ...(isOpus ? { betas: [SERVER_SIDE_FALLBACK_BETA], fallbacks: "default" as const } : {}),
    });
  } catch (error) {
    throw new AIUnavailableError(
      error instanceof Error ? `Anthropic request failed: ${error.message}` : "Anthropic request failed",
      { cause: error }
    );
  }

  if (message.stop_reason === "refusal") {
    throw new AIRefusalError(undefined, message.stop_details?.category ?? null);
  }

  const text = extractText(message.content);
  if (!text.trim()) {
    throw new AIUnavailableError("No text content in response");
  }

  if (message.stop_reason === "max_tokens") {
    console.warn(`[AI] ${model} hit max_tokens; the answer may be truncated`);
  }

  return text;
}

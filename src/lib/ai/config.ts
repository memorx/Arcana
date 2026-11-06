import Anthropic, { APIConnectionError, APIConnectionTimeoutError, APIError } from "@anthropic-ai/sdk";

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

/**
 * Time budget of one request. A Vercel function has 60 s (maxDuration); a 12-card reading
 * takes 32–35 s on Opus 5.5, so 45 s leaves room for the rest of the route. The SDK never
 * retries on its own (maxRetries 0): a timeout plus a second 45 s attempt would pass 60 s.
 */
export const AI_TIMEOUT_MS = 45_000;

/** Only a first attempt that failed this fast, for a retryable cause, gets one more try. */
export const AI_FAST_FAILURE_MS = 5_000;

/** Pause before that single retry (gives a 429/529 a moment). */
export const AI_RETRY_DELAY_MS = 500;

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
      timeout: AI_TIMEOUT_MS,
      maxRetries: 0, // complete() decides the (single, fast) retry itself
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
  /** Per-call time budget in ms (default AI_TIMEOUT_MS), passed to the SDK as `{ timeout }`. */
  timeoutMs?: number;
}

/**
 * Worth one more try: a connection error or a 408/409/429/5xx answer.
 * Never a timeout (that attempt already used the whole budget) nor a user abort.
 */
function isRetryable(error: unknown): boolean {
  if (error instanceof APIConnectionTimeoutError) return false;
  if (error instanceof APIConnectionError) return true;
  if (error instanceof APIError) {
    const status = error.status;
    return status === 408 || status === 409 || status === 429 || (typeof status === "number" && status >= 500);
  }
  return false;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Fake mode (local e2e only)
// ---------------------------------------------------------------------------

/**
 * Fixed answers instead of Claude, for the local e2e database (`.env.e2e`).
 * On with `ARCANA_AI_FAKE=1` and NEVER on Vercel: the check is `VERCEL`, not
 * `NODE_ENV`, because the e2e server is a production build (`next start`).
 * `.env.e2e` also carries an invalid API key as a second lock.
 */
export function isAIFakeMode(env: Record<string, string | undefined> = process.env): boolean {
  return env.ARCANA_AI_FAKE === "1" && !env.VERCEL;
}

type FakeKind = "synthesis" | "compatibility" | "recap" | "followup" | "daily" | "reading";

/** Which feature wrote this system prompt (most specific first: several share the tarot-guide intro). */
function fakeKind(system: string): FakeKind {
  if (/Mapa Arcano|Arcana Map/.test(system)) return "synthesis";
  if (/vínculo entre dos personas|bond between two people/.test(system)) return "compatibility";
  if (/Tu mes en cartas|Your month in cards/.test(system)) return "recap";
  if (/pregunta de seguimiento|follow-up question/.test(system)) return "followup";
  if (/mensajes diarios|daily messages/.test(system)) return "daily";
  return "reading";
}

/** Every Spanish system prompt opens with «Eres…»; the English ones with "You are…". */
function fakeLocale(system: string): "es" | "en" {
  return /^\s*Eres\b/.test(system) || /Responde siempre en español/.test(system) ? "es" : "en";
}

/**
 * Plausible fixed texts, shaped like the real ones: prose for readings, daily,
 * follow-ups and recaps; the synthesis is 4 lines + 2 closing questions (what
 * `splitSynthesis` expects); the reading for two has its 4 titled parts.
 */
export const FAKE_AI_TEXTS: Record<"es" | "en", Record<FakeKind, string>> = {
  es: {
    reading: [
      "Tu pregunta ya trae algo en movimiento: las cartas no te dan una respuesta cerrada, te la devuelven con más luz.",
      "En conjunto, la tirada habla de un tránsito: algo que se suelta y algo que todavía no termina de tomar forma. Hay calma en las cartas y también una invitación a moverte.",
      "La primera carta muestra de dónde vienes; la segunda, lo que hoy pide tu atención; la tercera, el rumbo que se abre si sigues escuchando lo que ya sabes. Juntas conversan como tres momentos de una misma historia.",
      "Llévate esto al día: un paso pequeño vale más que una certeza grande. ¿Qué te dirías si no tuvieras miedo de equivocarte?",
    ].join("\n\n"),
    daily: [
      "Buenos días. La carta de hoy llega con una idea sencilla: no todo se resuelve empujando.",
      "Su mensaje central es la paciencia activa: observar antes de decidir y darle a cada cosa su tiempo. Hoy la energía del día acompaña a quien escucha.",
      "En tu área de enfoque, prueba con un gesto pequeño y concreto: una conversación pendiente, una pausa antes de contestar. Que el día te encuentre presente.",
    ].join("\n\n"),
    followup: [
      "Buena pregunta. Si vuelves a mirar las cartas de esta tirada, la respuesta está en cómo se hablan entre sí: la primera abre el tema y la última lo deja en tus manos.",
      "No hace falta decidir todo hoy. Quédate con el gesto que te propone la carta central y observa qué cambia cuando lo practicas unos días.",
    ].join("\n\n"),
    recap: [
      "Este mes tus preguntas volvieron una y otra vez al mismo lugar: cómo cuidar lo que empieza sin apretarlo demasiado.",
      "Las cartas que se repitieron hablan de ciclos y de paciencia; juntas sugieren un mes de siembra más que de cosecha.",
      "Lo que resonó contigo apunta a la misma idea: confiar en el ritmo propio. ¿Qué quieres dejar crecer el mes que empieza?",
    ].join("\n\n"),
    synthesis: [
      "Cuando se leen juntos, los cinco sistemas dibujan a alguien que aprende haciendo y que necesita espacio para decidir a su ritmo.",
      "El zodiaco occidental y la numerología coinciden en una mente inquieta que busca sentido; el tonalli suma raíz y constancia.",
      "La tensión aparece entre el impulso de empezar y la paciencia que piden tus cartas natales: ahí hay una fuerza si dejas que convivan.",
      "En la tradición mexica, tu signo del día habla de cuidar el fuego propio sin quemar lo que te rodea.",
      "¿Qué empezarías este año si no tuvieras que terminarlo de inmediato?",
      "¿A quién le pedirías ayuda para sostener lo que ya comenzaste?",
    ].join("\n"),
    compatibility: [
      "Cómo se encuentran",
      "Las tres cartas dibujan un encuentro de ritmos distintos que se complementan: una parte propone y la otra sostiene. Los sistemas coinciden en que hay curiosidad mutua y ganas de aprender.",
      "Qué se piden",
      "Una busca claridad y palabras; la otra, tiempo y gestos. Ninguna de las dos necesidades es menor: piden ser nombradas.",
      "Qué cuidar",
      "La tensión principal está en las prisas. Prueben acordar un momento de la semana sólo para escucharse, sin resolver nada.",
      "Una pregunta para los dos",
      "¿Qué quieren construir juntos que ninguno podría construir por separado?",
    ].join("\n\n"),
  },
  en: {
    reading: [
      "Your question already carries something in motion: the cards don't hand you a closed answer, they give it back with more light.",
      "Taken together, the spread speaks of a passage: something being released and something still taking shape. There is calm in these cards, and an invitation to move.",
      "The first card shows where you come from; the second, what asks for your attention today; the third, the path that opens if you keep listening to what you already know. Together they talk like three moments of one story.",
      "Take this into your day: a small step is worth more than a big certainty. What would you tell yourself if you weren't afraid of being wrong?",
    ].join("\n\n"),
    daily: [
      "Good morning. Today's card arrives with a simple idea: not everything is solved by pushing.",
      "Its central message is active patience: observe before deciding and give each thing its time. Today's energy is on the side of whoever listens.",
      "In your focus area, try one small, concrete gesture: a pending conversation, a pause before answering. May the day find you present.",
    ].join("\n\n"),
    followup: [
      "Good question. If you look again at the cards of this spread, the answer is in how they speak to each other: the first opens the topic and the last leaves it in your hands.",
      "You don't need to decide everything today. Keep the gesture the central card proposes and notice what changes when you practice it for a few days.",
    ].join("\n\n"),
    recap: [
      "This month your questions kept coming back to the same place: how to care for what is beginning without holding it too tight.",
      "The cards that repeated speak of cycles and patience; together they suggest a month of sowing more than harvest.",
      "What resonated with you points to the same idea: trusting your own rhythm. What do you want to let grow in the month ahead?",
    ].join("\n\n"),
    synthesis: [
      "Read together, the five systems draw someone who learns by doing and needs room to decide at their own pace.",
      "The Western zodiac and numerology agree on a restless mind looking for meaning; the tonalli adds roots and steadiness.",
      "The tension lies between the urge to begin and the patience your birth cards ask for: there is strength there if you let them live together.",
      "In the Mexica tradition, your day sign speaks of tending your own fire without burning what surrounds you.",
      "What would you begin this year if you didn't have to finish it right away?",
      "Who would you ask for help to hold what you have already started?",
    ].join("\n"),
    compatibility: [
      "How you meet",
      "The three cards draw a meeting of different rhythms that complement each other: one proposes and the other sustains. The systems agree on mutual curiosity and a wish to learn.",
      "What you ask of each other",
      "One looks for clarity and words; the other, for time and gestures. Neither need is smaller: they ask to be named.",
      "What to take care of",
      "The main tension is haste. Try agreeing on one moment a week just to listen to each other, without solving anything.",
      "A question for both of you",
      "What do you want to build together that neither of you could build alone?",
    ].join("\n\n"),
  },
};

/** The fixed answer for a request (never touches the network). */
export function fakeCompletion(opts: Pick<CompleteOptions, "system">): string {
  return FAKE_AI_TEXTS[fakeLocale(opts.system)][fakeKind(opts.system)];
}

/**
 * One text completion.
 * - Haiku models get neither `output_config` nor `thinking`.
 * - Every other model gets `output_config: { effort }` and keeps its default
 *   (adaptive) thinking; `thinking` is never sent.
 * - Opus models opt into server-side fallback on refusals.
 *
 * Time budget: one request of `timeoutMs` (default 45 s). If it fails in under
 * AI_FAST_FAILURE_MS for a retryable cause (connection, 408/409/429/5xx) it is
 * retried once; a timeout is never retried.
 *
 * Throws AIRefusalError on `stop_reason: "refusal"` and wraps any SDK error
 * (or an empty answer) in AIUnavailableError.
 */
export async function complete(opts: CompleteOptions): Promise<string> {
  if (isAIFakeMode()) {
    return fakeCompletion(opts);
  }

  const model = opts.model ?? AI_MODELS.reading;
  const isHaiku = model.startsWith("claude-haiku");
  const isOpus = model.startsWith("claude-opus");

  const send = () =>
    getAnthropicClient().beta.messages.create(
      {
        model,
        max_tokens: opts.maxTokens ?? AI_DEFAULT_MAX_TOKENS,
        system: opts.system,
        messages: [{ role: "user", content: opts.user }],
        ...(isHaiku ? {} : { output_config: { effort: opts.effort ?? AI_DEFAULT_EFFORT } }),
        ...(isOpus ? { betas: [SERVER_SIDE_FALLBACK_BETA], fallbacks: "default" as const } : {}),
      },
      { timeout: opts.timeoutMs ?? AI_TIMEOUT_MS }
    );

  const unavailable = (error: unknown) =>
    new AIUnavailableError(
      error instanceof Error ? `Anthropic request failed: ${error.message}` : "Anthropic request failed",
      { cause: error }
    );

  let message: Anthropic.Beta.BetaMessage;
  const startedAt = Date.now();
  try {
    message = await send();
  } catch (firstError) {
    if (!isRetryable(firstError) || Date.now() - startedAt >= AI_FAST_FAILURE_MS) {
      throw unavailable(firstError);
    }
    console.warn(`[AI] ${model} failed fast (${firstError instanceof Error ? firstError.message : "error"}); retrying once`);
    await sleep(AI_RETRY_DELAY_MS);
    try {
      message = await send();
    } catch (secondError) {
      throw unavailable(secondError);
    }
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

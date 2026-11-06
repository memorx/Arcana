/**
 * @jest-environment node
 *
 * Fake AI mode (PLAN 2026-11-05 §5.1): fixed texts for the local e2e base,
 * switched on by ARCANA_AI_FAKE=1 and never on Vercel.
 */

const mockCreate = jest.fn();

jest.mock("@anthropic-ai/sdk", () => {
  const actual = jest.requireActual("@anthropic-ai/sdk");
  return {
    __esModule: true,
    APIError: actual.APIError,
    APIConnectionError: actual.APIConnectionError,
    APIConnectionTimeoutError: actual.APIConnectionTimeoutError,
    default: jest.fn().mockImplementation(() => ({
      beta: { messages: { create: (...args: unknown[]) => mockCreate(...args) } },
    })),
  };
});

import { FAKE_AI_TEXTS, complete, fakeCompletion, isAIFakeMode } from "@/lib/ai/config";
import { buildBlueprintSynthesisPrompt } from "@/lib/ai/blueprint-synthesis";
import { buildCompatibilityPrompt } from "@/lib/ai/compatibility";
import { buildFollowUpPrompt } from "@/lib/ai/followup";
import { buildMonthlyRecapPrompt } from "@/lib/ai/monthly-recap";
import { splitSynthesis } from "@/components/blueprint/synthesis-blocks";
import { computeCompatibility, toTextBlocks } from "@/lib/compatibility";
import { getArcanaBlueprint } from "@/lib/systems";
import {
  FAKE_FRASE_DIARIA,
  FAKE_FRASE_LECTURA,
  FAKE_FRASE_SINTESIS,
  FAKE_TITULO_VINCULO,
} from "../../../e2e/flujos/comun";

const ENV_KEYS = ["ARCANA_AI_FAKE", "VERCEL", "NODE_ENV"] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  mockCreate.mockReset();
  for (const key of ENV_KEYS) saved[key] = process.env[key];
});

afterEach(() => {
  const env = process.env as Record<string, string | undefined>;
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete env[key];
    else env[key] = saved[key];
  }
});

function setEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>) {
  const env = process.env as Record<string, string | undefined>;
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
}

describe("isAIFakeMode", () => {
  it("is on with ARCANA_AI_FAKE=1 outside Vercel", () => {
    expect(isAIFakeMode({ ARCANA_AI_FAKE: "1" })).toBe(true);
  });

  it("stays on in a production build outside Vercel (next start for e2e)", () => {
    expect(isAIFakeMode({ ARCANA_AI_FAKE: "1", NODE_ENV: "production" })).toBe(true);
  });

  it.each(["1", "0", "true"])("is NEVER on when VERCEL=%p (any non-empty value counts as Vercel)", (vercel) => {
    expect(isAIFakeMode({ ARCANA_AI_FAKE: "1", VERCEL: vercel })).toBe(false);
    expect(isAIFakeMode({ ARCANA_AI_FAKE: "1", VERCEL: vercel, NODE_ENV: "development" })).toBe(false);
  });

  it.each([undefined, "", "0", "true", "yes"])("is off when ARCANA_AI_FAKE=%p", (value) => {
    expect(isAIFakeMode({ ARCANA_AI_FAKE: value })).toBe(false);
  });
});

describe("complete() in fake mode", () => {
  it("with VERCEL=1 it never fakes, even with ARCANA_AI_FAKE=1: the real API is called", async () => {
    setEnv({ ARCANA_AI_FAKE: "1", VERCEL: "1", NODE_ENV: "production" });
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: "real answer" }], stop_reason: "end_turn" });

    await expect(complete({ system: "Eres una guía de tarot sabia y cálida.", user: "¿Qué dicen?" })).resolves.toBe(
      "real answer"
    );
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("without the flag it calls the real API", async () => {
    setEnv({ ARCANA_AI_FAKE: undefined, VERCEL: undefined });
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: "real answer" }], stop_reason: "end_turn" });

    await expect(complete({ system: "You are a tarot guide.", user: "Hi" })).resolves.toBe("real answer");
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("with the flag outside Vercel it answers without touching the network", async () => {
    setEnv({ ARCANA_AI_FAKE: "1", VERCEL: undefined });

    const text = await complete({ system: "Eres una guía de tarot sabia y cálida.", user: "¿Qué dicen?" });
    expect(text).toBe(FAKE_AI_TEXTS.es.reading);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("fakeCompletion: shape and language per feature", () => {
  const myBirth = new Date(Date.UTC(1990, 4, 17));
  const bp = getArcanaBlueprint(myBirth, "Ana López");

  it.each(["es", "en"] as const)("Arcana Map synthesis (%s): 4 lines + 2 closing questions", (locale) => {
    const text = fakeCompletion(buildBlueprintSynthesisPrompt(bp, locale));
    expect(text).toBe(FAKE_AI_TEXTS[locale].synthesis);

    const blocks = splitSynthesis(text);
    expect(blocks.filter((b) => b.kind === "paragraph")).toHaveLength(4);
    expect(blocks.filter((b) => b.kind === "question")).toHaveLength(2);
    expect(blocks.slice(-2).every((b) => b.kind === "question")).toBe(true);
  });

  it.each(["es", "en"] as const)("reading for two (%s): four titled parts, the last one a question", (locale) => {
    const { system, user } = buildCompatibilityPrompt({
      locale,
      myName: "Ana",
      partnerName: "Luis",
      myBlueprint: "map a",
      partnerBlueprint: "map b",
      compatibility: computeCompatibility(
        { birthDate: myBirth, fullName: "Ana López" },
        { birthDate: new Date(Date.UTC(1988, 10, 2)), fullName: null }
      ),
      cards: [
        { role: "me", name: "The Fool", isReversed: false },
        { role: "partner", name: "The Star", isReversed: true },
        { role: "bond", name: "Two of Cups", isReversed: false },
      ],
    });
    const text = fakeCompletion({ system });
    expect(user).toContain("Luis");
    expect(text).toBe(FAKE_AI_TEXTS[locale].compatibility);

    const blocks = toTextBlocks(text);
    expect(blocks.filter((b) => b.type === "heading")).toHaveLength(4);
    expect(blocks[blocks.length - 1]).toMatchObject({ type: "paragraph" });
    expect(blocks[blocks.length - 1].text).toMatch(/\?$/);
  });

  it.each(["es", "en"] as const)("monthly recap (%s): prose that closes with a question", (locale) => {
    const { system } = buildMonthlyRecapPrompt({ year: 2026, month: 10, locale, readings: [] });
    const text = fakeCompletion({ system });
    expect(text).toBe(FAKE_AI_TEXTS[locale].recap);
    expect(text.split("\n\n").length).toBeGreaterThanOrEqual(3);
    expect(text.trim()).toMatch(/\?$/);
  });

  it.each(["es", "en"] as const)("follow-up (%s): two short paragraphs", (locale) => {
    const { system } = buildFollowUpPrompt({
      locale,
      spreadName: "Three cards",
      intention: "work",
      cards: [{ position: 1, positionName: "Past", cardName: "The Fool", isReversed: false }],
      interpretation: "…",
      previous: [],
      question: "And now?",
    });
    const text = fakeCompletion({ system });
    expect(text).toBe(FAKE_AI_TEXTS[locale].followup);
    expect(text.split("\n\n")).toHaveLength(2);
  });

  it("daily card and reading prompts get their own texts, in the prompt's language", () => {
    expect(fakeCompletion({ system: "Eres una guía de tarot sabia que ofrece mensajes diarios breves" })).toBe(
      FAKE_AI_TEXTS.es.daily
    );
    expect(fakeCompletion({ system: "You are a wise tarot guide offering brief but meaningful daily messages." })).toBe(
      FAKE_AI_TEXTS.en.daily
    );
    expect(fakeCompletion({ system: "You are a wise and warm tarot guide." })).toBe(FAKE_AI_TEXTS.en.reading);
    expect(fakeCompletion({ system: "Eres una guía de tarot sabia y cálida." })).toBe(FAKE_AI_TEXTS.es.reading);
  });

  it("no fake text uses Markdown", () => {
    for (const locale of ["es", "en"] as const) {
      for (const text of Object.values(FAKE_AI_TEXTS[locale])) {
        expect(text).not.toMatch(/[*#_`]/);
      }
    }
  });

  it("contains the phrases the e2e flows look for (e2e/flujos/comun.ts)", () => {
    expect(FAKE_AI_TEXTS.es.reading).toContain(FAKE_FRASE_LECTURA.es);
    expect(FAKE_AI_TEXTS.en.reading).toContain(FAKE_FRASE_LECTURA.en);
    expect(FAKE_AI_TEXTS.es.daily).toContain(FAKE_FRASE_DIARIA.es);
    expect(FAKE_AI_TEXTS.es.synthesis).toContain(FAKE_FRASE_SINTESIS.es);
    expect(FAKE_AI_TEXTS.es.compatibility).toContain(FAKE_TITULO_VINCULO.es);
  });
});

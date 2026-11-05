/**
 * @jest-environment node
 */
import { createHash } from "node:crypto";
import {
  BLUEPRINT_SYNTHESIS_MAX_TOKENS,
  blueprintInputsHash,
  buildBlueprintSynthesisPrompt,
  generateBlueprintSynthesis,
  getFirstName,
  toBlueprintLocale,
} from "@/lib/ai/blueprint-synthesis";
import { getArcanaBlueprint } from "@/lib/systems";

jest.mock("@/lib/ai/config", () => {
  const actual = jest.requireActual("@/lib/ai/config");
  return { ...actual, complete: jest.fn() };
});

import { AI_MODELS, complete } from "@/lib/ai/config";

const mockComplete = complete as jest.Mock;
const birthDate = new Date(Date.UTC(1990, 6, 15));
const onDate = new Date(Date.UTC(2026, 10, 4));
const bp = getArcanaBlueprint(birthDate, "  María José   Pérez ", onDate);

describe("buildBlueprintSynthesisPrompt", () => {
  it("includes the first name and the five systems (es)", () => {
    const { system, user } = buildBlueprintSynthesisPrompt(bp, "es");
    expect(user).toContain("Nombre: María");
    expect(user).not.toContain("Pérez");
    for (const system of ["Zodiaco occidental", "Zodiaco chino", "Tonalpohualli", "Numerología", "Cartas natales"]) {
      expect(user).toContain(system);
    }
    // The person's actual signs, not just the labels.
    expect(user).toContain("Cáncer");
    expect(user).toContain("Caballo de Metal");
    expect(user).toContain("12 Cóatl");
    expect(user).toContain("camino de vida 5");
    expect(user).toContain("El Hierofante");
    expect(system).toContain("Responde siempre en español");
    expect(system).toContain("espejo, no una bola de cristal");
    expect(system).toMatch(/Nada de predicciones/);
    expect(system).toMatch(/Tres preguntas para los próximos doce meses/);
  });

  it("includes the first name and the five systems (en)", () => {
    const { system, user } = buildBlueprintSynthesisPrompt(bp, "en");
    expect(user).toContain("Name: María");
    for (const system of ["Western zodiac", "Chinese zodiac", "Tonalpohualli", "Numerology", "Tarot birth cards"]) {
      expect(user).toContain(system);
    }
    expect(user).toContain("Cancer");
    expect(user).toContain("Metal Horse");
    expect(user).toContain("The Hierophant");
    expect(system).toContain("Always respond in English");
    expect(system).toContain("a mirror, not a crystal ball");
    expect(system).toMatch(/No predictions/);
    expect(system).toMatch(/Three questions for the next twelve months/);
  });

  it("asks for the four parts in order, in plain text", () => {
    for (const locale of ["es", "en"] as const) {
      const { system } = buildBlueprintSynthesisPrompt(bp, locale);
      const parts = ["1.", "2.", "3.", "4."].map((n) => system.indexOf(`\n${n} `));
      expect(parts.every((i) => i > 0)).toBe(true);
      expect([...parts].sort((a, b) => a - b)).toEqual(parts);
      expect(system).toMatch(/Markdown/);
    }
  });

  it("leaves the name line out when there is no name", () => {
    const anonymous = getArcanaBlueprint(birthDate, "   ", onDate);
    const { user } = buildBlueprintSynthesisPrompt(anonymous, "es");
    expect(user).not.toContain("Nombre:");
    expect(user).toContain("Mapa Arcano");
    expect(user).not.toMatch(/undefined|null|NaN/);
  });
});

describe("generateBlueprintSynthesis", () => {
  it("calls complete with the synthesis model, effort medium and 2500 tokens, and trims", async () => {
    mockComplete.mockResolvedValue("  Texto de la síntesis.\n");
    const text = await generateBlueprintSynthesis(bp, "es");
    expect(text).toBe("Texto de la síntesis.");
    expect(BLUEPRINT_SYNTHESIS_MAX_TOKENS).toBe(2500);
    expect(mockComplete).toHaveBeenCalledWith(
      expect.objectContaining({ model: AI_MODELS.synthesis, effort: "medium", maxTokens: 2500 })
    );
  });
});

describe("blueprintInputsHash", () => {
  it("is sha256 of YYYY-MM-DD|trimmed full name|locale", () => {
    const expected = createHash("sha256").update("1990-07-15|Ana López|es").digest("hex");
    expect(blueprintInputsHash(birthDate, "  Ana López ", "es")).toBe(expected);
  });

  it("changes with the date, the name or the locale", () => {
    const base = blueprintInputsHash(birthDate, "Ana", "es");
    expect(blueprintInputsHash(new Date(Date.UTC(1990, 6, 16)), "Ana", "es")).not.toBe(base);
    expect(blueprintInputsHash(birthDate, "Ana María", "es")).not.toBe(base);
    expect(blueprintInputsHash(birthDate, "Ana", "en")).not.toBe(base);
  });

  it("uses the UTC day, so any time on that day gives the same key", () => {
    expect(blueprintInputsHash(new Date("1990-07-15T23:59:00Z"), "Ana", "es")).toBe(
      blueprintInputsHash(birthDate, "Ana", "es")
    );
  });
});

describe("helpers", () => {
  it("toBlueprintLocale: only 'en' is English", () => {
    expect(toBlueprintLocale("en")).toBe("en");
    expect(toBlueprintLocale("es")).toBe("es");
    expect(toBlueprintLocale("pt")).toBe("es");
    expect(toBlueprintLocale(null)).toBe("es");
  });

  it("getFirstName takes the first word", () => {
    expect(getFirstName("  María José Pérez ")).toBe("María");
    expect(getFirstName("Ana")).toBe("Ana");
    expect(getFirstName("")).toBe("");
    expect(getFirstName(undefined)).toBe("");
  });
});

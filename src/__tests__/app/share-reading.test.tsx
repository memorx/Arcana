/**
 * /share/[shareId]: la lectura pública la ve otra persona, así que su h1 nombra a quien la compartió
 * («La lectura de Ana») y no dice «Tu lectura». Sin nombre: «Una lectura compartida». Textos reales de messages/.
 */
import { render, screen } from "@testing-library/react";
import SharedReadingPage from "@/app/share/[shareId]/page";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    reading: { findUnique: jest.fn() },
    card: { findMany: jest.fn() },
  },
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

// La cabecera y el pie tienen sus propias pruebas; aquí sólo importa el pliego.
jest.mock("@/components/layout", () => ({ Header: () => null, Footer: () => null }));

let mockLocale: "es" | "en" = "es";
const mockMensajes: Record<string, unknown> = {
  es: jest.requireActual("../../../messages/es.json"),
  en: jest.requireActual("../../../messages/en.json"),
};

jest.mock("next-intl/server", () => ({
  getLocale: jest.fn(async () => mockLocale),
  getTranslations: jest.fn(async (ns: string) => (key: string, values?: Record<string, unknown>) => {
    const msg = `${ns}.${key}`
      .split(".")
      .reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), mockMensajes[mockLocale]);
    if (typeof msg !== "string") throw new Error(`falta ${ns}.${key}`);
    // Sin ICU: basta para estas llaves; la de cartas («{count, plural…}») no se mira aquí.
    return msg.replace(/\{(\w+)\}/g, (_, k: string) => String(values?.[k] ?? `{${k}}`));
  }),
}));

import { prisma } from "@/lib/prisma";

const findReading = (prisma.reading as unknown as { findUnique: jest.Mock }).findUnique;
const findCards = (prisma.card as unknown as { findMany: jest.Mock }).findMany;

const lectura = (name: string | null) => ({
  id: "r1",
  shareId: "e2eShare01",
  isPublic: true,
  intention: "¿Qué necesito ver de mi semana?",
  interpretation: "Una lectura que habla de pausa.",
  createdAt: new Date("2026-11-02T18:00:00.000Z"),
  cards: [{ position: 1, cardId: "c1", isReversed: false }],
  spreadType: {
    name: "Single Card",
    nameEs: "Una Carta",
    positions: [{ position: 1, name: "Guidance", nameEs: "Guía", description: "d" }],
  },
  user: { name },
});

const carta = {
  id: "c1",
  slug: "the-star",
  name: "The Star",
  nameEs: "La Estrella",
  number: 17,
  arcana: "MAJOR",
  suit: null,
  keywords: ["esperanza"],
  meaningUpright: "Esperanza",
  meaningReversed: "Desaliento",
  meaningUprightEn: "Hope",
  meaningReversedEn: "Despair",
};

const params = { params: Promise.resolve({ shareId: "e2eShare01" }) };

describe("/share/[shareId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocale = "es";
    findCards.mockResolvedValue([carta]);
  });

  it("el h1 nombra a quien compartió la lectura, no «Tu lectura»", async () => {
    findReading.mockResolvedValue(lectura("Ana"));
    render(await SharedReadingPage(params));

    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent(/^La lectura de Ana$/);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: /^tu lectura$/i })).toBeNull();
    // El sello «Compartido por» se queda.
    expect(screen.getByText("Compartido por: Ana")).toBeInTheDocument();
  });

  it("sin nombre: «Una lectura compartida»", async () => {
    findReading.mockResolvedValue(lectura(null));
    render(await SharedReadingPage(params));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^Una lectura compartida$/);
  });

  it("en inglés: «Ana's reading» y «A shared reading»", async () => {
    mockLocale = "en";
    findReading.mockResolvedValue(lectura("Ana"));
    const { unmount } = render(await SharedReadingPage(params));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^Ana's reading$/);
    unmount();

    findReading.mockResolvedValue(lectura(null));
    render(await SharedReadingPage(params));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^A shared reading$/);
  });

  it("una lectura privada o inexistente → notFound()", async () => {
    findReading.mockResolvedValue({ ...lectura("Ana"), isPublic: false });
    await expect(SharedReadingPage(params)).rejects.toThrow("NEXT_NOT_FOUND");
    findReading.mockResolvedValue(null);
    await expect(SharedReadingPage(params)).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

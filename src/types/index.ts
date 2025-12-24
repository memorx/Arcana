// Re-export Prisma types for convenience
export type {
  User,
  Card,
  SpreadType,
  Reading,
  CreditTransaction,
} from "@prisma/client";

export { Arcana, Suit, TransactionType } from "@prisma/client";

// ============================================================================
// JSON Field Types (for type-safe access to JSON columns)
// ============================================================================

export interface SpreadPosition {
  position: number;
  name: string;
  nameEs: string;
  description: string;
}

export interface ReadingCard {
  position: number;
  cardId: string;
  isReversed: boolean;
}

// ============================================================================
// Extended Types (with relations)
// ============================================================================

export interface CardWithDetails {
  id: string;
  name: string;
  nameEs: string;
  arcana: "MAJOR" | "MINOR";
  suit: "WANDS" | "CUPS" | "SWORDS" | "PENTACLES" | null;
  number: number;
  keywords: string[];
  meaningUpright: string;
  meaningReversed: string;
  imageUrl: string;
}

export interface SpreadTypeWithPositions {
  id: string;
  name: string;
  nameEs: string;
  description: string;
  descriptionEs: string;
  cardCount: number;
  positions: SpreadPosition[];
  creditCost: number;
}

export interface ReadingWithRelations {
  id: string;
  userId: string;
  spreadTypeId: string;
  intention: string;
  cards: ReadingCard[];
  interpretation: string;
  createdAt: Date;
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
  spreadType?: SpreadTypeWithPositions;
}

export interface ReadingCardWithDetails extends ReadingCard {
  card: CardWithDetails;
  positionName: string;
  positionNameEs: string;
  positionDescription: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateReadingRequest {
  spreadTypeId: string;
  intention: string;
}

export interface CreateReadingResponse {
  reading: ReadingWithRelations;
  cardsDrawn: ReadingCardWithDetails[];
}

export interface GenerateInterpretationRequest {
  readingId: string;
}

export interface PurchaseCreditsRequest {
  amount: number;
  paymentIntentId?: string;
}

// ============================================================================
// UI State Types
// ============================================================================

export type ReadingStep =
  | "select-spread"
  | "set-intention"
  | "shuffle"
  | "draw-cards"
  | "reveal"
  | "interpretation";

export interface ReadingState {
  step: ReadingStep;
  spreadType: SpreadTypeWithPositions | null;
  intention: string;
  drawnCards: ReadingCardWithDetails[];
  interpretation: string | null;
  isGenerating: boolean;
}

// ============================================================================
// Suit Display Helpers
// ============================================================================

export const suitDisplayNames = {
  WANDS: { en: "Wands", es: "Bastos" },
  CUPS: { en: "Cups", es: "Copas" },
  SWORDS: { en: "Swords", es: "Espadas" },
  PENTACLES: { en: "Pentacles", es: "Oros" },
} as const;

export const arcanaDisplayNames = {
  MAJOR: { en: "Major Arcana", es: "Arcanos Mayores" },
  MINOR: { en: "Minor Arcana", es: "Arcanos Menores" },
} as const;

/**
 * Shared types for Arcana's wisdom systems (western and Chinese zodiac,
 * tonalpohualli, numerology, tarot birth cards and moon phases).
 *
 * All user-facing content lives inside the library as `{ en, es }` pairs,
 * so pages, prompts and emails can pick the language without touching
 * `messages/`.
 */

export type Locale = "en" | "es";

export interface Bilingual {
  en: string;
  es: string;
}

/** Picks the string for a locale. */
export function localize(text: Bilingual, locale: Locale): string {
  return text[locale];
}

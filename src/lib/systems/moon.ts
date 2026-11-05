/**
 * Moon phases from the mean synodic month.
 *
 * Age = days since the reference new moon JD 2451550.1 ≈ 2000-01-06 14:24 UTC
 * (Meeus's mean new moon; the true new moon was at 18:14 UTC), modulo the
 * synodic month (29.530588853 days). This is the
 * *mean* moon: real phases can differ by up to ~14 hours, which is fine for
 * naming the phase of a day. `getMoonPhase` evaluates the UTC calendar day
 * at 12:00 UTC so that the whole day gets one phase.
 */
import { mod, utcParts } from "./shared";
import type { Bilingual } from "./types";

export type MoonPhase =
  | "new"
  | "waxing-crescent"
  | "first-quarter"
  | "waxing-gibbous"
  | "full"
  | "waning-gibbous"
  | "last-quarter"
  | "waning-crescent";

export interface MoonPhaseInfo {
  phase: MoonPhase;
  name: Bilingual;
  emoji: string;
  /** Illuminated fraction of the disc, 0–1. */
  illumination: number;
  /** Days since the last new moon, 0–29.53. */
  age: number;
  guidance: Bilingual;
}

export const SYNODIC_MONTH = 29.530588853;
/** JD 2451550.1 ≈ 2000-01-06 14:24 UTC: Meeus's mean new moon (the true one was at 18:14 UTC). */
export const REFERENCE_NEW_MOON_JD = 2451550.1;

const UNIX_EPOCH_JD = 2440587.5;
const DAY_MS = 86_400_000;

export const MOON_PHASES: readonly (Omit<MoonPhaseInfo, "illumination" | "age">)[] = [
  {
    phase: "new",
    name: { en: "New Moon", es: "Luna nueva" },
    emoji: "🌑",
    guidance: {
      en: "A quiet moment to name what you want to begin.",
      es: "Un momento de calma para nombrar lo que quieres empezar.",
    },
  },
  {
    phase: "waxing-crescent",
    name: { en: "Waxing Crescent", es: "Luna creciente" },
    emoji: "🌒",
    guidance: {
      en: "Small steps give shape to an intention.",
      es: "Los pasos pequeños le dan forma a una intención.",
    },
  },
  {
    phase: "first-quarter",
    name: { en: "First Quarter", es: "Cuarto creciente" },
    emoji: "🌓",
    guidance: {
      en: "A good moment to decide and adjust your course.",
      es: "Buen momento para decidir y ajustar el rumbo.",
    },
  },
  {
    phase: "waxing-gibbous",
    name: { en: "Waxing Gibbous", es: "Gibosa creciente" },
    emoji: "🌔",
    guidance: {
      en: "Refine, practice and trust the process.",
      es: "Afina, practica y confía en el proceso.",
    },
  },
  {
    phase: "full",
    name: { en: "Full Moon", es: "Luna llena" },
    emoji: "🌕",
    guidance: {
      en: "What was hidden comes to light; notice what you feel.",
      es: "Lo que estaba oculto sale a la luz; observa lo que sientes.",
    },
  },
  {
    phase: "waning-gibbous",
    name: { en: "Waning Gibbous", es: "Gibosa menguante" },
    emoji: "🌖",
    guidance: {
      en: "Share what you have learned and give thanks.",
      es: "Comparte lo que aprendiste y agradece.",
    },
  },
  {
    phase: "last-quarter",
    name: { en: "Last Quarter", es: "Cuarto menguante" },
    emoji: "🌗",
    guidance: {
      en: "Let go of what no longer fits.",
      es: "Suelta lo que ya no te queda.",
    },
  },
  {
    phase: "waning-crescent",
    name: { en: "Waning Crescent", es: "Luna menguante" },
    emoji: "🌘",
    guidance: {
      en: "Rest and listen before the next cycle begins.",
      es: "Descansa y escucha antes de que empiece el siguiente ciclo.",
    },
  },
];

function toJulianDate(ms: number): number {
  return ms / DAY_MS + UNIX_EPOCH_JD;
}

function fromJulianDate(jd: number): Date {
  return new Date(Math.round((jd - UNIX_EPOCH_JD) * DAY_MS));
}

function moonAge(jd: number): number {
  return mod(jd - REFERENCE_NEW_MOON_JD, SYNODIC_MONTH);
}

/** Phase of the moon on the UTC calendar day of `date` (evaluated at 12:00 UTC). */
export function getMoonPhase(date: Date): MoonPhaseInfo {
  const { year, month, day } = utcParts(date);
  const noon = new Date(Date.UTC(2000, 0, 1, 12));
  noon.setUTCFullYear(year, month - 1, day);
  const age = moonAge(toJulianDate(noon.getTime()));
  const fraction = age / SYNODIC_MONTH;
  // Eight equal slices centred on new, first quarter, full and last quarter.
  const slice = Math.floor(fraction * 8 + 0.5) % 8;
  return {
    ...MOON_PHASES[slice],
    illumination: Math.round(((1 - Math.cos(2 * Math.PI * fraction)) / 2) * 1000) / 1000,
    age: Math.round(age * 100) / 100,
  };
}

function nextPhaseAt(date: Date, targetAge: number): Date {
  if (Number.isNaN(date.getTime())) throw new RangeError("Invalid date");
  const jd = toJulianDate(date.getTime());
  let delta = mod(targetAge - moonAge(jd), SYNODIC_MONTH);
  // `date` may itself be a phase instant returned earlier (rounded to the
  // millisecond): anything within a second counts as "now", so skip ahead.
  if (delta * DAY_MS < 1000) delta += SYNODIC_MONTH;
  return fromJulianDate(jd + delta);
}

/** Instant of the next (mean) full moon strictly after `date`. */
export function getNextFullMoon(date: Date): Date {
  return nextPhaseAt(date, SYNODIC_MONTH / 2);
}

/** Instant of the next (mean) new moon strictly after `date`. */
export function getNextNewMoon(date: Date): Date {
  return nextPhaseAt(date, 0);
}

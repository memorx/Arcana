"use client";

import { ReversoCarta } from "@/components/tinta/ReversoCarta";

interface CardPlaceholderProps {
  cardName: string;
  arcana: "MAJOR" | "MINOR";
  suit?: "WANDS" | "CUPS" | "SWORDS" | "PENTACLES" | null;
  number: number;
  className?: string;
}

const ROMAN_NUMERALS = [
  "0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI",
];

/** Glifo de palo en dos tintas (línea de grabado y un punto rosa), en lugar de emojis a color. */
function Glifo({ arcana, suit }: { arcana: "MAJOR" | "MINOR"; suit?: CardPlaceholderProps["suit"] }) {
  const trazo = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const };
  let dibujo;
  if (arcana === "MAJOR" || !suit) {
    dibujo = (
      <>
        <circle cx="16" cy="16" r="11" {...trazo} />
        <circle cx="16" cy="16" r="3.2" fill="var(--color-rosa, #E4007C)" />
      </>
    );
  } else if (suit === "WANDS") {
    dibujo = (
      <>
        <path d="M16 4v24M16 10l-4-3M16 15l4-3M16 21l-4-3" {...trazo} />
        <circle cx="16" cy="4.5" r="2.2" fill="var(--color-rosa, #E4007C)" />
      </>
    );
  } else if (suit === "CUPS") {
    dibujo = (
      <>
        <path d="M8 7h16c0 7-3.6 11-8 11S8 14 8 7zM16 18v7M11 27h10" {...trazo} />
        <circle cx="16" cy="11" r="2.2" fill="var(--color-rosa, #E4007C)" />
      </>
    );
  } else if (suit === "SWORDS") {
    dibujo = (
      <>
        <path d="M16 3v20M10 23h12M16 23v6" {...trazo} />
        <circle cx="16" cy="29" r="1.8" fill="var(--color-rosa, #E4007C)" />
      </>
    );
  } else {
    dibujo = (
      <>
        <circle cx="16" cy="16" r="11" {...trazo} />
        <path d="M16 8L20.7 22.5 8.4 13.5H23.6L11.3 22.5Z" {...trazo} strokeWidth={1} strokeLinejoin="round" />
        <circle cx="16" cy="16" r="2" fill="var(--color-rosa, #E4007C)" />
      </>
    );
  }
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true" focusable="false">
      {dibujo}
    </svg>
  );
}

export function CardPlaceholder({ cardName, arcana, suit, number, className = "" }: CardPlaceholderProps) {
  const isMajor = arcana === "MAJOR";

  const getDisplayNumber = () => {
    if (isMajor) return ROMAN_NUMERALS[number] || number.toString();
    if (number === 1) return "A";
    if (number === 11) return "P"; // Page
    if (number === 12) return "Kn"; // Knight
    if (number === 13) return "Q"; // Queen
    if (number === 14) return "K"; // King
    return number.toString();
  };

  return (
    <div
      className={`relative aspect-[7/12] overflow-hidden rounded-[6px] border border-tinta/25 bg-papel text-tinta ${className}`}
    >
      {/* Filete interior, como el marco impreso de las cartas */}
      <div className="absolute inset-[6%] rounded-[3px] border border-tinta/15" aria-hidden="true" />

      <div className="relative flex h-full flex-col items-center justify-between px-1.5 py-[12%] text-center">
        <span className="font-titulo text-sm leading-none">{getDisplayNumber()}</span>
        <Glifo arcana={arcana} suit={suit} />
        <p className="w-full px-1 font-dato text-[8px] uppercase leading-tight tracking-[0.06em] text-grafito line-clamp-2">
          {cardName}
        </p>
      </div>
    </div>
  );
}

export function CardBack({ className = "" }: { className?: string }) {
  return (
    <div className={`relative aspect-[7/12] overflow-hidden rounded-[6px] bg-tinta ${className}`}>
      <ReversoCarta />
    </div>
  );
}

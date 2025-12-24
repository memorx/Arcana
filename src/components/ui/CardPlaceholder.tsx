"use client";

interface CardPlaceholderProps {
  cardName: string;
  arcana: "MAJOR" | "MINOR";
  suit?: "WANDS" | "CUPS" | "SWORDS" | "PENTACLES" | null;
  number: number;
  className?: string;
}

const ROMAN_NUMERALS = [
  "0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"
];

const SUIT_SYMBOLS: Record<string, { symbol: string; color: string }> = {
  WANDS: { symbol: "🔥", color: "from-orange-900/80 to-red-950/90" },
  CUPS: { symbol: "💧", color: "from-blue-900/80 to-cyan-950/90" },
  SWORDS: { symbol: "⚔️", color: "from-slate-700/80 to-slate-900/90" },
  PENTACLES: { symbol: "⭐", color: "from-amber-800/80 to-yellow-950/90" },
};

const MAJOR_ARCANA_SYMBOLS: Record<number, string> = {
  0: "🃏", // The Fool
  1: "🪄", // The Magician
  2: "🌙", // The High Priestess
  3: "👑", // The Empress
  4: "🏛️", // The Emperor
  5: "⛪", // The Hierophant
  6: "💕", // The Lovers
  7: "🏎️", // The Chariot
  8: "🦁", // Strength
  9: "🏮", // The Hermit
  10: "🎡", // Wheel of Fortune
  11: "⚖️", // Justice
  12: "🙃", // The Hanged Man
  13: "💀", // Death
  14: "🏺", // Temperance
  15: "😈", // The Devil
  16: "🗼", // The Tower
  17: "⭐", // The Star
  18: "🌕", // The Moon
  19: "☀️", // The Sun
  20: "📯", // Judgement
  21: "🌍", // The World
};

export function CardPlaceholder({
  cardName,
  arcana,
  suit,
  number,
  className = "",
}: CardPlaceholderProps) {
  const isMajor = arcana === "MAJOR";

  // Get gradient colors based on card type
  const getGradient = () => {
    if (isMajor) {
      return "from-purple-900/90 via-violet-950/95 to-purple-950/90";
    }
    if (suit && SUIT_SYMBOLS[suit]) {
      return SUIT_SYMBOLS[suit].color;
    }
    return "from-purple-900/90 to-purple-950/90";
  };

  // Get the symbol to display
  const getSymbol = () => {
    if (isMajor) {
      return MAJOR_ARCANA_SYMBOLS[number] || "✨";
    }
    if (suit && SUIT_SYMBOLS[suit]) {
      return SUIT_SYMBOLS[suit].symbol;
    }
    return "✨";
  };

  // Get display number/text
  const getDisplayNumber = () => {
    if (isMajor) {
      return ROMAN_NUMERALS[number] || number.toString();
    }
    // For minor arcana
    if (number === 1) return "A";
    if (number === 11) return "P"; // Page
    if (number === 12) return "Kn"; // Knight
    if (number === 13) return "Q"; // Queen
    if (number === 14) return "K"; // King
    return number.toString();
  };

  return (
    <div
      className={`relative aspect-[2/3] rounded-lg overflow-hidden ${className}`}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getGradient()}`} />

      {/* Decorative border */}
      <div className="absolute inset-0 border-2 border-amber-500/30 rounded-lg" />
      <div className="absolute inset-1 border border-amber-500/20 rounded-md" />

      {/* Corner decorations */}
      <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-amber-500/40 rounded-tl" />
      <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-amber-500/40 rounded-tr" />
      <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-amber-500/40 rounded-bl" />
      <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-amber-500/40 rounded-br" />

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-between p-3 text-center">
        {/* Top number */}
        <div className="text-amber-400/80 font-serif text-sm font-bold">
          {getDisplayNumber()}
        </div>

        {/* Central symbol */}
        <div className="flex-1 flex items-center justify-center">
          <span className="text-4xl filter drop-shadow-lg">
            {getSymbol()}
          </span>
        </div>

        {/* Card name */}
        <div className="w-full">
          <p className="text-amber-200/90 text-[10px] font-medium leading-tight line-clamp-2 px-1">
            {cardName}
          </p>
        </div>
      </div>

      {/* Subtle shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}

export function CardBack({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative aspect-[2/3] rounded-lg overflow-hidden ${className}`}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-purple-950 to-violet-950" />

      {/* Decorative border */}
      <div className="absolute inset-0 border-2 border-amber-500/30 rounded-lg" />
      <div className="absolute inset-1 border border-amber-500/20 rounded-md" />

      {/* Pattern */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {/* Outer ring */}
          <div className="w-16 h-16 border-2 border-amber-500/30 rounded-full flex items-center justify-center">
            {/* Inner ring */}
            <div className="w-10 h-10 border border-amber-500/40 rounded-full flex items-center justify-center">
              {/* Center star */}
              <span className="text-amber-400/60 text-xl">✦</span>
            </div>
          </div>

          {/* Corner stars */}
          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-amber-500/30 text-xs">✦</span>
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-amber-500/30 text-xs">✦</span>
          <span className="absolute top-1/2 -left-6 -translate-y-1/2 text-amber-500/30 text-xs">✦</span>
          <span className="absolute top-1/2 -right-6 -translate-y-1/2 text-amber-500/30 text-xs">✦</span>
        </div>
      </div>

      {/* Decorative corners */}
      <div className="absolute top-3 left-3 text-amber-500/20 text-xs">✦</div>
      <div className="absolute top-3 right-3 text-amber-500/20 text-xs">✦</div>
      <div className="absolute bottom-3 left-3 text-amber-500/20 text-xs">✦</div>
      <div className="absolute bottom-3 right-3 text-amber-500/20 text-xs">✦</div>

      {/* Subtle texture */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/3 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}

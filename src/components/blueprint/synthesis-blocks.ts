/**
 * Splits the synthesis text into blocks. Kept apart from view-model.ts
 * (which imports @/lib/systems) so the client bundle of SynthesisPanel does
 * not carry the systems library.
 */

export interface SynthesisBlock {
  kind: "paragraph" | "question";
  text: string;
}

/** Strips the Markdown the prompt asks the model not to use, if it slips in anyway. */
function cleanLine(line: string): string {
  return line
    .trim()
    .replace(/^#{1,6}\s+/, "")
    .replace(/^(?:[-*•]|\d+[.)])\s+/, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .trim();
}

/**
 * Synthesis text → blocks. Each non-empty line is a block; the run of lines
 * ending in "?" at the end of the text are the closing questions.
 */
export function splitSynthesis(text: string): SynthesisBlock[] {
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const blocks: SynthesisBlock[] = lines.map((line) => ({ kind: "paragraph", text: line }));
  for (let i = blocks.length - 1; i >= 0 && /[?？]$/.test(blocks[i].text); i--) {
    blocks[i].kind = "question";
  }
  return blocks;
}

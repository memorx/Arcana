import { toTextBlocks } from "@/lib/compatibility";

/** The AI text: section titles and paragraphs. */
export function ReadingText({ content }: { content: string }) {
  const blocks = toTextBlocks(content);

  return (
    <div className="max-w-none">
      {blocks.map((block, i) =>
        block.type === "heading" ? (
          <h3 key={i} className="mt-6 mb-2 first:mt-0 text-base font-semibold text-amber-300">
            {block.text}
          </h3>
        ) : (
          <p key={i} className="mb-4 last:mb-0 leading-relaxed text-slate-300">
            {block.text}
          </p>
        )
      )}
    </div>
  );
}

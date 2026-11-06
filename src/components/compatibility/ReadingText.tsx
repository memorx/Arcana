import { toTextBlocks } from "@/lib/compatibility";

/** The AI text as a printed sheet: section titles in Gloock, paragraphs in Newsreader. */
export function ReadingText({ content }: { content: string }) {
  const blocks = toTextBlocks(content);

  return (
    <div className="max-w-[66ch] font-lectura text-letra hyphens-auto">
      {blocks.map((block, i) =>
        block.type === "heading" ? (
          <h3
            key={i}
            className="mt-10 mb-3 border-t border-filete/25 pt-6 text-[clamp(1.3rem,1.15rem+0.5vw,1.6rem)] leading-[1.15] first:mt-0 first:border-t-0 first:pt-0"
          >
            {block.text}
          </h3>
        ) : (
          <p key={i} className="mb-[1.1em] text-[1.125rem] leading-[1.7] last:mb-0">
            {block.text}
          </p>
        )
      )}
    </div>
  );
}

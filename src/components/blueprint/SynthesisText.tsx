import { splitSynthesis } from "./synthesis-blocks";

interface SynthesisTextProps {
  text: string;
  /** Language of the text (the profile's), for screen readers and hyphenation. */
  lang: "en" | "es";
  /** Heading of the closing questions box. */
  questionsTitle: string;
}

/**
 * The synthesis as a printed sheet in Newsreader (the portrait, the first
 * paragraph, a little larger) and the closing questions apart, in italics,
 * under a rule, numbered in pink. Server and client safe.
 */
export function SynthesisText({ text, lang, questionsTitle }: SynthesisTextProps) {
  const blocks = splitSynthesis(text);
  const paragraphs = blocks.filter((b) => b.kind === "paragraph");
  const questions = blocks.filter((b) => b.kind === "question");

  return (
    <article lang={lang} className="grid max-w-[66ch] gap-[1.1em] font-lectura text-letra hyphens-auto">
      {paragraphs.map((block, i) => (
        <p
          key={i}
          className={
            i === 0
              ? "text-[clamp(1.25rem,1.1rem+0.5vw,1.45rem)] leading-[1.5]"
              : "text-[1.125rem] leading-[1.7]"
          }
        >
          {block.text}
        </p>
      ))}
      {questions.length > 0 && (
        <aside className="mt-3 border-t border-filete/25 pt-6">
          <h3 className="font-dato text-[0.6875rem] leading-[1.4] tracking-[0.12em] text-letra-suave uppercase">
            {questionsTitle}
          </h3>
          <ol className="mt-4 grid gap-4">
            {questions.map((block, i) => (
              <li key={i} className="flex gap-4 text-[1.1875rem] leading-[1.55]">
                <span
                  aria-hidden="true"
                  className="w-5 shrink-0 pt-[0.35em] font-dato text-[0.75rem] leading-none text-letra-acento"
                >
                  {i + 1}
                </span>
                <span className="italic">{block.text}</span>
              </li>
            ))}
          </ol>
        </aside>
      )}
    </article>
  );
}

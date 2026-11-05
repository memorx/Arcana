import { splitSynthesis } from "./synthesis-blocks";

interface SynthesisTextProps {
  text: string;
  /** Language of the text (the profile's), for screen readers and hyphenation. */
  lang: "en" | "es";
  /** Heading of the closing questions box. */
  questionsTitle: string;
}

/**
 * The synthesis in paragraphs (the first one, the portrait, a little larger)
 * and the closing questions in their own numbered box. Server and client safe.
 */
export function SynthesisText({ text, lang, questionsTitle }: SynthesisTextProps) {
  const blocks = splitSynthesis(text);
  const paragraphs = blocks.filter((b) => b.kind === "paragraph");
  const questions = blocks.filter((b) => b.kind === "question");

  return (
    <article lang={lang} className="space-y-4">
      {paragraphs.map((block, i) => (
        <p
          key={i}
          className={i === 0 ? "text-lg leading-relaxed text-slate-100" : "leading-relaxed text-slate-300"}
        >
          {block.text}
        </p>
      ))}
      {questions.length > 0 && (
        <aside className="mt-6 rounded-xl border border-amber-500/20 bg-slate-950/40 p-4 sm:p-5">
          <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-amber-400">{questionsTitle}</h3>
          <ol className="mt-3 space-y-3">
            {questions.map((block, i) => (
              <li key={i} className="flex gap-3 text-slate-200">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-500/40 text-xs text-amber-300"
                >
                  {i + 1}
                </span>
                <span className="italic leading-relaxed">{block.text}</span>
              </li>
            ))}
          </ol>
        </aside>
      )}
    </article>
  );
}

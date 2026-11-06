import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GlifoSistema } from "./BlueprintBadges";

export interface SystemCardDetail {
  label: string;
  value: string;
}

export interface SystemCardProps {
  /** Emoji, or a short text mark ("5", "V") when `symbolIsText`. */
  symbol: string;
  symbolIsText?: boolean;
  /**
   * "sello" (default): the symbol in a small ring next to the title.
   * "grande": the symbol is the lámina's figure, a large Gloock numeral in pink
   * (the life path number).
   */
  symbolSize?: "sello" | "grande";
  /** Plate number in the series ("I", "II"…), printed before the system name. */
  numeral?: string;
  /**
   * "columna" (default): everything stacked. "doble": for a plate that spans
   * the full row, from 768 px the text goes left and `children` (the birth
   * cards) right, so a single card does not leave half the plate empty.
   */
  disposicion?: "columna" | "doble";
  /** System name: "Zodiaco occidental". */
  eyebrow: string;
  /** The person's sign in that system: "Cáncer". */
  title: string;
  subtitle?: string;
  traits?: string[];
  description?: string;
  details?: SystemCardDetail[];
  footnote?: string;
  /** No longer used: «Dos tintas» has one accent. Kept so callers keep compiling. */
  accent?: "amber" | "purple" | "emerald";
  className?: string;
  /** Extra content under the description (e.g. the birth cards). */
  children?: ReactNode;
}

/**
 * One system of the Arcana Map as a printed plate (lámina): plate number and
 * system in mono, the person's sign in Gloock, the traits as a line of data,
 * the description in Newsreader and the details as a `dl` (labels in mono,
 * values in Gloock), like «El día de hoy» on the home page. No box of its own:
 * the grid that holds the plates draws the rules between them.
 */
export function SystemCard({
  symbol,
  symbolIsText = false,
  symbolSize = "sello",
  numeral,
  disposicion = "columna",
  eyebrow,
  title,
  subtitle,
  traits = [],
  description,
  details = [],
  footnote,
  className,
  children,
}: SystemCardProps) {
  const grande = symbolSize === "grande";
  const doble = disposicion === "doble";

  const texto = (
    <>
      <header className={cn("flex gap-4", grande ? "items-end" : "items-start")}>
        {grande ? (
          <span
            aria-hidden="true"
            data-figura
            className="shrink-0 font-titulo text-[clamp(4.75rem,3.6rem+4vw,7.5rem)] leading-[0.78] text-rosa"
          >
            {symbol}
          </span>
        ) : (
          <span className="grid size-14 shrink-0 place-items-center rounded-full border border-filete text-[1.65rem]">
            <GlifoSistema symbol={symbol} isText={symbolIsText} className={symbolIsText ? "text-[1.35rem]" : undefined} />
          </span>
        )}
        <div className="min-w-0">
          <p className="font-dato text-[0.6875rem] leading-[1.4] tracking-[0.12em] text-letra-suave uppercase">
            {numeral && (
              <span aria-hidden="true" className="text-letra-acento">
                {numeral} ·{" "}
              </span>
            )}
            {eyebrow}
          </p>
          <h3 className="mt-1.5 text-[clamp(1.45rem,1.2rem+0.8vw,1.85rem)] leading-[1.1] break-words">{title}</h3>
          {subtitle && (
            <p className="mt-1.5 font-dato text-[0.6875rem] leading-[1.5] tracking-[0.08em] text-letra-suave uppercase">
              {subtitle}
            </p>
          )}
        </div>
      </header>

      {traits.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {traits.map((trait) => (
            <li
              key={trait}
              className="rounded-full border border-filete/30 px-2.5 py-0.5 font-dato text-[0.625rem] leading-[1.5] tracking-[0.1em] text-letra-suave uppercase"
            >
              {trait}
            </li>
          ))}
        </ul>
      )}

      {description && <p className="max-w-[62ch] text-[1rem] leading-[1.6]">{description}</p>}
    </>
  );

  const pie = (
    <>
      {details.length > 0 && (
        <dl className="mt-auto grid grid-cols-1 gap-x-6 gap-y-4 border-t border-filete/25 pt-5 min-[420px]:grid-cols-2">
          {details.map((detail) => (
            <div key={detail.label} className="min-w-0">
              <dt className="font-dato text-[0.625rem] leading-[1.4] tracking-[0.12em] text-letra-suave uppercase">
                {detail.label}
              </dt>
              <dd className="mt-1 font-titulo text-[1.15rem] leading-[1.2] break-words">{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {footnote && (
        <p className="border-l-2 border-rosa pl-4 text-[0.9375rem] leading-[1.55] text-letra-suave italic">
          {footnote}
        </p>
      )}
    </>
  );

  if (doble) {
    return (
      <div
        className={cn(
          "grid h-full gap-x-12 gap-y-6 bg-suelo p-5 text-letra sm:p-7 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-16",
          className
        )}
      >
        <div className="flex min-w-0 flex-col gap-5">
          {texto}
          {pie}
        </div>
        {children && <div className="min-w-0">{children}</div>}
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col gap-5 bg-suelo p-5 text-letra sm:p-7", className)}>
      {texto}
      {children}
      {pie}
    </div>
  );
}

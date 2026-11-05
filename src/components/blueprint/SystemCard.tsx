import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui";
import { cn } from "@/lib/utils";

type Accent = "amber" | "purple" | "emerald";

const ACCENT_STYLES: Record<Accent, { symbol: string; eyebrow: string; chip: string; glow: string }> = {
  amber: {
    symbol: "from-amber-500/25 to-amber-900/10 border-amber-500/30 text-amber-200",
    eyebrow: "text-amber-400/90",
    chip: "border-amber-500/20 bg-amber-500/5 text-amber-100/90",
    glow: "from-amber-500/10",
  },
  purple: {
    symbol: "from-purple-500/25 to-purple-900/10 border-purple-500/30 text-purple-200",
    eyebrow: "text-purple-300/90",
    chip: "border-purple-500/20 bg-purple-500/5 text-purple-100/90",
    glow: "from-purple-500/10",
  },
  emerald: {
    symbol: "from-emerald-500/25 to-emerald-900/10 border-emerald-500/30 text-emerald-200",
    eyebrow: "text-emerald-300/90",
    chip: "border-emerald-500/20 bg-emerald-500/5 text-emerald-100/90",
    glow: "from-emerald-500/10",
  },
};

export interface SystemCardDetail {
  label: string;
  value: string;
}

export interface SystemCardProps {
  /** Emoji, or a short text mark ("5", "V") when `symbolIsText`. */
  symbol: string;
  symbolIsText?: boolean;
  /** System name: "Zodiaco occidental". */
  eyebrow: string;
  /** The person's sign in that system: "Cáncer". */
  title: string;
  subtitle?: string;
  traits?: string[];
  description?: string;
  details?: SystemCardDetail[];
  footnote?: string;
  accent?: Accent;
  className?: string;
  /** Extra content under the description (e.g. the birth cards). */
  children?: ReactNode;
}

/** One system of the Arcana Map: symbol, name, the person's sign, traits and description. */
export function SystemCard({
  symbol,
  symbolIsText = false,
  eyebrow,
  title,
  subtitle,
  traits = [],
  description,
  details = [],
  footnote,
  accent = "purple",
  className,
  children,
}: SystemCardProps) {
  const styles = ACCENT_STYLES[accent];

  return (
    <Card className={cn("relative h-full overflow-hidden", className)}>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br to-transparent blur-2xl",
          styles.glow
        )}
      />
      <CardContent className="relative flex h-full flex-col gap-4 p-5 sm:p-6">
        <header className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border bg-gradient-to-br",
              symbolIsText ? "font-serif text-2xl font-semibold" : "text-3xl",
              styles.symbol
            )}
          >
            {symbol}
          </span>
          <div className="min-w-0">
            <p className={cn("text-xs font-medium uppercase tracking-[0.18em]", styles.eyebrow)}>{eyebrow}</p>
            <h3 className="mt-1 text-xl font-semibold leading-snug text-slate-100">{title}</h3>
            {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
          </div>
        </header>

        {traits.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {traits.map((trait) => (
              <li key={trait} className={cn("rounded-full border px-2.5 py-0.5 text-xs", styles.chip)}>
                {trait}
              </li>
            ))}
          </ul>
        )}

        {description && <p className="text-sm leading-relaxed text-slate-300">{description}</p>}

        {children}

        {details.length > 0 && (
          <dl className="mt-auto grid grid-cols-1 gap-x-4 gap-y-2 border-t border-slate-800 pt-4 text-sm min-[420px]:grid-cols-2">
            {details.map((detail) => (
              <div key={detail.label} className="min-w-0">
                <dt className="text-xs text-slate-500">{detail.label}</dt>
                <dd className="text-slate-200">{detail.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {footnote && <p className="text-xs leading-relaxed text-slate-500">{footnote}</p>}
      </CardContent>
    </Card>
  );
}

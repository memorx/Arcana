import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const KEYFRAMES =
  "@keyframes blueprint-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}";

/**
 * Soft rise-in for the Arcana Map, CSS only: it starts with the first paint
 * (no hydration needed, no animation library in the bundle) and only runs
 * when the person has not asked for reduced motion (`motion-safe`).
 * Server and client safe.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  /** Milliseconds, for staggering cards. */
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("motion-safe:animate-[blueprint-rise_0.6s_cubic-bezier(0.16,1,0.3,1)_both]", className)}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {/* React hoists this to <head> once per page (href + precedence). */}
      <style href="blueprint-rise" precedence="default">
        {KEYFRAMES}
      </style>
      {children}
    </div>
  );
}

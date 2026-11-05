import { cn } from "@/lib/utils";

/**
 * Classes that make a <Link> look like the ui Button (primary/secondary/ghost)
 * without nesting a <button> inside an <a>.
 */
export function linkButtonClass(
  variant: "primary" | "secondary" | "ghost" = "primary",
  size: "sm" | "md" | "lg" = "md",
  className?: string
): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
    variant === "primary" &&
      "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 focus-visible:ring-amber-500",
    variant === "secondary" &&
      "border border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700 focus-visible:ring-purple-500",
    variant === "ghost" &&
      "bg-transparent text-slate-300 hover:bg-slate-800/50 hover:text-slate-100 focus-visible:ring-slate-500",
    size === "sm" && "px-3 py-1.5 text-sm",
    size === "md" && "px-4 py-2 text-sm",
    size === "lg" && "px-6 py-3 text-base",
    className
  );
}

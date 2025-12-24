"use client";

import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "secondary" | "success" | "warning";
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-slate-800 text-slate-300 border-slate-700",
      primary: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      secondary: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      success: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      warning: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";

export { Badge };

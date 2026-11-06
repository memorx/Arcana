"use client";

import { MotionConfig } from "framer-motion";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      {/* Con prefers-reduced-motion, framer-motion no anima (también en el primer render, donde useReducedMotion aún es null). */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </SessionProvider>
  );
}

"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Framer Motion follows the system's "reduce motion" setting inside this
 * wrapper: movement is dropped and only opacity fades remain.
 */
export function MotionSafe({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

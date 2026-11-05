"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Makes the framer-motion animations inside (FadeIn, AnimatedCard) follow
 * the system's "reduce motion" setting: no movement, only the fade.
 */
export function ReducedMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

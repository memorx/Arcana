"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Makes every framer-motion animation inside (FadeIn, AnimatedCard) follow
 * the person's `prefers-reduced-motion` setting.
 */
export function InsightsMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

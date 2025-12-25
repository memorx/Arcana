"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  hoverLift?: boolean;
  hoverGlow?: boolean;
  delay?: number;
}

export function AnimatedCard({
  children,
  className = "",
  hoverLift = true,
  hoverGlow = false,
  delay = 0,
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      whileHover={
        hoverLift
          ? {
              y: -4,
              transition: { duration: 0.2 },
            }
          : undefined
      }
      className={`${className} ${hoverGlow ? "hover:shadow-lg hover:shadow-purple-500/20" : ""}`}
    >
      {children}
    </motion.div>
  );
}

// Specific component for tarot card flip animation
export function FlipCard({
  children,
  isFlipped,
  className = "",
}: {
  children: ReactNode;
  isFlipped: boolean;
  className?: string;
}) {
  return (
    <motion.div
      initial={false}
      animate={{ rotateY: isFlipped ? 180 : 0 }}
      transition={{
        duration: 0.6,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      style={{ transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

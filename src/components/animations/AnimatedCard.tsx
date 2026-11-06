"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  hoverLift?: boolean;
  hoverGlow?: boolean;
  delay?: number;
}

/**
 * Entra con un fundido y sube 4 px al pasar. `hoverGlow` ya no es un halo
 * morado: es un filete rosa (en dos tintas no hay sombras de color).
 * Con reduced-motion no se mueve.
 */
export function AnimatedCard({
  children,
  className = "",
  hoverLift = true,
  hoverGlow = false,
  delay = 0,
}: AnimatedCardProps) {
  const reducido = useReducedMotion();
  return (
    <motion.div
      initial={reducido ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={
        hoverLift && !reducido
          ? {
              y: -4,
              transition: { duration: 0.2 },
            }
          : undefined
      }
      className={`${className} ${hoverGlow ? "rounded-sm transition-shadow hover:ring-1 hover:ring-rosa" : ""}`}
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
  const reducido = useReducedMotion();
  return (
    <motion.div
      initial={false}
      animate={{ rotateY: isFlipped ? 180 : 0 }}
      transition={{
        duration: reducido ? 0 : 0.6,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      style={{ transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

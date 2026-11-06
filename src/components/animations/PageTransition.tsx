"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Ya no anima en cada cambio de ruta (§5.4): lo de en medio de dos pantallas es
 * quieto y rápido. La transición «a pincel» vive en los componentes de tinta y
 * sólo se usa al entrar a revelar una tirada y a /daily. Se conserva la
 * exportación y sus props para no romper a nadie.
 */
export function PageTransition({ children, className = "" }: PageTransitionProps) {
  return <div className={className}>{children}</div>;
}

// Stagger children animation wrapper
export function StaggerContainer({
  children,
  className = "",
  staggerDelay = 0.1,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  const reducido = useReducedMotion();
  return (
    <motion.div
      initial={reducido ? false : "hidden"}
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: reducido ? 0 : staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reducido = useReducedMotion();
  return (
    <motion.div
      variants={{
        hidden: reducido ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: reducido ? 0 : 0.4 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

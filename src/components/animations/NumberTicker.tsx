"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform, useInView, useReducedMotion } from "framer-motion";

interface NumberTickerProps {
  value: number;
  direction?: "up" | "down";
  delay?: number;
  className?: string;
  decimalPlaces?: number;
}

/** Cuenta hasta `value` al entrar en pantalla. Con reduced-motion muestra el número final, quieto. */
export function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  className = "",
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducido = useReducedMotion();
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [hasAnimated, setHasAnimated] = useState(false);

  const springValue = useSpring(direction === "up" ? 0 : value, {
    damping: 60,
    stiffness: 100,
  });

  const displayValue = useTransform(springValue, (current) =>
    Math.floor(current).toLocaleString()
  );

  useEffect(() => {
    if (reducido) {
      springValue.jump(direction === "up" ? value : 0);
      setHasAnimated(true);
      return;
    }
    if (isInView && !hasAnimated) {
      const timeout = setTimeout(() => {
        springValue.set(direction === "up" ? value : 0);
        setHasAnimated(true);
      }, delay * 1000);

      return () => clearTimeout(timeout);
    }
  }, [reducido, isInView, hasAnimated, delay, springValue, value, direction]);

  return (
    <motion.span ref={ref} className={className}>
      {displayValue}
    </motion.span>
  );
}

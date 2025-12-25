"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform, useInView } from "framer-motion";

interface NumberTickerProps {
  value: number;
  direction?: "up" | "down";
  delay?: number;
  className?: string;
  decimalPlaces?: number;
}

export function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  className = "",
  decimalPlaces = 0,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
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
    if (isInView && !hasAnimated) {
      const timeout = setTimeout(() => {
        springValue.set(direction === "up" ? value : 0);
        setHasAnimated(true);
      }, delay * 1000);

      return () => clearTimeout(timeout);
    }
  }, [isInView, hasAnimated, delay, springValue, value, direction]);

  return (
    <motion.span ref={ref} className={className}>
      {displayValue}
    </motion.span>
  );
}

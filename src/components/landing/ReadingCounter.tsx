"use client";

import { useEffect, useState } from "react";

interface ReadingCounterProps {
  label: string;
}

export function ReadingCounter({ label }: ReadingCounterProps) {
  const [count, setCount] = useState<number | null>(null);
  const [displayCount, setDisplayCount] = useState(0);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        setCount(data.displayCount || 0);
      })
      .catch(() => setCount(0));
  }, []);

  // Animate counting up
  useEffect(() => {
    if (count === null) return;

    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = count / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= count) {
        setDisplayCount(count);
        clearInterval(timer);
      } else {
        setDisplayCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [count]);

  if (count === null) {
    return (
      <div className="text-center py-8">
        <div className="inline-block h-8 w-24 bg-purple-900/30 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-amber-400 to-purple-400 bg-clip-text text-transparent">
        {displayCount.toLocaleString()}+
      </div>
      <p className="text-slate-400 mt-2">{label}</p>
    </div>
  );
}

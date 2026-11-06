"use client";

import { MotionConfig } from "framer-motion";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

/**
 * `session` viene del servidor (`auth()` en el layout raíz; `null` sin sesión). Con ella el primer render ya sabe si
 * hay sesión: `useSession` nunca pasa por «loading» al abrir la página y la cabecera no salta del hueco al enlace.
 */
export function Providers({ children, session }: { children: ReactNode; session?: Session | null }) {
  return (
    <SessionProvider session={session}>
      {/* Con prefers-reduced-motion, framer-motion no anima (también en el primer render, donde useReducedMotion aún es null). */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </SessionProvider>
  );
}

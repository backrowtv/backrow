"use client";

import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

/**
 * LazyMotion provider that loads animation features on demand.
 * Wrap components that use motion animations with this to reduce initial bundle size.
 *
 * Usage:
 * ```tsx
 * import { MotionProvider, m, AnimatePresence } from "@/lib/motion";
 *
 * function MyComponent() {
 *   return (
 *     <MotionProvider>
 *       <AnimatePresence>
 *         <m.div animate={{ opacity: 1 }} />
 *       </AnimatePresence>
 *     </MotionProvider>
 *   );
 * }
 * ```
 *
 * Note: Use `m.div`, `m.button`, etc. instead of `motion.div`, `motion.button`
 * when using the lazy motion provider.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}

// Re-export lazy motion primitives
export { m, AnimatePresence };

// Re-export types for convenience
export type { AnimatePresenceProps } from "framer-motion";
export type { HTMLMotionProps } from "framer-motion";

"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ContentRevealerProps {
  children: ReactNode;
  skeleton: ReactNode;
  isLoading: boolean;
  /** @deprecated Kept for API compatibility; no longer used. Swap is instant. */
  duration?: number;
  className?: string;
}

// Shared easing for other helpers below.
const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * ContentRevealer - instant swap between skeleton and content.
 *
 * The previous implementation used an AnimatePresence crossfade that delayed
 * real content's first paint by ~240ms. That trade (polish for perceived
 * latency) didn't pay off, so this is now a straight conditional render.
 *
 * For intentional entry animations, use FadeIn / StaggerChildren below.
 */
export function ContentRevealer({
  children,
  skeleton,
  isLoading,
  className = "",
}: ContentRevealerProps) {
  return <div className={className}>{isLoading ? skeleton : children}</div>;
}

/**
 * SuspenseRevealer - A wrapper for React Suspense that adds smooth transitions.
 *
 * Wraps Suspense boundaries to ensure content fades in smoothly
 * when the suspended content resolves.
 *
 * Usage:
 * ```tsx
 * <SuspenseRevealer fallback={<Skeleton />}>
 *   <AsyncComponent />
 * </SuspenseRevealer>
 * ```
 */
interface SuspenseRevealerProps {
  children: ReactNode;
  fallback?: ReactNode;
  /** Duration of the fade-in in milliseconds (default: 500) */
  duration?: number;
  className?: string;
}

export function SuspenseRevealer({
  children,
  fallback: _fallback,
  duration = 500,
  className = "",
}: SuspenseRevealerProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        transition: {
          duration: duration / 1000,
          ease: easeOutExpo,
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * FadeIn - Simple fade-in wrapper for any content.
 *
 * Use this to wrap content that should smoothly fade in on mount.
 * Great for staggered animations when combined with delay.
 *
 * Usage:
 * ```tsx
 * <FadeIn delay={0.1}>
 *   <Card />
 * </FadeIn>
 * ```
 */
interface FadeInProps {
  children: ReactNode;
  /** Delay before animation starts in seconds (default: 0) */
  delay?: number;
  /** Duration of fade in seconds (default: 0.5) */
  duration?: number;
  /** Also animate vertical position (default: true) */
  slideUp?: boolean;
  className?: string;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.5,
  slideUp = true,
  className = "",
}: FadeInProps) {
  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        y: slideUp ? 8 : 0,
      }}
      animate={{
        opacity: 1,
        y: 0,
        transition: {
          duration,
          delay,
          ease: easeOutExpo,
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * StaggerChildren - Wrapper that staggers child animations.
 *
 * Children should use motion components or FadeIn for the stagger effect.
 *
 * Usage:
 * ```tsx
 * <StaggerChildren>
 *   <FadeIn><Card1 /></FadeIn>
 *   <FadeIn><Card2 /></FadeIn>
 *   <FadeIn><Card3 /></FadeIn>
 * </StaggerChildren>
 * ```
 */
interface StaggerChildrenProps {
  children: ReactNode;
  /** Delay between each child in seconds (default: 0.08) */
  staggerDelay?: number;
  className?: string;
}

export function StaggerChildren({
  children,
  staggerDelay = 0.08,
  className = "",
}: StaggerChildrenProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * StaggerItem - Individual item for use inside StaggerChildren.
 */
interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className = "" }: StaggerItemProps) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.4,
            ease: easeOutExpo,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

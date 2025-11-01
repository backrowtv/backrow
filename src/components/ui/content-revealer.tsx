"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode, useRef } from "react";

interface ContentRevealerProps {
  /** The actual content to display once loaded */
  children: ReactNode;
  /** The skeleton/placeholder to show while loading */
  skeleton: ReactNode;
  /** Whether the content is still loading */
  isLoading: boolean;
  /** Duration of the crossfade in milliseconds (default: 400) */
  duration?: number;
  /** Optional className for the wrapper */
  className?: string;
}

// Smooth easing for premium dissolve effect
const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];
const easeIn: [number, number, number, number] = [0.4, 0, 1, 1];

/**
 * ContentRevealer - Smoothly crossfades from skeleton to real content.
 *
 * Instead of skeletons disappearing instantly when content loads,
 * this creates a dissolve effect where the skeleton fades out
 * as the content fades in, overlapping for a seamless transition.
 *
 * Usage:
 * ```tsx
 * <ContentRevealer
 *   isLoading={isLoading}
 *   skeleton={<MySkeleton />}
 * >
 *   <ActualContent />
 * </ContentRevealer>
 * ```
 */
export function ContentRevealer({
  children,
  skeleton,
  isLoading,
  duration = 400,
  className = "",
}: ContentRevealerProps) {
  // Track if we've ever finished loading (for initial mount)
  // Use a ref since this only affects animation and doesn't need to trigger re-renders
  const hasLoadedRef = useRef(!isLoading);

  // Update ref when loading finishes (this doesn't cause re-renders)
  if (!isLoading && !hasLoadedRef.current) {
    hasLoadedRef.current = true;
  }

  const hasLoaded = hasLoadedRef.current;

  const durationInSeconds = duration / 1000;

  return (
    <div className={`relative ${className}`}>
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton"
            initial={hasLoaded ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{
              opacity: 0,
              transition: {
                duration: durationInSeconds * 0.6, // Skeleton exits faster
                ease: easeIn,
              },
            }}
          >
            {skeleton}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              transition: {
                duration: durationInSeconds,
                ease: easeOutExpo,
                // Slight delay so skeleton starts fading first
                delay: 0.05,
              },
            }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
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

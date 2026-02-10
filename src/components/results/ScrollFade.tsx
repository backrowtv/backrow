"use client";

import { useState, useRef, useCallback, type ReactNode } from "react";

interface ScrollFadeProps {
  maxHeight: string;
  children: ReactNode;
  className?: string;
}

/**
 * Scrollable container with a bottom fade mask that hides when scrolled to the bottom.
 */
export function ScrollFade({ maxHeight, children, className }: ScrollFadeProps) {
  const [showFade, setShowFade] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    setShowFade(!atBottom);
  }, []);

  return (
    <div className={`relative ${className ?? ""}`}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="overflow-y-auto scrollbar-hide"
        style={{ maxHeight }}
      >
        {children}
      </div>
      {showFade && (
        <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-[var(--card)] to-transparent pointer-events-none" />
      )}
    </div>
  );
}

"use client";

import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CollapsibleTextProps {
  text: string;
  maxLines?: number;
  className?: string;
  /** @deprecated Use maxLines instead */
  maxLength?: number;
}

export function CollapsibleText({ text, maxLines = 4, className }: CollapsibleTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el || isExpanded) return;

    const check = () => setNeedsTruncation(el.scrollHeight > el.clientHeight + 1);

    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, maxLines, isExpanded]);

  const lineClampClass =
    {
      3: "line-clamp-3",
      4: "line-clamp-4",
      5: "line-clamp-5",
      6: "line-clamp-6",
    }[maxLines] ?? "line-clamp-4";

  return (
    <div
      role="button"
      tabIndex={needsTruncation ? 0 : undefined}
      onClick={() => (isExpanded || needsTruncation) && setIsExpanded((prev) => !prev)}
      onKeyDown={(e) => {
        if ((isExpanded || needsTruncation) && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          setIsExpanded((prev) => !prev);
        }
      }}
      className={cn("relative", needsTruncation && "cursor-pointer", className)}
    >
      <p
        ref={textRef}
        className={cn(
          "text-sm text-[var(--text-secondary)] leading-relaxed break-words",
          !isExpanded && lineClampClass
        )}
      >
        {text}
      </p>
      {needsTruncation && !isExpanded && (
        <div
          className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, var(--fade-target, var(--background)), transparent)",
          }}
        />
      )}
    </div>
  );
}

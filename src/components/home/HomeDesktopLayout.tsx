"use client";

import { useState, type KeyboardEvent, type MouseEvent } from "react";

interface HomeDesktopLayoutProps {
  leftColumn: React.ReactNode;
  theaterFrame: React.ReactNode;
  centerContent: React.ReactNode;
  rightColumn: React.ReactNode;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("a, button") !== null;
}

export function HomeDesktopLayout({
  leftColumn,
  theaterFrame,
  centerContent,
  rightColumn,
}: HomeDesktopLayoutProps) {
  const [expanded, setExpanded] = useState(false);

  const handleClick = (next: boolean) => (e: MouseEvent<HTMLDivElement>) => {
    if (isInteractiveTarget(e.target)) return;
    setExpanded(next);
  };

  const handleKeyDown = (next: boolean) => (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    if (isInteractiveTarget(e.target)) return;
    e.preventDefault();
    setExpanded(next);
  };

  return (
    <div>
      {/* Theater Frame — full width when expanded, shown above the grid */}
      {expanded && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Collapse theater"
          className="mb-6 cursor-pointer w-full"
          onClick={handleClick(false)}
          onKeyDown={handleKeyDown(false)}
        >
          {theaterFrame}
        </div>
      )}

      {/* Three Column Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="col-span-3 space-y-4">{leftColumn}</div>

        {/* Center Column */}
        <div className="col-span-6 space-y-4">
          {/* Theater Frame — in center column when collapsed */}
          {!expanded && (
            <div
              role="button"
              tabIndex={0}
              aria-label="Expand theater"
              className="cursor-pointer w-full"
              onClick={handleClick(true)}
              onKeyDown={handleKeyDown(true)}
            >
              {theaterFrame}
            </div>
          )}

          {centerContent}
        </div>

        {/* Right Column */}
        <aside className="col-span-3">{rightColumn}</aside>
      </div>
    </div>
  );
}

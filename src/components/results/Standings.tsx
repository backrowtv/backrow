"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface StandingsEntry {
  user_id: string;
  user_name: string;
  points: number;
}

interface StandingsProps {
  entries: StandingsEntry[];
  revealType?: "automatic" | "manual"; // Default: 'manual'
  revealDirection?: "forward" | "backward"; // Default: 'forward'
  revealDelaySeconds?: number; // Default: 5 (for automatic)
  enableRevealAnimation?: boolean; // Legacy prop for backward compatibility
}

export function Standings({
  entries,
  revealType = "manual",
  revealDirection = "forward",
  revealDelaySeconds = 5,
  enableRevealAnimation = false,
}: StandingsProps) {
  const [revealedCount, setRevealedCount] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Use legacy enableRevealAnimation if revealType not provided (backward compatibility)
  const effectiveRevealType = enableRevealAnimation ? "automatic" : revealType;

  useEffect(() => {
    if (entries.length === 0) {
      setRevealedCount(0);
      return;
    }

    // If manual reveal, start with 0 revealed
    if (effectiveRevealType === "manual") {
      setRevealedCount(0);
      setIsRevealing(true);
      return;
    }

    // Automatic reveal logic
    if (effectiveRevealType === "automatic") {
      setIsRevealing(true);
      setRevealedCount(0);
      setCountdown(3);

      let revealInterval: NodeJS.Timeout | null = null;
      let countdownInterval: NodeJS.Timeout | null = null;

      // Countdown: 3 seconds
      countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownInterval) clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      const countdownTimeout = setTimeout(() => {
        // Determine reveal order based on direction
        let currentIndex: number;
        let step: number;

        if (revealDirection === "forward") {
          // Forward: Last place → First place (winner)
          currentIndex = entries.length - 1;
          step = -1;
        } else {
          // Backward: First place → Last place
          currentIndex = 0;
          step = 1;
        }

        revealInterval = setInterval(() => {
          if (
            (revealDirection === "forward" && currentIndex >= 0) ||
            (revealDirection === "backward" && currentIndex < entries.length)
          ) {
            setRevealedCount((prev) => prev + 1);
            currentIndex += step;
          } else {
            if (revealInterval) clearInterval(revealInterval);
            setIsRevealing(false);
          }
        }, revealDelaySeconds * 1000);
      }, 3000);

      return () => {
        clearTimeout(countdownTimeout);
        if (revealInterval) clearInterval(revealInterval);
        if (countdownInterval) clearInterval(countdownInterval);
      };
    } else {
      // All at once - show everything immediately
      setRevealedCount(entries.length);
      setIsRevealing(false);
    }
  }, [effectiveRevealType, revealDirection, revealDelaySeconds, entries.length]);

  const handleRevealNext = () => {
    if (revealedCount < entries.length) {
      setRevealedCount((prev) => prev + 1);
    }
    if (revealedCount >= entries.length - 1) {
      setIsRevealing(false);
    }
  };

  const handleRevealAll = () => {
    setRevealedCount(entries.length);
    setIsRevealing(false);
  };
  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <p style={{ color: "var(--text-secondary)" }}>No results yet.</p>
      </div>
    );
  }

  // Determine which entries should be revealed based on direction
  const getRevealedEntries = () => {
    if (revealDirection === "forward") {
      // Forward: Show last N entries (from bottom up)
      return entries.slice(-revealedCount);
    } else {
      // Backward: Show first N entries (from top down)
      return entries.slice(0, revealedCount);
    }
  };

  const _revealedEntries = effectiveRevealType === "manual" ? getRevealedEntries() : entries;
  const allRevealed = revealedCount >= entries.length;

  // Show countdown if automatic reveal
  const showCountdown =
    effectiveRevealType === "automatic" && isRevealing && revealedCount === 0 && countdown > 0;

  // Determine display order for entries
  const displayEntries = revealDirection === "forward" ? [...entries].reverse() : entries;

  return (
    <div className="space-y-4">
      {showCountdown && (
        <div className="text-center py-8 animate-pulse">
          <div className="text-4xl font-bold mb-2" style={{ color: "var(--primary)" }}>
            {countdown}
          </div>
          <p style={{ color: "var(--text-secondary)" }}>Results loading...</p>
        </div>
      )}

      {/* Manual reveal controls */}
      {effectiveRevealType === "manual" && isRevealing && !allRevealed && (
        <div
          className="flex items-center justify-between p-4 rounded-lg border"
          style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {revealedCount} of {entries.length} revealed
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {revealDirection === "forward"
                ? "Revealing from last place to winner"
                : "Revealing from winner to last place"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRevealAll}>
              Reveal All
            </Button>
            <Button size="sm" onClick={handleRevealNext}>
              Reveal Next
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {displayEntries.map((displayEntry, displayIndex) => {
          // Map display index back to original index
          const originalIndex =
            revealDirection === "forward" ? entries.length - 1 - displayIndex : displayIndex;
          const entry = entries[originalIndex];
          const isFirst = originalIndex === 0;
          const isSecond = originalIndex === 1;
          const isThird = originalIndex === 2;

          // Determine background and border colors based on rank
          const getRankStyles = () => {
            if (isFirst) {
              return {
                backgroundColor: "var(--surface-2)",
                borderColor: "var(--primary)",
              };
            } else if (isSecond) {
              return {
                backgroundColor: "var(--surface-2)",
                borderColor: "var(--border)",
              };
            } else if (isThird) {
              return {
                backgroundColor: "var(--surface-1)",
                borderColor: "var(--border)",
              };
            } else {
              return {
                backgroundColor: "var(--surface-1)",
                borderColor: "var(--border)",
              };
            }
          };

          const getBadgeStyles = () => {
            if (isFirst) {
              return { backgroundColor: "var(--primary)", color: "var(--text-primary)" };
            } else if (isSecond) {
              return { backgroundColor: "var(--surface-3)", color: "var(--text-primary)" };
            } else if (isThird) {
              return { backgroundColor: "var(--surface-2)", color: "var(--text-primary)" };
            } else {
              return { backgroundColor: "var(--surface-2)", color: "var(--text-primary)" };
            }
          };

          const rankStyles = getRankStyles();
          const badgeStyles = getBadgeStyles();

          // Determine if this entry should be revealed
          let isRevealed: boolean;
          if (effectiveRevealType === "manual") {
            if (revealDirection === "forward") {
              // Forward: reveal from last to first
              isRevealed = originalIndex >= entries.length - revealedCount;
            } else {
              // Backward: reveal from first to last
              isRevealed = originalIndex < revealedCount;
            }
          } else if (effectiveRevealType === "automatic") {
            if (revealDirection === "forward") {
              isRevealed = originalIndex >= entries.length - revealedCount;
            } else {
              isRevealed = originalIndex < revealedCount;
            }
          } else {
            // All at once
            isRevealed = true;
          }

          const revealDelay =
            effectiveRevealType === "automatic"
              ? revealDirection === "forward"
                ? (entries.length - originalIndex - 1) * revealDelaySeconds * 1000
                : originalIndex * revealDelaySeconds * 1000
              : 0;

          return (
            <div
              key={entry.user_id}
              className={`flex items-center justify-between rounded-lg p-4 border transition-all ${
                isRevealed ? "animate-fade-in" : "opacity-0 blur-sm pointer-events-none"
              }`}
              style={{
                ...rankStyles,
                animationDelay: isRevealed ? `${revealDelay}ms` : "0ms",
                transform: isRevealed ? "scale(1)" : "scale(0.95)",
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold"
                  style={badgeStyles}
                >
                  {isFirst ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ) : (
                    originalIndex + 1
                  )}
                </div>
                <div>
                  <div
                    className="font-medium truncate max-w-[150px] sm:max-w-[200px]"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {entry.user_name}
                  </div>
                </div>
              </div>
              <div
                className="text-lg font-bold"
                style={{
                  color: "var(--text-primary)",
                }}
              >
                {entry.points > 0 ? "+" : ""}
                {entry.points.toFixed(1)} {entry.points === 1 ? "pt" : "pts"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

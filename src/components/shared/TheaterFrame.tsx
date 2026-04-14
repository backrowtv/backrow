"use client";

import { useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface TheaterFrameProps {
  /** Image URL to display (optional — omit for content-only screens) */
  image?: string;
  /** Alt text for the image */
  alt?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to prioritize image loading */
  priority?: boolean;
  /** Content to overlay on the theater frame (e.g., hero text) */
  children?: React.ReactNode;
  /** Whether expand on click is enabled (desktop only) */
  expandable?: boolean;
  /** Callback when expanded state changes */
  onExpandChange?: (expanded: boolean) => void;
  /** Optional max-width class to constrain the frame (e.g. "max-w-3xl") */
  maxWidth?: string;
  /** When true, children are centered on the screen area instead of bottom-left overlay */
  centerContent?: boolean;
}

export function TheaterFrame({
  image,
  alt = "",
  className,
  priority = false,
  children,
  expandable = false,
  onExpandChange,
  maxWidth,
  centerContent = false,
}: TheaterFrameProps) {
  const [expanded, setExpanded] = useState(false);

  const handleClick = () => {
    if (!expandable) return;
    const next = !expanded;
    setExpanded(next);
    onExpandChange?.(next);
  };

  return (
    <div
      className={cn(
        "w-full flex justify-center px-3 sm:px-4 mb-4 sm:mb-6 mt-4 lg:mt-0 pt-0",
        className
      )}
    >
      <div className={cn("relative w-full", maxWidth)}>
        {/* Outer theater container */}
        <div
          role={expandable ? "button" : undefined}
          tabIndex={expandable ? 0 : undefined}
          aria-label={expandable ? "Expand theater" : undefined}
          className={cn(
            "relative w-full overflow-hidden bg-black",
            "rounded-xl sm:rounded-2xl",
            "border-4 sm:border-[6px] border-neutral-800",
            "transition-all duration-500 ease-in-out",
            expandable && "cursor-pointer"
          )}
          style={{
            aspectRatio: "1.85 / 1",
            boxShadow: `
              0 4px 20px var(--theater-glow),
              0 1px 3px var(--theater-glow-spread),
              inset 0 0 20px rgba(0,0,0,0.8)
            `,
          }}
          onClick={handleClick}
          onKeyDown={(e: KeyboardEvent) => {
            if (expandable && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              handleClick();
            }
          }}
        >
          {/* Inner bezel highlight */}
          <div
            className="absolute inset-0 z-10 pointer-events-none rounded-lg sm:rounded-xl"
            style={{
              boxShadow: "inset 0 0 10px rgba(0,0,0,0.5)",
            }}
          />

          {/* Inner movie screen — inset from outer frame with its own border and glow */}
          <div
            className="absolute overflow-hidden border-2 border-neutral-700"
            style={{
              top: "2.5%",
              left: "2%",
              right: "2%",
              height: "80%",
              boxShadow: `
                0 0 25px rgba(255,255,255,0.2),
                0 0 50px rgba(255,255,255,0.08),
                0 0 80px rgba(200,220,210,0.05),
                inset 0 0 15px rgba(0,0,0,0.6)
              `,
            }}
          >
            {image ? (
              <Image
                src={image}
                alt={alt}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 90vw, 1280px"
                className="object-cover"
                priority={priority}
                unoptimized={image.endsWith(".gif")}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 to-black" />
            )}

            {/* Centered screen content */}
            {centerContent && children && (
              <div className="absolute inset-0 z-[15] flex items-center justify-center">
                {children}
              </div>
            )}
          </div>

          {/* Silhouettes — sit in the dark theater floor zone at the bottom */}
          <div
            className="absolute left-0 right-0 z-[12] pointer-events-none"
            style={{
              bottom: "-7%",
              transform: "scaleX(1.18) scale(0.85)",
              transformOrigin: "center bottom",
              filter: "brightness(0.55)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/backgrounds/theater-audience-v2.png"
              alt="Theater audience silhouettes"
              className="w-full object-contain object-bottom"
            />
          </div>

          {/* Overlay content (hero text, buttons) — bottom-left of outer theater frame */}
          {children && !centerContent && (
            <div className="absolute bottom-0 left-0 z-[15] flex flex-col justify-end pb-3 sm:pb-5 px-4 sm:px-6">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

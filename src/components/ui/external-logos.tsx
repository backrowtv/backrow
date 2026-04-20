"use client";

import { cn } from "@/lib/utils";
import { BrandLogo } from "./brand-logo";

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * Logo name to registry key mapping
 * Kept here for backwards compatibility and reference
 */
export const LOGO_NAMES = {
  imdb: "IMDb",
  letterboxd: "Letterboxd",
  tmdb: "TMDB",
  trakt: "Trakt",
  wikipedia: "Wikipedia",

  youtube: "YouTube",
  twitter: "X",
  instagram: "Instagram",
  reddit: "Reddit",
  discord: "Discord",
  tiktok: "TikTok",
} as const;

// IMDb Logo
export function IMDbLogo({ className, size = 32 }: LogoProps) {
  return <BrandLogo name="imdb" size={size} className={className} />;
}

// Letterboxd Logo
export function LetterboxdLogo({ className, size = 24 }: LogoProps) {
  return <BrandLogo name="letterboxd" size={size} className={className} />;
}

// TMDB Logo
export function TMDbLogo({ className, size = 32 }: LogoProps) {
  return <BrandLogo name="tmdb" size={size} className={className} />;
}

// Trakt Logo
export function TraktLogo({ className, size = 24 }: LogoProps) {
  return <BrandLogo name="trakt" size={size} className={className} />;
}

// Wikipedia Logo
export function WikipediaLogo({ className, size = 24 }: LogoProps) {
  return <BrandLogo name="wikipedia" size={size} className={className} />;
}

// YouTube Logo
export function YouTubeLogo({ className, size = 24 }: LogoProps) {
  return <BrandLogo name="youtube" size={size} className={className} />;
}

// X Logo
export function TwitterLogo({ className, size = 24 }: LogoProps) {
  return <BrandLogo name="twitter" size={size} className={className} />;
}

// Instagram Logo
export function InstagramLogo({ className, size = 24 }: LogoProps) {
  return <BrandLogo name="instagram" size={size} className={className} />;
}

// Reddit Logo
export function RedditLogo({ className, size = 24 }: LogoProps) {
  return <BrandLogo name="reddit" size={size} className={className} />;
}

// Discord Logo
export function DiscordLogo({ className, size = 24 }: LogoProps) {
  return <BrandLogo name="discord" size={size} className={className} />;
}

// TikTok Logo
export function TikTokLogo({ className, size = 24 }: LogoProps) {
  return <BrandLogo name="tiktok" size={size} className={className} />;
}

// Combined external link component with logo
interface ExternalLinkProps {
  href: string;
  logo: "imdb" | "letterboxd" | "tmdb" | "trakt" | "wikipedia";
  label?: string;
  className?: string;
}

// Fixed button size for consistent layout on both mobile and desktop
const BUTTON_HEIGHT = 44; // 44px touch target (accessibility standard)
const LOGO_SIZE = 20; // Uniform logo height for all logos

export function ExternalLink({ href, logo, label, className }: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center",
        "opacity-80 hover:opacity-100",
        "transition-all duration-200",
        "group",
        "px-0.5", // Tight horizontal padding so 5 links fit on one line on mobile
        className
      )}
      style={{
        height: BUTTON_HEIGHT,
        minHeight: BUTTON_HEIGHT,
      }}
      title={label || `View on ${LOGO_NAMES[logo]}`}
    >
      <span className="group-hover:scale-110 transition-transform duration-200 flex items-center justify-center">
        <BrandLogo name={logo} size={LOGO_SIZE} />
      </span>
    </a>
  );
}

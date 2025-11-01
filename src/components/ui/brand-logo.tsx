"use client";

import { useState, useEffect, ComponentType } from "react";
import Image from "next/image";
import { ImageBroken } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { getLogoConfig, getSvglComponentName } from "@/lib/logos/registry";
import type { SVGProps } from "react";

interface BrandLogoProps {
  /**
   * Logo registry key (e.g., 'netflix', 'imdb', 'letterboxd')
   */
  name: string;
  /**
   * Size in pixels (height, width calculated from aspect ratio)
   */
  size?: number;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Optional TMDB logo path for streaming providers
   * Used as fallback when registry has no fallback URL
   */
  tmdbLogoPath?: string | null;
}

// Cache for dynamically imported svgl components
const componentCache = new Map<string, ComponentType<SVGProps<SVGSVGElement>>>();

/**
 * Dynamically import an svgl-react component by name
 */
async function loadSvglComponent(
  componentName: string
): Promise<ComponentType<SVGProps<SVGSVGElement>> | null> {
  // Check cache first
  if (componentCache.has(componentName)) {
    return componentCache.get(componentName)!;
  }

  try {
    const svglModule = await import("@ridemountainpig/svgl-react");
    // The module exports both components (functions) and URL strings
    // We need to check if the export is a function (component)
    const maybeComponent = (svglModule as Record<string, unknown>)[componentName];

    if (typeof maybeComponent === "function") {
      const Component = maybeComponent as ComponentType<SVGProps<SVGSVGElement>>;
      componentCache.set(componentName, Component);
      return Component;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Placeholder shown while loading or on error
 */
function LogoPlaceholder({ size, className }: { size: number; className?: string }) {
  return (
    <div
      className={cn("flex items-center justify-center rounded bg-[var(--surface-2)]", className)}
      style={{ width: size, height: size }}
    >
      <ImageBroken
        className="text-[var(--text-muted)]"
        style={{ width: size * 0.5, height: size * 0.5 }}
      />
    </div>
  );
}

/**
 * CDN fallback image component
 */
function FallbackImage({
  src,
  alt,
  size,
  aspectRatio = 1,
  className,
  onError,
}: {
  src: string;
  alt: string;
  size: number;
  aspectRatio?: number;
  className?: string;
  onError?: () => void;
}) {
  const width = size * aspectRatio;
  return (
    <div className={cn("relative flex-shrink-0", className)} style={{ width, height: size }}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`${width}px`}
        className="object-contain"
        unoptimized
        onError={onError}
      />
    </div>
  );
}

/**
 * Svgl component wrapper with error boundary
 */
function SvglLogo({
  componentName,
  size,
  aspectRatio = 1,
  className,
  onError,
}: {
  componentName: string;
  size: number;
  aspectRatio?: number;
  className?: string;
  onError: () => void;
}) {
  const [Component, setComponent] = useState<ComponentType<SVGProps<SVGSVGElement>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadSvglComponent(componentName)
      .then((comp) => {
        if (!cancelled) {
          if (comp) {
            setComponent(() => comp);
          } else {
            setError(true);
            onError();
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
          onError();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [componentName, onError]);

  if (loading) {
    return <LogoPlaceholder size={size} className={className} />;
  }

  if (error || !Component) {
    return null; // Parent will handle fallback
  }

  return (
    <Component
      className={cn("flex-shrink-0", className)}
      style={{
        width: size * aspectRatio,
        height: size,
      }}
    />
  );
}

/**
 * BrandLogo - Unified logo component with svgl-react primary and CDN fallback
 *
 * Tries to load the logo from svgl-react first, falls back to CDN URL,
 * and shows a placeholder icon if both fail.
 *
 * @example
 * ```tsx
 * // Movie database logos
 * <BrandLogo name="imdb" size={32} />
 * <BrandLogo name="letterboxd" size={24} />
 *
 * // Streaming logos (svgl available)
 * <BrandLogo name="netflix" size={24} />
 *
 * // Streaming logos with TMDB fallback
 * <BrandLogo name="max" size={24} tmdbLogoPath="/provider/logo.png" />
 * ```
 */
export function BrandLogo({ name, size = 24, className, tmdbLogoPath }: BrandLogoProps) {
  const theme = useTheme();
  const [useFallback, setUseFallback] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);

  const config = getLogoConfig(name);

  // If no config found, try to use TMDB logo path directly
  if (!config) {
    if (tmdbLogoPath) {
      return (
        <FallbackImage
          src={`https://image.tmdb.org/t/p/w200${tmdbLogoPath}`}
          alt={name}
          size={size}
          className={className}
          onError={() => setFallbackFailed(true)}
        />
      );
    }
    return <LogoPlaceholder size={size} className={className} />;
  }

  const svglComponentName = getSvglComponentName(config, theme);
  const aspectRatio = config.aspectRatio || 1;

  // If both svgl and fallback have failed, show placeholder
  if (fallbackFailed) {
    return <LogoPlaceholder size={size} className={className} />;
  }

  // If svgl failed or not available, use fallback
  if (useFallback || !svglComponentName) {
    // Determine fallback URL
    const fallbackUrl =
      config.fallback || (tmdbLogoPath ? `https://image.tmdb.org/t/p/w200${tmdbLogoPath}` : null);

    if (fallbackUrl) {
      return (
        <FallbackImage
          src={fallbackUrl}
          alt={config.name}
          size={size}
          aspectRatio={aspectRatio}
          className={className}
          onError={() => setFallbackFailed(true)}
        />
      );
    }

    // No fallback available
    return <LogoPlaceholder size={size} className={className} />;
  }

  // Try svgl component first
  return (
    <SvglLogo
      componentName={svglComponentName}
      size={size}
      aspectRatio={aspectRatio}
      className={className}
      onError={() => setUseFallback(true)}
    />
  );
}

/**
 * Get the accessible name for a logo
 */
export function getLogoName(key: string): string {
  const config = getLogoConfig(key);
  return config?.name || key;
}

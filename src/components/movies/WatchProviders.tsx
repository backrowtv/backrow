"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";
import Image from "next/image";
import { getPosterUrl } from "@/lib/tmdb/client";
import { BrandLogo } from "@/components/ui/brand-logo";
import { getLogoKeyForProvider } from "@/lib/logos/streaming-providers";

interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

interface WatchProvidersProps {
  providers: {
    flatrate?: WatchProvider[];
    rent?: WatchProvider[];
    buy?: WatchProvider[];
  } | null;
  justWatchUrl: string | null;
  isVisible?: boolean;
}

// Top providers whose logos we show inline (by provider_id)
const TOP_PROVIDER_IDS = new Set([
  8, // Netflix
  9,
  10,
  119, // Amazon Prime Video
  337,
  390, // Disney+
  15, // Hulu
  384,
  1899, // Max
  531,
  582, // Paramount+
  350,
  2, // Apple TV+
  386,
  387, // Peacock
  73, // Tubi
  283, // Crunchyroll
]);

function ProviderLogo({ provider }: { provider: WatchProvider }) {
  const logoKey = getLogoKeyForProvider(provider.provider_id, provider.provider_name);
  const logoUrl = getPosterUrl(provider.logo_path);

  if (logoKey) {
    return (
      <BrandLogo name={logoKey} size={20} tmdbLogoPath={provider.logo_path} className="rounded" />
    );
  }

  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={provider.provider_name}
        width={20}
        height={20}
        className="rounded"
      />
    );
  }

  return null;
}

export function WatchProviders({ providers, justWatchUrl, isVisible = true }: WatchProvidersProps) {
  if (!isVisible || !justWatchUrl) {
    return null;
  }

  // Collect all providers, dedupe by ID, keep only top providers
  const allProviders = [
    ...(providers?.flatrate || []),
    ...(providers?.rent || []),
    ...(providers?.buy || []),
  ];

  const seen = new Set<number>();
  const topProviders: WatchProvider[] = [];
  for (const p of allProviders) {
    if (TOP_PROVIDER_IDS.has(p.provider_id) && !seen.has(p.provider_id)) {
      seen.add(p.provider_id);
      topProviders.push(p);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {topProviders.length > 0 && (
        <div className="flex items-center gap-1.5">
          {topProviders.map((p) => (
            <span key={p.provider_id} title={p.provider_name}>
              <ProviderLogo provider={p} />
            </span>
          ))}
        </div>
      )}
      <a
        href={justWatchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        <span>View on JustWatch</span>
        <ArrowSquareOut className="h-3 w-3" />
      </a>
    </div>
  );
}

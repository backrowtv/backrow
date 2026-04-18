import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withBotId } from "botid/next/config";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// Next.js 16 Configuration
const nextConfig: NextConfig = {
  // Allow CodeSandbox dev origins for Onlook integration + local network for mobile testing
  allowedDevOrigins: ["*.csb.app", "192.168.1.110"],
  // Enable Cache Components (Next.js 16+) for 'use cache' directive
  cacheComponents: true,
  // These packages must be treated as real Node externals (not wrapped in
  // Turbopack's externalImport runtime helper). Without this, Turbopack
  // emits calls like `.y("import-in-the-middle-<hash>")` at runtime which
  // throw `Failed to load external module: ERR_MODULE_NOT_FOUND` because
  // the hash-suffixed id doesn't resolve. Covers Sentry's OpenTelemetry
  // instrumentation deps + jsdom (server-side isomorphic-dompurify) + sharp.
  serverExternalPackages: ["import-in-the-middle", "require-in-the-middle", "jsdom", "sharp"],
  // React Compiler (stable in Next.js 16) - automatic memoization
  // Reduces re-renders by 25-40% without manual useMemo/useCallback
  reactCompiler: true,
  // Optimize package imports for better tree-shaking and smaller bundles
  experimental: {
    optimizePackageImports: [
      // Icons
      "@phosphor-icons/react",
      // Animation
      "framer-motion",
      // Notifications
      "react-hot-toast",
      // Radix UI components
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-separator",
      "@radix-ui/react-tooltip",
      // Date utilities
      "date-fns",
      // Charts
      "recharts",
      // Carousel
      "embla-carousel-react",
      // Drag and drop
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
    ],
    serverActions: {
      // Increase body size limit for file uploads (default is 1MB)
      // Set to 16MB to allow iPhone HEIF photos and other large images
      bodySizeLimit: "16mb",
    },
    // Enable client-side Router Cache for navigation (Letterboxd-style)
    // In Next.js 15+, dynamic pages default to staleTime=0 (always refetch)
    // Setting this enables caching so revisiting pages is instant
    staleTimes: {
      dynamic: 3600, // Cache dynamic pages for 1 hour during session
      static: 3600, // Cache static pages for 1 hour
    },
  },
  images: {
    // Modern formats served with content negotiation:
    // AVIF → WebP → JPEG/PNG fallback. ~30% smaller than WebP, ~50% smaller than JPEG.
    formats: ["image/avif", "image/webp"],
    // 31 days — optimized variants stay cached instead of regenerating every 60s (default).
    minimumCacheTTL: 2678400,
    // Next.js 16 requires this allowlist for any custom `quality` prop.
    // 75 = default, 85 = high-quality, 95 = hero/LCP images.
    qualities: [75, 85, 95],
    localPatterns: [
      {
        pathname: "/images/**",
        search: "",
      },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "www.themoviedb.org",
        pathname: "/assets/**",
      },
      // External service logos - Official brand logos
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/wikipedia/commons/**",
      },
      {
        protocol: "https",
        hostname: "a.ltrbxd.com",
        pathname: "/logos/**",
      },
      {
        protocol: "https",
        hostname: "trakt.tv",
        pathname: "/assets/logos/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      // Supabase Storage (local dev)
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
      // Supabase Storage (production - BackRow project)
      {
        protocol: "https",
        hostname: "nxpeptgrhbveqphwwowj.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Festival poster domains
      {
        protocol: "https",
        hostname: "festival.sundance.org",
      },
      {
        protocol: "https",
        hostname: "www.sxsw.com",
      },
      {
        protocol: "https",
        hostname: "www.festival-cannes.com",
      },
      {
        protocol: "https",
        hostname: "www.tribecafilm.com",
      },
      {
        protocol: "https",
        hostname: "www.labiennale.org",
      },
      {
        protocol: "https",
        hostname: "www.tiff.net",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/profile/future-nominations",
        destination: "/profile/nominations",
        permanent: true,
      },
      {
        source: "/profile/settings/navigation",
        destination: "/profile/settings/display",
        permanent: true,
      },
    ];
  },
};

// withSentryConfig removed: @sentry/nextjs' build-time wrapper pulls in the
// OpenTelemetry instrumentation chain (import-in-the-middle/require-in-the-middle)
// which Turbopack hash-wraps and fails to resolve at runtime on Vercel Functions.
// See instrumentation.ts header for the full rationale. Client-side Sentry
// in sentry.client.config.ts is untouched and still captures browser errors.
export default withBotId(withBundleAnalyzer(nextConfig));

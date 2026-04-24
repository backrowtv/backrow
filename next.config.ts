import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// Next.js 16 Configuration
const nextConfig: NextConfig = {
  // Allow CodeSandbox dev origins for Onlook integration + local network for mobile testing
  allowedDevOrigins: ["*.csb.app", "192.168.1.110"],
  // Cache Components temporarily disabled. Re-enabling requires wrapping
  // every dynamic data access (cookies, headers, searchParams, supabase
  // auth) in <Suspense> boundaries across ~50 server pages. Multiple
  // deploys failed prerender with "Uncached data accessed outside
  // <Suspense>"; `await connection()` at layout level doesn't propagate,
  // and patching each page individually is a larger migration than a
  // prod-unblock commit can carry. Revisit once the PPR migration is
  // scoped as a dedicated project. All `"use cache"` directives were
  // stripped alongside this flip — restore them together.
  cacheComponents: false,
  // Native binary; must stay external. sharp is imported via a lazy
  // `await import("sharp")` in src/lib/image/sharp-loader.ts so @vercel/nft
  // traces it into the lambda via the dynamic-import chain without the
  // hash-externalize trap.
  serverExternalPackages: ["sharp"],
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
      {
        source: "/clubs/new",
        destination: "/create-club",
        permanent: true,
      },
    ];
  },
};

// @sentry/nextjs removed in favor of @sentry/browser for client-side error
// reporting only. The nextjs package pulls @opentelemetry/instrumentation →
// import-in-the-middle / require-in-the-middle, which Turbopack hash-wraps
// into runtime-unresolvable externals (vercel/next.js#64022 / #87737).
// Client-side Sentry init now lives in instrumentation-client.ts.
// scripts/install-hash-stubs.mjs + the remaining hash stubs stay in place
// until Next 16.3+ fixes the upstream Turbopack bug.
export default withBundleAnalyzer(nextConfig);

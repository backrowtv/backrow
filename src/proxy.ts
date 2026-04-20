import { updateSession } from "@/lib/supabase/middleware";
import { env } from "@/lib/config/env";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Root middleware for BackRow
 *
 * Handles:
 * 1. Supabase auth session management and protected route handling
 * 2. Security headers (CSP, X-Frame-Options, etc.)
 */
export async function proxy(request: NextRequest) {
  // Basic auth gate — remove SITE_PASSWORD env var to disable
  const sitePassword = env.SITE_PASSWORD;
  if (sitePassword) {
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      const [scheme, encoded] = authHeader.split(" ");
      if (scheme === "Basic" && encoded) {
        const decoded = atob(encoded);
        const [, password] = decoded.split(":");
        if (password === sitePassword) {
          // Auth passed, continue
        } else {
          return new NextResponse("Access Denied", {
            status: 401,
            headers: { "WWW-Authenticate": 'Basic realm="BackRow"' },
          });
        }
      }
    } else {
      return new NextResponse("Access Denied", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="BackRow"' },
      });
    }
  }

  // Get the response from Supabase auth middleware
  const response = await updateSession(request);

  // Add security headers to all responses
  addSecurityHeaders(response);

  return response;
}

/**
 * Add security headers to prevent common web vulnerabilities
 */
function addSecurityHeaders(response: NextResponse) {
  const isDev = process.env.NODE_ENV === "development";

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking - deny embedding in iframes
  response.headers.set("X-Frame-Options", "DENY");

  // Enable XSS filter in browsers that support it
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Control referrer information sent with requests
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Prevent DNS prefetching for privacy
  response.headers.set("X-DNS-Prefetch-Control", "off");

  // Require HTTPS (will be enforced by Vercel in production)
  // Skip in development to avoid breaking localhost
  if (!isDev) {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  // Restrict browser features not used by this app
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
  );

  // Prevent window.opener attacks and cross-origin information leaks
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");

  // Content Security Policy
  // Start permissive for development, tighten for production
  const csp = buildCSP(isDev);
  response.headers.set("Content-Security-Policy", csp);
}

/**
 * Build Content Security Policy header
 * Allows necessary sources while blocking dangerous ones
 */
function buildCSP(isDev: boolean): string {
  const directives = [
    // Default: only allow same origin
    "default-src 'self'",

    // Scripts: self + inline (needed for Next.js) + eval. 'unsafe-eval' is
    // permissive — tightening it requires a follow-up that audits every
    // eval-using dep (Next.js streaming, React DevTools, some analytics
    // SDKs). Kept for now to avoid breaking those silently. The
    // 'unsafe-inline' concession is already present for React stream
    // rendering so the incremental XSS surface from also allowing eval
    // is limited.
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",

    // Styles: self + inline (needed for styled-components, Tailwind, etc.)
    "style-src 'self' 'unsafe-inline'",

    // Images: self + data URIs + blob + allowed external sources
    [
      "img-src 'self' data: blob:",
      "https://image.tmdb.org",
      "https://www.themoviedb.org",
      "https://upload.wikimedia.org",
      "https://a.ltrbxd.com",
      "https://trakt.tv",

      "https://images.unsplash.com",
      "https://nxpeptgrhbveqphwwowj.supabase.co",
      "https://festival.sundance.org",
      "https://www.sxsw.com",
      "https://www.festival-cannes.com",
      "https://www.tribecafilm.com",
      "https://www.labiennale.org",
      "https://www.tiff.net",
      // Local development
      "http://127.0.0.1:54321",
      "http://localhost:54321",
    ].join(" "),

    // Fonts: self only
    "font-src 'self'",

    // Connect (fetch, XHR, WebSocket): self + Supabase
    [
      "connect-src 'self'",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      // Local development
      "http://127.0.0.1:54321",
      "ws://127.0.0.1:54321",
      "http://localhost:54321",
      "ws://localhost:54321",
    ].join(" "),

    // Media: self + blob (for video players)
    "media-src 'self' blob:",

    // Object/embed: none (no Flash, etc.)
    "object-src 'none'",

    // Base URI: self only
    "base-uri 'self'",

    // Form actions: self only
    "form-action 'self'",

    // Frame ancestors: none (prevent embedding, same as X-Frame-Options)
    "frame-ancestors 'none'",
  ];

  // Only upgrade insecure requests in production
  // In development, this breaks Safari loading CSS over HTTP
  if (!isDev) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (static files)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.webp$|.*\\.ico$).*)",
  ],
};

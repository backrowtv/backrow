"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

interface FooterClientProps {
  movieCredits: Record<string, { movie: string; year: number; studio: string; actor?: string }>;
  isAuthenticated?: boolean;
}

export function FooterClient({ movieCredits, isAuthenticated }: FooterClientProps) {
  const pathname = usePathname();
  const currentPageCredit = movieCredits[pathname];

  return (
    <footer
      className="border-t mt-auto pb-20 lg:pb-0 shrink-0"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface-0)",
        paddingLeft: "var(--content-left-offset, 0px)",
        transition: "padding-left 300ms ease",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Single row - everything on one line on desktop */}
        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          {/* Left: Brand + Links */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link
              href="/"
              style={{ fontFamily: "var(--font-brand)", color: "var(--text-primary)" }}
            >
              BackRow
            </Link>
            <span className="hidden sm:inline" style={{ color: "var(--border)" }}>
              |
            </span>
            <Link href="/faq">FAQ</Link>
            <Link href="/privacy-policy">Privacy</Link>
            <Link href="/terms-of-use">Terms</Link>
            <Link href="/user-agreement">User Agreement</Link>
            <Link href="/contact">Contact</Link>
            {isAuthenticated && <Link href="/feedback">Feedback</Link>}
          </div>

          {/* Right: TMDB + Copyright */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <div className="flex items-center gap-1.5">
              <div className="relative" style={{ width: 50, height: 12 }}>
                <Image
                  src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
                  alt="TMDB"
                  fill
                  sizes="50px"
                  className="opacity-60 object-contain"
                  unoptimized
                />
              </div>
            </div>
            <span>
              © {new Date().getFullYear()}{" "}
              <span style={{ fontFamily: "var(--font-brand)" }}>BackRow</span>
            </span>
          </div>
        </div>

        {/* Movie credit - only if exists, subtle.
            Suppressed on the marketing landing ("/" when signed-out) — that
            page has its own dynamic in-hero attribution for the trending
            backdrop, and the footer credit is for the authenticated home. */}
        {currentPageCredit &&
          currentPageCredit.movie &&
          !(pathname === "/" && !isAuthenticated) && (
            <div className="mt-2 text-[10px]" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
              Background: {currentPageCredit.movie}
              {currentPageCredit.year > 0 && ` (${currentPageCredit.year})`}
              {currentPageCredit.studio && ` © ${currentPageCredit.studio}`}
            </div>
          )}
      </div>
    </footer>
  );
}

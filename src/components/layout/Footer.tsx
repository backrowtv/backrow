"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

// Movie background credits - add entries here when using movie stills
const MOVIE_CREDITS: Record<
  string,
  { movie: string; year: number; studio: string; actor?: string }
> = {
  "/": {
    movie: "Once Upon a Time in Hollywood",
    year: 2019,
    studio: "Sony Pictures",
    actor: "Leonardo DiCaprio",
  },
  "/faq": {
    movie: "Batman Forever",
    year: 1995,
    studio: "Warner Bros.",
    actor: "Jim Carrey",
  },
};

export function Footer() {
  const pathname = usePathname();
  const currentPageCredit = MOVIE_CREDITS[pathname];
  return (
    <footer
      className="border-t mt-auto"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface-1)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-3">
              <span
                className="text-lg"
                style={{ fontFamily: "var(--font-brand)", color: "var(--primary)" }}
              >
                BackRow
              </span>
            </Link>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              The best view is from the{" "}
              <span style={{ fontFamily: "var(--font-brand)" }}>BackRow</span>. Where movie clubs
              come together.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-3 text-sm" style={{ color: "var(--text-primary)" }}>
              Links
            </h4>
            <ul className="space-y-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <li>
                <Link
                  href="/faq"
                  className="transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-of-use"
                  className="transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy-policy"
                  className="transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/user-agreement"
                  className="transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  User Agreement
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/feedback"
                  className="transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  Feedback
                </Link>
              </li>
              <li>
                <Link
                  href="/cookie-settings"
                  className="transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  Cookie Settings
                </Link>
              </li>
              <li>
                <Link
                  href="/do-not-sell-or-share"
                  className="transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  Do Not Sell or Share My Personal Information
                </Link>
              </li>
            </ul>
          </div>

          {/* TMDB Attribution */}
          <div>
            <h4 className="font-semibold mb-3 text-sm" style={{ color: "var(--text-primary)" }}>
              Data Provider
            </h4>
            <div className="flex items-center gap-3 mb-2">
              <div className="relative" style={{ width: 80, height: 20 }}>
                <Image
                  src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
                  alt="TMDB Logo"
                  fill
                  sizes="80px"
                  className="opacity-70 object-contain"
                  unoptimized
                />
              </div>
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              This product uses the TMDB API but is not endorsed or certified by TMDB.
            </p>
          </div>
        </div>

        {/* Movie Credits - only show if current page has a movie background */}
        {currentPageCredit && (
          <div className="border-t pt-4 mb-4" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              <span className="font-medium">Image Credit:</span> {currentPageCredit.movie} (
              {currentPageCredit.year}) © {currentPageCredit.studio}
              {currentPageCredit.actor && `, featuring ${currentPageCredit.actor}`}
            </p>
          </div>
        )}

        {/* Copyright */}
        <div
          className="border-t pt-4 flex flex-col sm:flex-row justify-between items-center gap-2"
          style={{ borderColor: "var(--border)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            © {new Date().getFullYear()}{" "}
            <span style={{ fontFamily: "var(--font-brand)" }}>BackRow</span>. All rights reserved.
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Made for movie lovers, by movie lovers.
          </p>
        </div>
      </div>
    </footer>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MarketingSidebarMount } from "@/components/marketing/MarketingSidebarMount";
import { MobileBackButton } from "@/components/profile/MobileBackButton";
import { absoluteUrl } from "@/lib/seo/absolute-url";

export const metadata: Metadata = {
  title: "Acknowledgments - BackRow",
  description:
    "Third-party data providers, sign-in providers, and external services that BackRow uses or links to.",
  alternates: { canonical: absoluteUrl("/acknowledgments") },
  openGraph: {
    title: "Acknowledgments - BackRow",
    description:
      "Third-party data providers, sign-in providers, and external services that BackRow uses or links to.",
    type: "website",
    url: absoluteUrl("/acknowledgments"),
    siteName: "BackRow",
  },
};

const LAST_UPDATED = "April 28, 2026";

export default async function AcknowledgmentsPage() {
  return (
    <div className="bg-[var(--background)]">
      <MarketingSidebarMount />
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        <MobileBackButton href="/" label="Home" />

        <div className="mb-6">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Acknowledgments</h1>
          <p className="text-xs text-[var(--text-muted)]">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-6">
          <section className="space-y-3">
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              BackRow stands on the shoulders of the data providers, platforms, and open-source
              tools listed below. We&apos;re grateful to all of them. Use of any logo, name, or mark
              on this page is for attribution only and does not imply endorsement, sponsorship, or
              affiliation.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Movie Data &mdash; TMDB
            </h2>
            <div className="flex items-center gap-3">
              <div className="relative" style={{ width: 96, height: 24 }}>
                <Image
                  src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
                  alt="TMDB Logo"
                  fill
                  sizes="96px"
                  className="opacity-80 object-contain"
                  unoptimized
                />
              </div>
            </div>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              BackRow uses the TMDB API to retrieve movie metadata, cast and crew, posters, and
              backdrops.{" "}
              <strong>
                This product uses the TMDB API but is not endorsed or certified by TMDB.
              </strong>{" "}
              Movie data, posters, and backdrops are &copy; TMDB and the respective rights holders.
            </p>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              <a
                href="https://www.themoviedb.org"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                themoviedb.org
              </a>
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Streaming Availability &mdash; JustWatch
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              When BackRow displays where a movie can be streamed or rented, that availability is
              powered by JustWatch. BackRow links out to JustWatch for full provider listings and is
              not endorsed by, affiliated with, or sponsored by JustWatch.
            </p>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              <a
                href="https://www.justwatch.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                justwatch.com
              </a>
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Sign-in Providers
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              BackRow supports signing in with Google, Apple, and Discord through standard OAuth
              flows. The Google name and logo are trademarks of Google LLC; Apple is a trademark of
              Apple Inc.; Discord is a trademark of Discord Inc. BackRow is not endorsed by,
              affiliated with, or sponsored by any of these companies.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Linked Profiles</h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              On your profile you can display links to your accounts on the platforms below. These
              are user-provided usernames, not data integrations &mdash; BackRow does not import,
              sync, or display any data from these services.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-sm text-[var(--text-muted)]">
              <li>Letterboxd</li>
              <li>IMDb</li>
              <li>Trakt</li>
              <li>TMDB</li>
              <li>YouTube</li>
              <li>X (Twitter)</li>
              <li>Instagram</li>
              <li>Reddit</li>
              <li>Discord</li>
              <li>TikTok</li>
            </ul>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              All trademarks, service marks, and product names are the property of their respective
              owners. BackRow is not affiliated with, endorsed by, or sponsored by any of these
              services.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Open Source &amp; Infrastructure
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              BackRow is built with Next.js, React, TypeScript, Supabase, Tailwind CSS, shadcn/ui,
              and Resend, and is hosted on Vercel. Thanks to the open-source community for the tools
              that make this possible.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--border)] pt-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Questions</h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              If you represent any of the services listed here and have a question or correction
              about how BackRow attributes your service, please reach out via our{" "}
              <Link href="/contact" className="underline">
                contact page
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

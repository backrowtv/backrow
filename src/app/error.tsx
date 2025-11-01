"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useState } from "react";
import { FilmReel, ArrowClockwise, House, Warning } from "@phosphor-icons/react";
import Link from "next/link";

// Fun movie-themed error messages for the global error boundary
const ERROR_MESSAGES = [
  { title: "The credits rolled early!", subtitle: "We weren't expecting this ending." },
  { title: "Lost in the multiverse!", subtitle: "Something went sideways in another dimension." },
  { title: "Power outage!", subtitle: "The theater went dark for a moment." },
  { title: "Wrong theater!", subtitle: "We took a wrong turn somewhere." },
  { title: "Rewinding...", subtitle: "Let's try that scene again from the top." },
];

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [errorMessage] = useState(
    () => ERROR_MESSAGES[Math.floor(Math.random() * ERROR_MESSAGES.length)]
  );
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    Sentry.captureException(error);
    console.error("Global error:", error);
  }, [error]);

  const handleRetry = async () => {
    setIsRetrying(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    reset();
  };

  return (
    <html lang="en" className="dark">
      <body className="bg-[var(--background)] text-[var(--text-primary)]">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Spinning film reel */}
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 bg-amber-500/10 rounded-full animate-pulse" />
              <div className="relative flex items-center justify-center w-24 h-24 bg-[var(--surface-1)] rounded-full border border-[var(--border)]">
                <FilmReel
                  className="w-12 h-12 text-amber-400 animate-spin"
                  style={{ animationDuration: "3s" }}
                  weight="duotone"
                />
              </div>
            </div>

            {/* Error message */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                {errorMessage.title}
              </h1>
              <p className="text-[var(--text-muted)]">{errorMessage.subtitle}</p>
            </div>

            {/* Error details — only shown in development to avoid leaking internals */}
            {process.env.NODE_ENV === "development" && error.message && (
              <details className="text-left bg-[var(--surface-1)] rounded-lg p-3 text-xs border border-[var(--border)]">
                <summary className="cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2">
                  <Warning className="w-3 h-3" />
                  Technical details
                </summary>
                <pre className="mt-2 text-[var(--text-secondary)] overflow-auto max-h-32 font-mono text-[10px]">
                  {error.message}
                </pre>
              </details>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium rounded-md bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-50 transition-colors"
              >
                {isRetrying ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Retrying...
                  </>
                ) : (
                  <>
                    <ArrowClockwise className="w-4 h-4" />
                    Try again
                  </>
                )}
              </button>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium rounded-md border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
              >
                <House className="w-4 h-4" />
                Back to home
              </Link>
            </div>

            {/* Footer */}
            <p className="text-xs text-[var(--text-secondary)]">
              Something went really wrong. Try refreshing or come back later.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}

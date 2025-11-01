"use client";

import { useState } from "react";
import { FilmReel, House, MagnifyingGlass } from "@phosphor-icons/react";
import Link from "next/link";

const NOT_FOUND_MESSAGES = [
  { title: "This scene was cut!", subtitle: "It didn't make the final edit." },
  { title: "Empty theater!", subtitle: "There's nothing showing on this screen." },
  { title: "Lost footage!", subtitle: "We searched the archives but came up empty." },
  { title: "Wrong screening room!", subtitle: "This one doesn't have anything playing." },
  { title: "Deleted scene!", subtitle: "The director decided this one didn't make the cut." },
];

export default function NotFound() {
  const [message] = useState(
    () => NOT_FOUND_MESSAGES[Math.floor(Math.random() * NOT_FOUND_MESSAGES.length)]
  );

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Film reel icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-amber-500/10 rounded-full" />
          <div className="relative flex items-center justify-center w-24 h-24 bg-[var(--surface-1)] rounded-full border border-[var(--border)]">
            <FilmReel className="w-12 h-12 text-amber-400" weight="duotone" />
          </div>
        </div>

        {/* 404 label */}
        <p className="text-sm font-medium text-[var(--text-secondary)] tracking-widest">404</p>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{message.title}</h1>
          <p className="text-[var(--text-muted)]">{message.subtitle}</p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium rounded-md bg-amber-500 text-black hover:bg-amber-400 transition-colors"
          >
            <House className="w-4 h-4" />
            Back to home
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium rounded-md border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <MagnifyingGlass className="w-4 h-4" />
            Search
          </Link>
        </div>

        {/* Footer */}
        <p className="text-xs text-[var(--text-secondary)]">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
    </div>
  );
}

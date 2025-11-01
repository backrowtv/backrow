"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "@phosphor-icons/react";
import { dismissHint } from "@/app/actions/dismissed-hints";

interface CustomizeHintProps {
  hintKey: string;
  initialDismissed?: boolean;
  href: string;
  tipPrefix?: string;
  linkText: string;
}

export function CustomizeHint({
  hintKey,
  initialDismissed = true,
  href,
  tipPrefix = "Tip: You can",
  linkText,
}: CustomizeHintProps) {
  const [dismissed, setDismissed] = useState(initialDismissed);

  if (dismissed) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDismissed(true);
    dismissHint(hintKey);
  };

  return (
    <div className="flex items-center justify-start gap-1.5">
      <Link
        href={href}
        className="text-xs transition-colors"
        style={{ color: "var(--text-muted)" }}
      >
        {tipPrefix}{" "}
        <span className="underline" style={{ color: "var(--primary)" }}>
          {linkText}
        </span>
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        className="p-0.5 rounded hover:bg-[var(--surface-2)] transition-colors"
        aria-label="Dismiss hint"
      >
        <X className="h-3 w-3" style={{ color: "var(--text-muted)" }} />
      </button>
    </div>
  );
}

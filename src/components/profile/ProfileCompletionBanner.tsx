"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { X, UserCircle } from "@phosphor-icons/react";
import { Text } from "@/components/ui/typography";
import { dismissHint } from "@/app/actions/dismissed-hints";

interface ProfileCompletionBannerProps {
  initialDismissed?: boolean;
  needsDisplayName: boolean;
  needsBio: boolean;
}

export function ProfileCompletionBanner({
  initialDismissed = true,
  needsDisplayName,
  needsBio,
}: ProfileCompletionBannerProps) {
  const [isDismissed, setIsDismissed] = useState(initialDismissed);

  const handleDismiss = () => {
    setIsDismissed(true);
    dismissHint("profile-completion");
  };

  if (!needsDisplayName && !needsBio) return null;

  const missing = [needsDisplayName && "display name", needsBio && "bio"].filter(Boolean);
  const missingText = missing.join(" and ");

  return (
    <div
      className={`mb-6 rounded-lg border border-[var(--border)] p-4 transition-opacity duration-200 ${
        isDismissed ? "invisible pointer-events-none h-0 m-0 p-0 overflow-hidden" : ""
      }`}
      style={{ backgroundColor: "var(--surface-1)" }}
    >
      <div className="flex items-start gap-3">
        <UserCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "var(--primary)" }} />
        <div className="flex-1 min-w-0">
          <Text size="sm" className="font-medium text-[var(--text-primary)]">
            Complete your profile
          </Text>
          <Text size="tiny" muted className="mt-0.5">
            Add your {missingText} to help others get to know you.
          </Text>
          <Link href="/profile/edit" className="inline-block mt-2">
            <Button variant="outline" size="sm">
              Edit Profile
            </Button>
          </Link>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Dismiss profile completion prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { bulkDismissHints } from "@/app/actions/dismissed-hints";

const MIGRATION_KEY = "dismissed-hints-migrated-to-db";

/** Maps old localStorage keys to new DB hint keys */
const LEGACY_KEYS: Record<string, string> = {
  "rating-customize-hint-dismissed": "rating-customize-hint",
  "movie-links-customize-hint-dismissed": "movie-links-customize-hint",
  "discussion-customize-hint-dismissed": "discussion-customize-hint",
  "nav-customize-hint-dismissed": "nav-customize-hint",
};

/**
 * One-time migration: syncs any existing localStorage hint dismissals
 * to the database, then cleans up the old keys.
 */
export function DismissedHintsMigration() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem(MIGRATION_KEY) === "true") return;

    const dismissedKeys: string[] = [];

    // Check static hint keys
    for (const [oldKey, newKey] of Object.entries(LEGACY_KEYS)) {
      if (localStorage.getItem(oldKey) === "true") {
        dismissedKeys.push(newKey);
      }
    }

    // Check profile-completion (had dynamic userId suffix)
    const profileKey = `profile-completion-dismissed-${user.id}`;
    if (localStorage.getItem(profileKey) === "true") {
      dismissedKeys.push("profile-completion");
    }

    // Check year-wrap keys
    for (let year = 2020; year <= new Date().getFullYear(); year++) {
      if (localStorage.getItem(`year-wrap-dismissed-${year}`) === "true") {
        dismissedKeys.push(`year-wrap-${year}`);
      }
    }

    if (dismissedKeys.length > 0) {
      bulkDismissHints(dismissedKeys).then(() => {
        // Clean up old localStorage keys
        for (const oldKey of Object.keys(LEGACY_KEYS)) {
          localStorage.removeItem(oldKey);
        }
        localStorage.removeItem(profileKey);
        for (let year = 2020; year <= new Date().getFullYear(); year++) {
          localStorage.removeItem(`year-wrap-dismissed-${year}`);
        }
        localStorage.setItem(MIGRATION_KEY, "true");
      });
    } else {
      localStorage.setItem(MIGRATION_KEY, "true");
    }
  }, [user]);

  return null;
}

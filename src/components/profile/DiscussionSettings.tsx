"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { updateDiscussionPreferences } from "@/app/actions/discussion-preferences";
import type { DiscussionPreferences } from "@/lib/discussion-preferences";
import toast from "react-hot-toast";

interface DiscussionSettingsProps {
  initialPreferences: DiscussionPreferences;
}

export function DiscussionSettings({ initialPreferences }: DiscussionSettingsProps) {
  const [prefs, setPrefs] = useState(initialPreferences);
  const [saving, setSaving] = useState(false);

  const handleToggle = async (key: keyof DiscussionPreferences, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    setSaving(true);

    const result = await updateDiscussionPreferences({ [key]: value });

    if (!result.success) {
      // Revert on failure
      setPrefs((prev) => ({ ...prev, [key]: !value }));
      toast.error(result.error || "Failed to save preference");
    }
    setSaving(false);
  };

  return (
    <div>
      <div
        className="flex items-center justify-between py-2"
        title="Tap a comment to collapse it and its replies"
      >
        <p className="text-sm font-medium text-[var(--text-primary)]">Collapse on tap</p>
        <Switch
          checked={prefs.collapseOnTap}
          onCheckedChange={(checked) => handleToggle("collapseOnTap", checked)}
          disabled={saving}
        />
      </div>
      <div className="border-t border-[var(--border)]" />
      <div
        className="flex items-center justify-between py-2"
        title="Auto-collapse a comment after you upvote it"
      >
        <p className="text-sm font-medium text-[var(--text-primary)]">Collapse on upvote</p>
        <Switch
          checked={prefs.collapseOnUpvote}
          onCheckedChange={(checked) => handleToggle("collapseOnUpvote", checked)}
          disabled={saving}
        />
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { AutoSaveButton } from "@/components/ui/AutoSaveButton";
import { useAutoSaveForm } from "@/hooks/useAutoSaveForm";
import { updateProfile } from "@/app/actions/auth";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface WatchSettingsFormProps {
  initialShowWatchProviders?: boolean;
}

export function WatchSettingsForm({ initialShowWatchProviders = true }: WatchSettingsFormProps) {
  const router = useRouter();
  const [showWatchProviders, setShowWatchProviders] = useState(initialShowWatchProviders);

  const { state, flush, lastSavedAt, error } = useAutoSaveForm({
    values: { showWatchProviders },
    save: async (values) => {
      const formData = new FormData();
      formData.append("show_watch_providers", String(values.showWatchProviders));
      const result = await updateProfile(null, formData);
      if (result && "error" in result && result.error) return { error: result.error };
      return { success: true };
    },
    onError: (msg) => toast.error(msg),
    onSuccess: () => router.refresh(),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between py-3">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">Show Where to Watch</p>
          <p className="text-xs text-[var(--text-muted)]">Show a JustWatch link on movie pages</p>
        </div>
        <Switch
          checked={showWatchProviders}
          onCheckedChange={setShowWatchProviders}
          disabled={state === "saving"}
          aria-label="Show Where to Watch link on movie pages"
        />
      </div>

      <div className="pt-2 border-t border-[var(--border)]">
        <AutoSaveButton
          state={state}
          onClick={flush}
          lastSavedAt={lastSavedAt}
          error={error}
          size="sm"
        />
      </div>
    </div>
  );
}

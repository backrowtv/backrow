"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { updateProfile } from "@/app/actions/auth";
import { useActionState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface WatchSettingsFormProps {
  initialShowWatchProviders?: boolean;
}

export function WatchSettingsForm({ initialShowWatchProviders = true }: WatchSettingsFormProps) {
  const router = useRouter();
  const [showWatchProviders, setShowWatchProviders] = useState(initialShowWatchProviders);
  const hasChanges = showWatchProviders !== initialShowWatchProviders;
  const [state, formAction, isPending] = useActionState(updateProfile, null);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      toast.success("Watch settings updated");
      router.refresh();
    } else if (state && "error" in state && state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  const handleSave = () => {
    const formData = new FormData();
    formData.append("show_watch_providers", String(showWatchProviders));
    formAction(formData);
  };

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
          disabled={isPending}
          aria-label="Show Where to Watch link on movie pages"
        />
      </div>

      {hasChanges && (
        <div className="pt-2 border-t border-[var(--border)]">
          <Button onClick={handleSave} disabled={isPending} variant="primary" size="sm">
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}

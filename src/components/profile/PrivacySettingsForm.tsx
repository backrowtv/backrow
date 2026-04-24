"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AutoSaveButton } from "@/components/ui/AutoSaveButton";
import { useAutoSaveForm } from "@/hooks/useAutoSaveForm";
import { updatePrivacySettings } from "@/app/actions/profile";
import { UserBlockedList } from "./UserBlockedList";
import toast from "react-hot-toast";
import { Eye, EyeSlash } from "@phosphor-icons/react";

interface PrivacySettingsFormProps {
  initialShowProfilePopup: boolean;
}

export function PrivacySettingsForm({ initialShowProfilePopup }: PrivacySettingsFormProps) {
  const [showProfilePopup, setShowProfilePopup] = useState(initialShowProfilePopup);

  const { state, flush, lastSavedAt, error } = useAutoSaveForm({
    values: { showProfilePopup },
    save: (values) => updatePrivacySettings(values),
    onError: (msg) => toast.error(msg),
  });

  return (
    <div className="space-y-6">
      {/* Profile Popup Visibility */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {showProfilePopup ? (
              <Eye className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
            ) : (
              <EyeSlash className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
            )}
            <div>
              <Label
                htmlFor="showProfilePopup"
                className="text-sm font-medium text-[var(--text-primary)] cursor-pointer"
              >
                Show Profile Popup
              </Label>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                When enabled, other users can view a preview of your profile
              </p>
            </div>
          </div>
          <Switch
            id="showProfilePopup"
            checked={showProfilePopup}
            onCheckedChange={setShowProfilePopup}
            disabled={state === "saving"}
          />
        </div>
        <p className="text-xs text-[var(--text-muted)] pl-6.5">
          {showProfilePopup
            ? "Club members who click on your name will see a popup with your avatar, bio, and favorite movie."
            : "Club members who click on your name will only see options to block or report you."}
        </p>
      </div>

      {/* Save button — always visible, reflects auto-save state */}
      <div className="pt-4 border-t border-[var(--border)]">
        <AutoSaveButton
          state={state}
          onClick={flush}
          lastSavedAt={lastSavedAt}
          error={error}
          size="sm"
        />
      </div>

      {/* Blocked Users List */}
      <div className="pt-4 border-t border-[var(--border)]">
        <UserBlockedList />
      </div>
    </div>
  );
}

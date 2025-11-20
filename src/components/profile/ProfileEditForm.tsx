"use client";

import { useState, useActionState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AvatarEditor } from "@/components/ui/avatar-editor";
import { isAdminEmail } from "@/lib/avatar-constants";
import { updateProfile } from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Database } from "@/types/database";
import { useUserProfile } from "@/components/auth/UserProfileProvider";
import { PencilSimple } from "@phosphor-icons/react";

type User = Database["public"]["Tables"]["users"]["Row"];

interface ProfileEditFormProps {
  profile: User | null;
}

export function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfile, null);
  const router = useRouter();
  const { refreshProfile } = useUserProfile();
  const [isEditing, setIsEditing] = useState(false);

  // Read avatar settings from dedicated columns
  const hasExistingUploadedPhoto = !!profile?.avatar_url;
  const currentAvatarIcon = profile?.avatar_icon ?? (hasExistingUploadedPhoto ? "photo" : "letter");
  const currentAvatarColorIndex = profile?.avatar_color_index ?? 4;
  const currentAvatarBorderColorIndex = profile?.avatar_border_color_index ?? null;

  const [bio, setBio] = useState(profile?.bio || "");
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  const [selectedAvatarIcon, setSelectedAvatarIcon] = useState<string | null>(currentAvatarIcon);
  const [selectedAvatarColorIndex, setSelectedAvatarColorIndex] = useState<number | null>(
    currentAvatarColorIndex
  );
  const [selectedAvatarBorderColorIndex, setSelectedAvatarBorderColorIndex] = useState<
    number | null
  >(currentAvatarBorderColorIndex);

  const initialDisplayName = profile?.display_name || "";
  const initialBio = profile?.bio || "";

  const hasChanges = displayName !== initialDisplayName || bio !== initialBio;

  // Track the last processed state to prevent duplicate toasts
  const lastProcessedState = useRef<typeof state>(null);

  useEffect(() => {
    // Skip if we've already processed this exact state object
    if (state === lastProcessedState.current) return;
    lastProcessedState.current = state;

    if (state && "success" in state && state.success) {
      toast.success(state.message || "Profile updated successfully");
      // Refresh the shared profile so all components get the updated avatar
      refreshProfile();
      router.refresh();
      setIsEditing(false);
    } else if (state && "error" in state && state.error) {
      toast.error(state.error);
    }
  }, [state, router, refreshProfile]);

  // Check if user is admin (for exclusive green color access)
  const isAdmin = isAdminEmail(profile?.email);

  const handleCancel = () => {
    setDisplayName(initialDisplayName);
    setBio(initialBio);
    setIsEditing(false);
  };

  return (
    <form action={formAction} className="space-y-4">
      {/* Profile Picture - Unified Editor (auto-saves independently) */}
      <div>
        <h3 className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
          Profile Picture
        </h3>
        <AvatarEditor
          mode="user"
          displayName={
            displayName || profile?.display_name || profile?.email?.split("@")[0] || "User"
          }
          currentPhotoUrl={avatarPreview}
          selectedIcon={selectedAvatarIcon}
          selectedColorIndex={selectedAvatarColorIndex}
          selectedBorderColorIndex={selectedAvatarBorderColorIndex}
          hasUploadedPhoto={!!avatarPreview}
          saveAction="user"
          onSaveSuccess={() => {
            refreshProfile();
            router.refresh();
          }}
          onSelect={(icon, colorIndex, borderColorIndex) => {
            setSelectedAvatarIcon(icon);
            setSelectedAvatarColorIndex(colorIndex);
            setSelectedAvatarBorderColorIndex(borderColorIndex);
            if (icon !== null && icon !== "photo") {
              setAvatarPreview(null);
            }
          }}
          onFileSelect={(_file, previewUrl) => {
            setAvatarPreview(previewUrl);
          }}
          disabled={isPending}
          isAdmin={isAdmin}
        />
      </div>

      {/* Basic Info */}
      <div className="pt-4 border-t border-[var(--border)]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Basic Info
          </h3>
          {!isEditing && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-6 text-xs px-2 gap-1"
            >
              <PencilSimple className="w-3 h-3" />
              Edit
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <Input
              type="text"
              name="display_name"
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isPending}
              className="text-sm"
            />

            <Input
              name="bio"
              type="textarea"
              label="Quote / Motto"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={100}
              disabled={isPending}
              showCharacterCount
              rows={2}
              className="text-sm"
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <div>
              <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-0.5">
                Display Name
              </p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {profile?.display_name || (
                  <span className="text-[var(--text-muted)] italic">Not set</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-0.5">
                Quote / Motto
              </p>
              <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap">
                {profile?.bio || (
                  <span className="text-[var(--text-muted)] italic">No quote yet</span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {state && "error" in state && state.error && (
        <div
          className="rounded-md border p-3 text-sm"
          style={{
            backgroundColor: "color-mix(in srgb, var(--error) 10%, transparent)",
            borderColor: "color-mix(in srgb, var(--error) 30%, transparent)",
          }}
        >
          <span style={{ color: "var(--error)", fontWeight: 500 }}>{state.error}</span>
        </div>
      )}

      {/* Actions — only when editing with changes */}
      {isEditing && hasChanges && (
        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" isLoading={isPending} size="sm">
            Save Changes
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      )}

      {/* Cancel without changes — just exit edit mode */}
      {isEditing && !hasChanges && (
        <div className="flex items-center gap-2 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      )}
    </form>
  );
}

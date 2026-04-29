"use client";

import { updateClub } from "@/app/actions/clubs";
import { useActionState, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { AvatarEditor } from "@/components/ui/avatar-editor";
import { getAvatarColor, getAvatarBorderColor, getAvatarIconSrc } from "@/lib/avatar-constants";
import Image from "next/image";
import toast from "react-hot-toast";
import { Camera } from "@phosphor-icons/react";
import { validateFileUpload } from "@/lib/validation/file-upload";

interface ClubImageryFormProps {
  clubId: string;
  clubSlug: string;
  clubName: string;
  currentPictureUrl: string | null;
  currentAvatarIcon?: string | null;
  currentAvatarColorIndex?: number | null;
  currentAvatarBorderColorIndex?: number | null;
}

type FormState = { error?: string; success?: boolean } | null;

export function ClubImageryForm({
  clubId,
  clubSlug,
  clubName,
  currentPictureUrl,
  currentAvatarIcon,
  currentAvatarColorIndex,
  currentAvatarBorderColorIndex,
}: ClubImageryFormProps) {
  const router = useRouter();
  // Check if this is the BackRow Featured club to show theme border option
  const isBackRowFeatured = clubSlug === "backrow-featured";
  const [preview, setPreview] = useState<string | null>(currentPictureUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAvatarIcon, setSelectedAvatarIcon] = useState<string | null>(
    currentAvatarIcon ?? "letter"
  );
  const [selectedAvatarColorIndex, setSelectedAvatarColorIndex] = useState<number | null>(
    currentAvatarColorIndex ?? 4
  );
  const [selectedAvatarBorderColorIndex, setSelectedAvatarBorderColorIndex] = useState<
    number | null
  >(currentAvatarBorderColorIndex ?? null);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(updateClub, null);

  // Determine if using default avatar (no uploaded image)
  const isUsingDefaultAvatar = !preview && selectedAvatarIcon !== null;

  // Generate default avatar display for preview
  const defaultAvatarIconSrc = selectedAvatarIcon
    ? getAvatarIconSrc(selectedAvatarIcon, "club")
    : null;
  const defaultAvatarColor =
    selectedAvatarColorIndex !== null ? getAvatarColor(selectedAvatarColorIndex) : null;
  const defaultAvatarBorderColor = getAvatarBorderColor(selectedAvatarBorderColorIndex);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      toast.success("Club picture updated");
      router.refresh();
    }
  }, [state, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Use centralized file validation
      const validation = validateFileUpload(file, "club");
      if (!validation.valid) {
        toast.error(validation.error || "Invalid file");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        // Clear default avatar when uploading image
        setSelectedAvatarIcon(null);
        setSelectedAvatarColorIndex(null);
        setSelectedAvatarBorderColorIndex(null);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Club Imagery</h3>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="clubId" value={clubId} />

        {/* Profile Picture */}
        <div>
          <Label className="mb-3 block">Club Picture</Label>
          <div className="flex items-center gap-4">
            <div className="relative">
              {/* Show custom picture or default avatar with icon+color */}
              {preview ? (
                <div
                  className="w-16 h-16 relative rounded-full overflow-hidden border-2"
                  style={{ borderColor: "var(--border)" }}
                >
                  <Image src={preview} alt={clubName} fill className="object-cover" sizes="64px" />
                </div>
              ) : isUsingDefaultAvatar && defaultAvatarColor ? (
                <div
                  className="h-16 w-16 rounded-full flex items-center justify-center text-base font-bold"
                  style={{
                    backgroundColor: defaultAvatarColor,
                    color: "white",
                    border: defaultAvatarBorderColor
                      ? `3px solid ${defaultAvatarBorderColor}`
                      : undefined,
                  }}
                >
                  {defaultAvatarIconSrc ? (
                    <Image
                      src={defaultAvatarIconSrc}
                      alt=""
                      width={64}
                      height={64}
                      className="w-[65%] h-[65%] object-contain"
                      draggable={false}
                    />
                  ) : (
                    <span className="text-lg">{clubName?.charAt(0)?.toUpperCase() || "?"}</span>
                  )}
                </div>
              ) : (
                <div
                  className="h-16 w-16 rounded-full flex items-center justify-center text-lg font-bold"
                  style={{ backgroundColor: "var(--surface-2)", color: "var(--text-muted)" }}
                >
                  {clubName?.charAt(0)?.toUpperCase() || "?"}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Change club picture"
                className="absolute -bottom-1 -right-1 rounded-full p-1.5 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                style={{ backgroundColor: "var(--primary)", color: "white" }}
                disabled={isPending}
              >
                <Camera className="h-3 w-3" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                name="picture"
                accept="image/*,.heic,.heif"
                className="sr-only"
                onChange={handleFileChange}
                disabled={isPending}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Upload photo</p>
              <p className="text-xs text-[var(--text-muted)]">Max 15MB • JPEG, PNG, GIF, or WebP</p>
            </div>
          </div>

          {/* Club Avatar Selector (auto-saves independently) */}
          <AvatarEditor
            mode="club"
            displayName={clubName}
            currentPhotoUrl={preview}
            selectedIcon={selectedAvatarIcon}
            selectedColorIndex={selectedAvatarColorIndex}
            selectedBorderColorIndex={selectedAvatarBorderColorIndex}
            hasUploadedPhoto={!!preview}
            saveAction="club"
            entityId={clubId}
            onSaveSuccess={() => {
              router.refresh();
            }}
            onSelect={(icon, colorIndex, borderColorIndex) => {
              setSelectedAvatarIcon(icon);
              setSelectedAvatarColorIndex(colorIndex);
              setSelectedAvatarBorderColorIndex(borderColorIndex);
              if (icon !== null) {
                setPreview(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }
            }}
            onFileSelect={(_file, previewUrl) => {
              setPreview(previewUrl);
            }}
            disabled={isPending}
            showBackRowOptions={isBackRowFeatured}
          />
        </div>

        {state && "error" in state && state.error && (
          <p
            className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
            role="alert"
          >
            <span aria-hidden="true">⚠</span>
            {state.error}
          </p>
        )}
        <Button type="submit" variant="club-accent" disabled={isPending}>
          {isPending ? "Saving..." : "Save Picture"}
        </Button>
      </form>
    </div>
  );
}

"use client";

import React from "react";
import { createClub, updateClub } from "@/app/actions/clubs";
import { useActionState, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Database } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CinemaSeatsIllustration } from "@/components/discover/CinemaIllustrations";
import { ClubThemeColorPicker, getClubThemeColor } from "@/components/clubs/ClubThemeColorPicker";
import { GenreSelector } from "@/components/genres/GenreSelector";
import { GenreIcon } from "@/components/genres/GenreIcon";
import { getGenreBySlug } from "@/lib/genres/constants";
import { AvatarEditor } from "@/components/ui/avatar-editor";
import { getAvatarColor, getAvatarIconSrc } from "@/lib/avatar-constants";

type Club = Database["public"]["Tables"]["clubs"]["Row"] & {
  picture_url?: string | null;
  theme_submissions_locked?: boolean | null;
  theme_color?: string | null;
  settings?: Record<string, unknown> | null;
};

interface ClubFormProps {
  club?: Club;
  isProducer?: boolean;
}

interface LivePreviewProps {
  name: string;
  description: string;
  privacy: string;
  picturePreview: string | null;
  privacyLabels: Record<string, { label: string; icon: string; description: string }>;
  themeColor?: string | null;
  genres?: string[];
  festivalType?: string;
  avatarIcon?: string | null;
  avatarColorIndex?: number | null;
}

function LivePreview({
  name,
  description,
  privacy,
  picturePreview,
  privacyLabels,
  themeColor,
  genres = [],
  festivalType = "standard",
  avatarIcon,
  avatarColorIndex,
}: LivePreviewProps) {
  const displayName = name.trim() || "My Movie Club";
  const displayDescription =
    description.trim() ||
    "What&apos;s this club about? Share the theme, vibe, or purpose of your movie club...";
  const privacyInfo = privacyLabels[privacy] || {
    label: privacy.replace("_", " "),
    icon: "",
    description: "",
  };
  const festivalLabel = festivalType === "endless" ? "Endless" : "Standard";

  // Get theme color for preview accent
  const accentColor = themeColor ? getClubThemeColor(themeColor) : null;

  return (
    <div className="lg:sticky lg:top-8">
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
          Live Preview
        </h3>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          See how your club will appear
        </p>
      </div>
      <div
        className="relative overflow-hidden rounded-2xl backdrop-blur-xl border p-[var(--spacing-6)]"
        style={{
          backgroundColor: "var(--surface-1)",
          borderColor: accentColor || "var(--border)",
          boxShadow: accentColor ? `0 0 0 1px ${accentColor}20` : undefined,
        }}
      >
        {/* Decorative cinema seats illustration */}
        <div className="absolute top-4 right-4 w-20 h-10 opacity-5">
          <CinemaSeatsIllustration />
        </div>

        <div className="relative z-10">
          {/* Header - Centered with circular avatar */}
          <div className="flex flex-col items-center text-center mb-4">
            {/* Club Picture Preview */}
            {picturePreview ? (
              <div
                className="w-16 h-16 rounded-full overflow-hidden border-2 shrink-0 relative mb-3"
                style={{ borderColor: "var(--border)" }}
              >
                <Image
                  src={picturePreview}
                  alt="Club preview"
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 mb-3 font-bold"
                style={{
                  backgroundColor:
                    avatarColorIndex !== null && avatarColorIndex !== undefined
                      ? getAvatarColor(avatarColorIndex)
                      : "var(--surface-2)",
                  color:
                    avatarColorIndex !== null && avatarColorIndex !== undefined
                      ? "white"
                      : "var(--text-muted)",
                }}
              >
                {(() => {
                  const iconSrc = avatarIcon ? getAvatarIconSrc(avatarIcon, "club") : null;
                  return iconSrc ? (
                    <Image
                      src={iconSrc}
                      alt=""
                      width={64}
                      height={64}
                      className="w-[65%] h-[65%] object-contain"
                      draggable={false}
                    />
                  ) : (
                    <span className="text-xl">{displayName.charAt(0).toUpperCase()}</span>
                  );
                })()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-center gap-2 mb-1">
                <h3
                  className="text-xl font-bold line-clamp-1"
                  style={{ color: name.trim() ? "var(--text-primary)" : "var(--text-muted)" }}
                >
                  {displayName}
                </h3>
                <Badge variant="secondary" size="sm">
                  {festivalLabel}
                </Badge>
              </div>
            </div>
          </div>

          {/* Description */}
          <p
            className="text-sm mb-4 line-clamp-2 leading-relaxed italic"
            style={{ color: description.trim() ? "var(--text-secondary)" : "var(--text-muted)" }}
          >
            {displayDescription}
          </p>

          {/* Genres */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {genres.map((slug) => {
                const genre = getGenreBySlug(slug);
                if (!genre) return null;
                return (
                  <Badge key={slug} variant="secondary" size="sm" className="gap-1">
                    <GenreIcon slug={slug} size={12} />
                    {genre.name}
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Footer with privacy badge */}
          <div
            className="flex items-center gap-2 pt-4 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="px-3 py-1 rounded-full border text-xs flex items-center gap-1.5"
              style={{
                backgroundColor: "var(--surface-2)",
                borderColor: "var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              {privacyInfo.icon && <span>{privacyInfo.icon}</span>}
              <span>{privacyInfo.label}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type FormState = { error?: string; success?: boolean } | null;

export function ClubForm({ club, isProducer = false }: ClubFormProps) {
  const isEditing = !!club;
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    isEditing ? updateClub : createClub,
    null
  );
  const [name, setName] = useState(club?.name || "");
  const [description, setDescription] = useState(club?.description || "");
  const [privacy, setPrivacy] = useState(club?.privacy || "private");
  const [picturePreview, setPicturePreview] = useState<string | null>(club?.picture_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme and appearance state - must be declared before the sync effect
  const [themeColor, setThemeColor] = useState<string | null>(club?.theme_color || null);
  const [genres, setGenres] = useState<string[]>((club?.genres as string[]) || []);
  const [festivalType, setFestivalType] = useState<string>(
    ((club?.settings as Record<string, unknown>)?.festival_type as string) || "standard"
  );

  // Club avatar selector state — read from dedicated columns (not settings JSON)
  const [selectedAvatarIcon, setSelectedAvatarIcon] = useState<string | null>(
    club?.avatar_icon ?? (club?.picture_url ? "photo" : "letter")
  );
  const [selectedAvatarColorIndex, setSelectedAvatarColorIndex] = useState<number | null>(
    club?.avatar_color_index ?? 4
  );
  const [selectedAvatarBorderColorIndex, setSelectedAvatarBorderColorIndex] = useState<
    number | null
  >(club?.avatar_border_color_index ?? null);

  // Sync local state with club prop when it changes (after successful update)
  // Use specific field values as dependencies, not the object reference
  // This ensures the effect fires when data changes even if the object reference doesn't
  useEffect(() => {
    if (club) {
      setName(club.name || "");
      setDescription(club.description || "");
      setPrivacy(club.privacy || "private");
      setPicturePreview(club.picture_url || null);
      setThemeColor(club.theme_color || null);
      setGenres((club.genres as string[]) || []);
      // Sync avatar settings from dedicated columns
      setSelectedAvatarIcon(club.avatar_icon ?? (club.picture_url ? "photo" : "letter"));
      setSelectedAvatarColorIndex(club.avatar_color_index ?? 4);
      setSelectedAvatarBorderColorIndex(club.avatar_border_color_index ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Using individual properties for proper memoization
  }, [
    club?.id,
    club?.name,
    club?.description,
    club?.privacy,
    club?.picture_url,
    club?.theme_color,
    club?.genres,
    club?.avatar_icon,
    club?.avatar_color_index,
    club?.avatar_border_color_index,
  ]);

  // Refresh page data after successful form submission
  useEffect(() => {
    if (state?.success && isEditing) {
      router.refresh();
    }
  }, [state?.success, isEditing, router]);

  const privacyLabels: Record<string, { label: string; icon: string; description: string }> = {
    public_open: {
      label: "Open",
      icon: "🌐",
      description: "Discoverable, anyone can join instantly",
    },
    public_moderated: {
      label: "Moderated",
      icon: "✋",
      description: "Discoverable, request approval or use invite code",
    },
    private: {
      label: "Private",
      icon: "🔐",
      description: "Not discoverable, invite code required to join",
    },
  };

  return (
    <div className={isEditing ? "max-w-4xl" : "grid lg:grid-cols-2 gap-6 lg:gap-8"}>
      {/* Form */}
      <div>
        <form action={formAction} className="space-y-3">
          {isEditing && <input type="hidden" name="clubId" value={club.id} />}

          {state && "error" in state && state.error && (
            <div
              className="rounded-lg border p-[var(--spacing-4)] text-sm flex items-start gap-3 animate-fade-in animate-slide-down"
              style={{
                backgroundColor: "color-mix(in srgb, var(--error) 10%, transparent)",
                borderColor: "color-mix(in srgb, var(--error) 30%, transparent)",
              }}
            >
              <svg
                className="w-5 h-5 shrink-0 mt-0.5 transition-transform duration-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: "var(--error)" }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span
                className="flex-1 font-medium"
                style={{ color: "var(--error)", fontWeight: 500 }}
              >
                {state.error}
              </span>
            </div>
          )}

          {state && "success" in state && state.success && (
            <div
              className="rounded-lg border p-[var(--spacing-4)] text-sm flex items-start gap-3 animate-fade-in animate-slide-down"
              style={{
                backgroundColor: "rgba(var(--success-rgb), 0.1)",
                borderColor: "rgba(var(--success-rgb), 0.3)",
              }}
            >
              <svg
                className="w-5 h-5 shrink-0 mt-0.5 transition-transform duration-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: "var(--success)" }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="flex-1 font-medium" style={{ color: "var(--success)" }}>
                Club updated successfully
              </span>
            </div>
          )}

          <div className="space-y-3">
            {/* Club Picture - Editing mode (producers only, auto-saves independently) */}
            {isEditing && isProducer && (
              <AvatarEditor
                mode="club"
                displayName={name || club?.name || "Club"}
                currentPhotoUrl={picturePreview}
                selectedIcon={selectedAvatarIcon}
                selectedColorIndex={selectedAvatarColorIndex}
                selectedBorderColorIndex={selectedAvatarBorderColorIndex}
                hasUploadedPhoto={!!picturePreview}
                saveAction="club"
                entityId={club.id}
                onSaveSuccess={() => router.refresh()}
                onSelect={(icon, colorIndex, borderColorIndex) => {
                  setSelectedAvatarIcon(icon);
                  setSelectedAvatarColorIndex(colorIndex);
                  setSelectedAvatarBorderColorIndex(borderColorIndex);
                  if (icon !== null && icon !== "photo") {
                    setPicturePreview(null);
                  }
                }}
                onFileSelect={(_file, previewUrl) => {
                  setPicturePreview(previewUrl);
                }}
                disabled={isPending}
                showBackRowOptions={club.slug === "backrow-featured"}
              />
            )}

            <Input
              id="name"
              name="name"
              type="text"
              label="Club Name"
              required
              disabled={isPending}
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={3}
              maxLength={30}
              showCharacterCount
              placeholder="My Movie Club"
              helperText={isEditing ? undefined : "Must be unique and at least 3 characters"}
            />

            <Input
              id="description"
              name="description"
              type="textarea"
              label="Description"
              disabled={isPending}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              showCharacterCount
              placeholder="What's this club about? Share the theme, vibe, or purpose of your movie club..."
              rows={isEditing ? 2 : 4}
            />

            <Select
              id="privacy"
              name="privacy"
              label="Privacy"
              required
              disabled={isPending}
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
              helperText={!isEditing ? privacyLabels[privacy]?.description : undefined}
            >
              <option value="private">
                {privacyLabels.private.icon} {privacyLabels.private.label}
              </option>
              <option value="public_moderated">
                {privacyLabels.public_moderated.icon} {privacyLabels.public_moderated.label}
              </option>
              <option value="public_open">
                {privacyLabels.public_open.icon} {privacyLabels.public_open.label}
              </option>
            </Select>

            {/* Club Picture - Creation mode */}
            {!isEditing && (
              <div>
                <AvatarEditor
                  mode="club"
                  displayName={name || "Club"}
                  currentPhotoUrl={picturePreview}
                  selectedIcon={selectedAvatarIcon}
                  selectedColorIndex={selectedAvatarColorIndex}
                  selectedBorderColorIndex={selectedAvatarBorderColorIndex}
                  hasUploadedPhoto={!!picturePreview}
                  onSelect={(icon, colorIndex, borderColorIndex) => {
                    setSelectedAvatarIcon(icon);
                    setSelectedAvatarColorIndex(colorIndex);
                    setSelectedAvatarBorderColorIndex(borderColorIndex);
                    if (icon !== null && icon !== "photo") {
                      setPicturePreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }
                  }}
                  onFileSelect={(file, previewUrl) => {
                    setPicturePreview(previewUrl);
                    if (fileInputRef.current) {
                      const dataTransfer = new DataTransfer();
                      dataTransfer.items.add(file);
                      fileInputRef.current.files = dataTransfer.files;
                    }
                  }}
                  disabled={isPending}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  name="picture"
                  accept="image/*"
                  className="hidden"
                  disabled={isPending}
                />
                <input type="hidden" name="avatar_icon" value={selectedAvatarIcon || ""} />
                <input
                  type="hidden"
                  name="avatar_color_index"
                  value={
                    selectedAvatarColorIndex !== null ? selectedAvatarColorIndex.toString() : ""
                  }
                />
                <input
                  type="hidden"
                  name="avatar_border_color_index"
                  value={
                    selectedAvatarBorderColorIndex !== null
                      ? selectedAvatarBorderColorIndex.toString()
                      : ""
                  }
                />
              </div>
            )}

            {/* Theme Color Selection - Available during creation and for producers when editing */}
            {(!isEditing || isProducer) && (
              <div>
                <ClubThemeColorPicker
                  value={themeColor}
                  onChange={setThemeColor}
                  disabled={isPending}
                />
                {/* Hidden input for form submission */}
                <input type="hidden" name="theme_color" value={themeColor || ""} />
              </div>
            )}

            {/* Genre Selection - Available during creation and for producers when editing */}
            {(!isEditing || isProducer) && (
              <div>
                <GenreSelector value={genres} onChange={setGenres} disabled={isPending} />
                <input type="hidden" name="genres" value={JSON.stringify(genres)} />
              </div>
            )}

            {/* Festival Type Selection - Creation only */}
            {!isEditing && (
              <div className="space-y-2">
                <label
                  htmlFor="festival_type"
                  className="block text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Festival Type
                </label>
                <Select
                  id="festival_type"
                  name="festival_type"
                  value={festivalType}
                  onChange={(e) => setFestivalType(e.target.value)}
                  disabled={isPending}
                >
                  <option value="standard">Standard Festival — themed seasons with phases</option>
                  <option value="endless">Endless Festival — continuous watching</option>
                </Select>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {festivalType === "endless"
                    ? "Continuous watching without phases. Casual ratings, no competition."
                    : "Run themed festivals with scoring, standings, and blind nominations."}
                </p>
              </div>
            )}
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full" size="lg" isLoading={isPending}>
              {isPending
                ? isEditing
                  ? "Updating..."
                  : "Creating..."
                : isEditing
                  ? "Update Club"
                  : "Create Club"}
            </Button>
          </div>
        </form>
      </div>

      {/* Live Preview */}
      {!isEditing && (
        <LivePreview
          name={name}
          description={description}
          privacy={privacy}
          picturePreview={picturePreview}
          privacyLabels={privacyLabels}
          themeColor={themeColor}
          genres={genres}
          festivalType={festivalType}
          avatarIcon={selectedAvatarIcon}
          avatarColorIndex={selectedAvatarColorIndex}
        />
      )}
    </div>
  );
}

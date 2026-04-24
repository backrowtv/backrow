"use client";

import { useState, useRef, useCallback, useTransition, type ChangeEvent } from "react";
import { PencilSimple, Upload, Camera, SpinnerGap } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/avatar";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import Image from "next/image";
import {
  USER_ICONS,
  CLUB_ICONS,
  AVATAR_COLORS,
  getAvatarColor,
  getAvatarBorderColor,
  getAvatarIconSrc,
  getAvailableAvatarColors,
  THEME_BORDER_COLOR_INDEX,
  THEME_BG_COLOR_INDEX,
  THEME_DARK_COLOR_INDEX,
  BACKROW_ICON_ID,
  BACKROW_ICON_PATH,
} from "@/lib/avatar-constants";
import { updateUserAvatar, updateClubAvatar } from "@/app/actions/avatar";
import toast from "react-hot-toast";

/**
 * Renders the BackRow theater icon SVG for the selector grid
 */
function BackRowIconSmall() {
  return (
    <svg
      viewBox="-8 -8 528 528"
      className="w-5 h-5"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      fill="currentColor"
    >
      <g>
        <path d={BACKROW_ICON_PATH} />
        <circle cx="385.77" cy="12.069" r="10" />
      </g>
    </svg>
  );
}

interface AvatarEditorProps {
  /** Controls emoji list and label text */
  mode: "user" | "club";
  /** Display name for letter fallback and preview */
  displayName: string;
  /** Current photo URL (if any) */
  currentPhotoUrl: string | null;
  /** Current avatar icon setting */
  selectedIcon?: string | null;
  /** Current color index */
  selectedColorIndex?: number | null;
  /** Current border color index */
  selectedBorderColorIndex?: number | null;
  /** Callback when icon/color/border changes */
  onSelect?: (
    icon: string | null,
    colorIndex: number | null,
    borderColorIndex: number | null
  ) => void;
  /** Callback when user selects a file for upload */
  onFileSelect?: (file: File, previewUrl: string) => void;
  /** Disable all interactions */
  disabled?: boolean;
  /** Show admin-only features (green color, theme border) */
  isAdmin?: boolean;
  /** When true, shows 'photo' option in icon picker (user has uploaded photo) */
  hasUploadedPhoto?: boolean;
  /** Show BackRow-specific options (BackRow icon, theme bg/border) */
  showBackRowOptions?: boolean;
  /** When set, editor saves immediately via server action */
  saveAction?: "user" | "club";
  /** Entity ID for club saves (user ID is auto-detected) */
  entityId?: string;
  /** Callback after a successful auto-save */
  onSaveSuccess?: () => void;
  /** Size of the visible trigger avatar (defaults to "lg"). Use "xxl" for hero placements. */
  triggerSize?: "sm" | "md" | "lg" | "xl" | "xxl";
}

export function AvatarEditor({
  mode,
  displayName,
  currentPhotoUrl,
  selectedIcon: controlledSelectedIcon,
  selectedColorIndex: controlledSelectedColorIndex,
  selectedBorderColorIndex: controlledSelectedBorderColorIndex,
  onSelect,
  onFileSelect,
  disabled,
  isAdmin = false,
  hasUploadedPhoto = false,
  showBackRowOptions = false,
  saveAction,
  entityId,
  onSaveSuccess,
  triggerSize = "lg",
}: AvatarEditorProps) {
  const icons = mode === "club" ? CLUB_ICONS : USER_ICONS;
  const iconSet = mode === "club" ? ("club" as const) : ("user" as const);
  const availableColors = mode === "club" ? [...AVATAR_COLORS] : getAvailableAvatarColors(isAdmin);
  const gridCols = mode === "club" ? "grid-cols-7" : "grid-cols-6";
  const headerLabel = mode === "club" ? "Customize Club Avatar" : "Edit Profile Picture";
  const triggerLabel = mode === "club" ? "Customize club avatar" : "Edit profile picture";

  const [internalSelectedIcon, setInternalSelectedIcon] = useState<string | null>("letter");
  const [internalSelectedColorIndex, setInternalSelectedColorIndex] = useState<number>(4);
  const [internalSelectedBorderColorIndex, setInternalSelectedBorderColorIndex] = useState<
    number | null
  >(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-save helper: builds FormData and calls the appropriate server action
  const autoSave = useCallback(
    (overrides: {
      icon?: string | null;
      colorIndex?: number | null;
      borderColorIndex?: number | null;
      file?: File;
    }) => {
      if (!saveAction) return;

      startSaveTransition(async () => {
        const fd = new FormData();
        fd.set("avatar_icon", overrides.icon ?? controlledSelectedIcon ?? "");
        fd.set(
          "avatar_color_index",
          overrides.colorIndex !== undefined
            ? (overrides.colorIndex?.toString() ?? "")
            : (controlledSelectedColorIndex?.toString() ?? "")
        );
        fd.set(
          "avatar_border_color_index",
          overrides.borderColorIndex !== undefined
            ? (overrides.borderColorIndex?.toString() ?? "")
            : (controlledSelectedBorderColorIndex?.toString() ?? "")
        );

        if (overrides.file) {
          fd.set(saveAction === "user" ? "avatar" : "picture", overrides.file);
        }
        if (saveAction === "club" && entityId) {
          fd.set("clubId", entityId);
        }

        const result =
          saveAction === "user" ? await updateUserAvatar(fd) : await updateClubAvatar(fd);

        if (result.success) {
          onSaveSuccess?.();
        } else {
          toast.error(result.error || "Failed to save avatar");
        }
      });
    },
    [
      saveAction,
      entityId,
      controlledSelectedIcon,
      controlledSelectedColorIndex,
      controlledSelectedBorderColorIndex,
      onSaveSuccess,
    ]
  );

  const selectedIcon =
    controlledSelectedIcon !== undefined ? controlledSelectedIcon : internalSelectedIcon;
  const selectedColorIndex =
    controlledSelectedColorIndex !== undefined && controlledSelectedColorIndex !== null
      ? controlledSelectedColorIndex
      : internalSelectedColorIndex;
  const selectedBorderColorIndex =
    controlledSelectedBorderColorIndex !== undefined
      ? controlledSelectedBorderColorIndex
      : internalSelectedBorderColorIndex;

  const firstLetter = displayName?.charAt(0)?.toUpperCase() || "?";
  const isPhotoMode = selectedIcon === "photo" && currentPhotoUrl;
  const isBackRowIcon = selectedIcon === BACKROW_ICON_ID;

  // Resolve display icon for preview
  const selectedIconSrc = selectedIcon ? getAvatarIconSrc(selectedIcon, iconSet) : null;
  const currentDisplayIcon: React.ReactNode | string | null = isPhotoMode ? null : isBackRowIcon ? (
    <BackRowIconSmall />
  ) : selectedIconSrc ? (
    <Image
      src={selectedIconSrc}
      alt=""
      width={64}
      height={64}
      className="w-[65%] h-[65%] object-contain"
      draggable={false}
    />
  ) : (
    firstLetter
  );
  const currentColor = isPhotoMode ? undefined : getAvatarColor(selectedColorIndex);
  const currentBorderColor = getAvatarBorderColor(selectedBorderColorIndex);

  const handleIconSelect = (iconId: string) => {
    if (disabled || isSaving) return;
    if (controlledSelectedIcon === undefined) {
      setInternalSelectedIcon(iconId);
    }
    const newColorIndex = iconId === "photo" ? null : selectedColorIndex;
    onSelect?.(iconId, newColorIndex, selectedBorderColorIndex);
    if (iconId !== "photo") {
      autoSave({ icon: iconId, colorIndex: newColorIndex });
    }
  };

  const handleColorSelect = (colorIndex: number) => {
    if (disabled || isSaving) return;
    if (controlledSelectedColorIndex === undefined) {
      setInternalSelectedColorIndex(colorIndex);
    }
    onSelect?.(selectedIcon, colorIndex, selectedBorderColorIndex);
    autoSave({ colorIndex });
  };

  const handleBorderColorSelect = (borderColorIndex: number | null) => {
    if (disabled || isSaving) return;
    if (controlledSelectedBorderColorIndex === undefined) {
      setInternalSelectedBorderColorIndex(borderColorIndex);
    }
    onSelect?.(selectedIcon, selectedColorIndex, borderColorIndex);
    autoSave({ borderColorIndex });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Avatar file size must be less than 15MB");
      e.target.value = "";
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/heic",
      "image/heif",
    ];
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"];
    const fileExtension = file.name ? "." + file.name.split(".").pop()?.toLowerCase() : "";
    const hasValidType = file.type && allowedTypes.includes(file.type.toLowerCase());
    const hasValidExtension = allowedExtensions.includes(fileExtension);

    if (!hasValidType && !hasValidExtension) {
      toast.error("Please select a valid image file (JPEG, PNG, GIF, WebP, or HEIC)");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const previewUrl = reader.result as string;
      onFileSelect?.(file, previewUrl);
      // Update icon state to 'photo'
      if (controlledSelectedIcon === undefined) {
        setInternalSelectedIcon("photo");
      }
      onSelect?.("photo", null, selectedBorderColorIndex);
      // Auto-save file upload
      autoSave({ icon: "photo", colorIndex: null, file });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative">
      {/* Trigger button */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            group relative transition-transform
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-105"}
          `}
          style={{ borderRadius: "9999px" }}
          aria-label={triggerLabel}
          aria-expanded={isOpen}
        >
          <Avatar
            size={triggerSize}
            src={isPhotoMode ? currentPhotoUrl : undefined}
            defaultAvatarIcon={currentDisplayIcon ?? undefined}
            defaultAvatarColor={currentColor}
            defaultAvatarBorderColor={currentBorderColor}
            alt={displayName}
          />
          <span
            className={`
              absolute rounded-full bg-[var(--surface-2)] border-2 border-[var(--surface-1)]
              flex items-center justify-center transition-colors
              ${
                triggerSize === "xxl"
                  ? "-bottom-1 -right-1 w-9 h-9"
                  : triggerSize === "xl"
                    ? "-bottom-0.5 -right-0.5 w-7 h-7"
                    : "-bottom-0.5 -right-0.5 w-5 h-5"
              }
              ${disabled ? "" : "group-hover:bg-[var(--primary)]"}
            `}
          >
            <PencilSimple
              weight="bold"
              className={`${
                triggerSize === "xxl" ? "w-5 h-5" : triggerSize === "xl" ? "w-4 h-4" : "w-2.5 h-2.5"
              } text-[var(--text-muted)] ${disabled ? "" : "group-hover:text-white"}`}
            />
          </span>
        </button>
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {mode === "club" ? "Club Picture" : "Profile Picture"}
          </p>
          <p className="text-xs text-[var(--text-muted)]">Tap to customize</p>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        name="avatar"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />

      {/* Editor Modal */}
      <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
        <ResponsiveDialogContent className="sm:max-w-md p-0 gap-0">
          <ResponsiveDialogHeader className="px-4 py-3 border-b border-[var(--border)] sm:px-4 sm:pt-3 text-left">
            <ResponsiveDialogTitle className="text-sm font-medium">
              {headerLabel}
            </ResponsiveDialogTitle>
          </ResponsiveDialogHeader>

          <div className="p-4 space-y-4">
            {/* Upload Photo Section */}
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className={`
                  w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed transition-colors
                  ${
                    disabled
                      ? "opacity-50 cursor-not-allowed border-[var(--border)]"
                      : "cursor-pointer border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5"
                  }
                `}
              >
                <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] flex items-center justify-center">
                  <Camera className="w-5 h-5 text-[var(--text-muted)]" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Upload Photo</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Max 15MB &bull; JPEG, PNG, GIF, WebP
                  </p>
                </div>
                <Upload className="w-4 h-4 text-[var(--text-muted)] ml-auto" />
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[var(--border)]" />
              <span className="text-xs text-[var(--text-muted)]">or customize</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>

            {/* Icon Selection */}
            <div>
              <p className="text-xs font-medium text-[var(--text-muted)] mb-2 uppercase tracking-wide">
                {mode === "club" ? "Icon (Genre/Theme)" : "Icon"}
              </p>
              <div className={`grid ${gridCols} gap-1.5`}>
                {/* Photo option - only shown when entity has an uploaded photo */}
                {hasUploadedPhoto && currentPhotoUrl && (
                  <button
                    type="button"
                    onClick={() => handleIconSelect("photo")}
                    disabled={disabled}
                    className={`
                      w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden transition-all
                      ${selectedIcon === "photo" ? "ring-2 ring-[var(--primary)] scale-110" : "hover:scale-105"}
                      ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    `}
                    title="Your uploaded photo"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentPhotoUrl}
                      alt="Uploaded"
                      className="w-full h-full object-cover"
                    />
                  </button>
                )}

                {/* Letter option */}
                <button
                  type="button"
                  onClick={() => handleIconSelect("letter")}
                  disabled={disabled}
                  className={`
                    w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold transition-all
                    ${
                      selectedIcon === "letter" || (!hasUploadedPhoto && selectedIcon === null)
                        ? "ring-2 ring-[var(--primary)] bg-[var(--surface-3)] shadow-sm"
                        : "bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80"
                    }
                    ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                  `}
                  style={{ color: "var(--text-primary)" }}
                  title={`Initial: ${firstLetter}`}
                >
                  {firstLetter}
                </button>

                {/* BackRow site icon option */}
                {showBackRowOptions && (
                  <button
                    type="button"
                    onClick={() => handleIconSelect(BACKROW_ICON_ID)}
                    disabled={disabled}
                    className={`
                      w-9 h-9 rounded-lg flex items-center justify-center transition-all
                      ${
                        selectedIcon === BACKROW_ICON_ID
                          ? "ring-2 ring-[var(--primary)] bg-[var(--surface-3)] shadow-sm"
                          : "bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80"
                      }
                      ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    `}
                    style={{ color: "var(--primary)" }}
                    title="BackRow Site Icon"
                  >
                    <BackRowIconSmall />
                  </button>
                )}

                {/* Icon options */}
                {icons.map((icon) => {
                  const isSelected = selectedIcon === icon.id;
                  return (
                    <button
                      key={icon.id}
                      type="button"
                      onClick={() => handleIconSelect(icon.id)}
                      disabled={disabled}
                      className={`
                        w-9 h-9 rounded-lg flex items-center justify-center transition-all p-1
                        ${
                          isSelected
                            ? "ring-2 ring-[var(--primary)] bg-[var(--surface-3)] shadow-sm"
                            : "bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80"
                        }
                        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                      `}
                      title={icon.label}
                    >
                      <Image
                        src={icon.src}
                        alt={icon.label}
                        width={28}
                        height={28}
                        className="w-7 h-7 object-contain"
                        draggable={false}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Selection - hidden when using photo */}
            {!isPhotoMode && (
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)] mb-2 uppercase tracking-wide">
                  Background Color
                </p>
                <div className="grid grid-cols-6 gap-1.5">
                  {/* Site theme color option - only for BackRow Featured */}
                  {showBackRowOptions && (
                    <button
                      type="button"
                      onClick={() => handleColorSelect(THEME_BG_COLOR_INDEX)}
                      disabled={disabled}
                      className={`
                        w-9 h-9 rounded-lg transition-all flex items-center justify-center text-[10px] font-bold
                        ${selectedColorIndex === THEME_BG_COLOR_INDEX ? "ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--surface-1)] scale-110" : "hover:scale-105"}
                        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                      `}
                      style={{
                        backgroundColor: "var(--primary)",
                        color: "white",
                      }}
                      title="Site Theme (Sage Green)"
                      aria-label="Site theme color"
                    />
                  )}
                  {/* Site Theme Dark option - only for BackRow Featured */}
                  {showBackRowOptions && (
                    <button
                      type="button"
                      onClick={() => handleColorSelect(THEME_DARK_COLOR_INDEX)}
                      disabled={disabled}
                      className={`
                        w-9 h-9 rounded-lg transition-all flex items-center justify-center text-[10px] font-bold
                        ${selectedColorIndex === THEME_DARK_COLOR_INDEX ? "ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--surface-1)] scale-110" : "hover:scale-105"}
                        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                      `}
                      style={{
                        backgroundColor: "hsl(155, 25%, 16%)",
                        color: "hsl(155, 25%, 50%)",
                      }}
                      title="Site Theme Dark (Dark Sage Green)"
                      aria-label="Site theme dark color"
                    />
                  )}
                  {availableColors.map((color) => {
                    const isSelected = selectedColorIndex === color.id;
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => handleColorSelect(color.id)}
                        disabled={disabled}
                        className={`
                          w-9 h-9 rounded-lg transition-all
                          ${isSelected ? "ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--surface-1)] scale-110" : "hover:scale-105"}
                          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                        `}
                        style={{ backgroundColor: color.color }}
                        title={color.label}
                        aria-label={color.label}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Border Color Selection */}
            <div>
              <p className="text-xs font-medium text-[var(--text-muted)] mb-2 uppercase tracking-wide">
                Border Color
              </p>
              <div className="grid grid-cols-6 gap-1.5">
                {/* None option */}
                <button
                  type="button"
                  onClick={() => handleBorderColorSelect(null)}
                  disabled={disabled}
                  className={`
                    w-9 h-9 rounded-lg flex items-center justify-center text-xs font-medium transition-all
                    ${
                      selectedBorderColorIndex === null
                        ? "ring-2 ring-[var(--primary)] bg-[var(--surface-3)] shadow-sm"
                        : "bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80"
                    }
                    ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                  `}
                  style={{ color: "var(--text-muted)" }}
                  title="No border"
                >
                  None
                </button>

                {/* Site Theme option - admin only (user mode) or BackRow options (club mode) */}
                {(isAdmin || showBackRowOptions) && (
                  <button
                    type="button"
                    onClick={() => handleBorderColorSelect(THEME_BORDER_COLOR_INDEX)}
                    disabled={disabled}
                    className={`
                      w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all
                      ${
                        selectedBorderColorIndex === THEME_BORDER_COLOR_INDEX
                          ? "ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--surface-1)] scale-110"
                          : "hover:scale-105"
                      }
                      ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    `}
                    style={{
                      background:
                        "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark, var(--primary)) 100%)",
                      color: "white",
                      textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                    }}
                    title={showBackRowOptions ? "Sage Green (Theme)" : "Site Theme Color"}
                  >
                    Theme
                  </button>
                )}

                {/* Site Theme Dark option - for BackRow Featured */}
                {(isAdmin || showBackRowOptions) && (
                  <button
                    type="button"
                    onClick={() => handleBorderColorSelect(THEME_DARK_COLOR_INDEX)}
                    disabled={disabled}
                    className={`
                      w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all
                      ${
                        selectedBorderColorIndex === THEME_DARK_COLOR_INDEX
                          ? "ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--surface-1)] scale-110"
                          : "hover:scale-105"
                      }
                      ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    `}
                    style={{
                      background: "hsl(155, 25%, 16%)",
                      color: "hsl(155, 25%, 50%)",
                      textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                    }}
                    title={showBackRowOptions ? "Dark Sage Green (Theme Dark)" : "Site Theme Dark"}
                  >
                    Dark
                  </button>
                )}

                {availableColors.map((color) => {
                  const isSelected = selectedBorderColorIndex === color.id;
                  return (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => handleBorderColorSelect(color.id)}
                      disabled={disabled}
                      className={`
                        w-9 h-9 rounded-lg transition-all
                        ${isSelected ? "ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--surface-1)] scale-110" : "hover:scale-105"}
                        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                      `}
                      style={{ backgroundColor: color.color }}
                      title={color.label}
                      aria-label={color.label}
                    />
                  );
                })}
              </div>
            </div>

            {/* Live Preview */}
            <div
              className="pt-3 border-t flex items-center gap-3"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="relative">
                <Avatar
                  size={mode === "club" ? "lg" : "md"}
                  src={isPhotoMode ? currentPhotoUrl : undefined}
                  defaultAvatarIcon={currentDisplayIcon ?? undefined}
                  defaultAvatarColor={currentColor}
                  defaultAvatarBorderColor={currentBorderColor}
                  alt={displayName}
                />
                {isSaving && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
                    <SpinnerGap className="w-4 h-4 text-white animate-spin" />
                  </div>
                )}
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                {isSaving ? "Saving..." : "Preview"}
              </span>
            </div>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}

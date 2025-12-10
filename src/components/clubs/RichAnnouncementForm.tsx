"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";

// Dynamic import for heavy TipTap editor (reduces initial bundle size)
const TipTapEditor = dynamic(() => import("./TipTapEditor").then((mod) => mod.TipTapEditor), {
  loading: () => (
    <div className="h-[200px] bg-[var(--surface-1)] rounded-lg border border-[var(--border)] animate-pulse" />
  ),
  ssr: false,
});
const TipTapPreview = dynamic(() => import("./TipTapEditor").then((mod) => mod.TipTapPreview), {
  ssr: false,
});
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  X,
  Eye,
  PencilSimple,
  CircleNotch,
  Image as ImageIcon,
  PushPin,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { createRichAnnouncement } from "@/app/actions/clubs";
import { createClient } from "@/lib/supabase/client";
import {
  validateFileUpload,
  getAllowedTypesString,
  getMaxFileSizeString,
} from "@/lib/validation/file-upload";
import Image from "next/image";

interface RichAnnouncementFormProps {
  clubId: string;
  onSuccess?: () => void;
}

export function RichAnnouncementForm({ clubId, onSuccess }: RichAnnouncementFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageOpacity, setImageOpacity] = useState(0.3);
  const [expiresAt, setExpiresAt] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");

  const resetForm = () => {
    setTitle("");
    setContent("");
    setImageUrl(null);
    setImageOpacity(0.3);
    setExpiresAt("");
    setError(null);
    setUploadError(null);
    setViewMode("edit");
  };

  const handleImageUpload = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    setUploadError(null);

    try {
      // Use centralized file validation
      const validation = validateFileUpload(file, "announcement");
      if (!validation.valid) {
        setUploadError(validation.error || "Invalid file");
        return null;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUploadError("You must be signed in");
        return null;
      }

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("announcement-images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        setUploadError("Failed to upload image");
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from("announcement-images").getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError("Failed to upload image");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleBackgroundImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await handleImageUpload(file);
    if (url) {
      setImageUrl(url);
    }
  };

  const handleRemoveBackgroundImage = () => {
    setImageUrl(null);
    setUploadError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!content.trim() || content === "<p></p>") {
      setError("Content is required");
      return;
    }

    const formData = new FormData();
    formData.append("clubId", clubId);
    formData.append("title", title.trim());
    formData.append("contentHtml", content);
    if (imageUrl) {
      formData.append("imageUrl", imageUrl);
      formData.append("imageOpacity", imageOpacity.toString());
    }
    if (expiresAt) {
      formData.append("expiresAt", expiresAt);
    }

    startTransition(async () => {
      const result = await createRichAnnouncement(null, formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        resetForm();
        onSuccess?.();
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Background Image Upload */}
      <div className="space-y-3">
        <Label className="text-sm text-[var(--text-primary)]">Background Theme (Optional)</Label>

        {imageUrl ? (
          <div className="space-y-3">
            {/* Preview of background effect */}
            <div className="relative rounded-lg overflow-hidden border border-[var(--border)] h-32">
              <div className="absolute inset-0">
                <Image
                  src={imageUrl}
                  alt="Background preview"
                  fill
                  className="object-cover"
                  style={{ opacity: imageOpacity }}
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="relative z-10 h-full flex items-end p-4">
                <span className="text-white font-semibold text-sm">Background Preview</span>
              </div>
              <button
                type="button"
                onClick={handleRemoveBackgroundImage}
                className="absolute top-2 right-2 z-20 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
                aria-label="Remove background"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Opacity Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-[var(--text-secondary)]">Background Opacity</Label>
                <span className="text-xs text-[var(--text-muted)] tabular-nums">
                  {Math.round(imageOpacity * 100)}%
                </span>
              </div>
              <Slider
                value={[imageOpacity]}
                onValueChange={([value]) => setImageOpacity(value)}
                min={0.1}
                max={0.8}
                step={0.05}
                className="w-full"
              />
              <p className="text-[10px] text-[var(--text-muted)]">
                Lower = more subtle, Higher = more visible
              </p>
            </div>
          </div>
        ) : (
          <label
            className={cn(
              "flex flex-col items-center justify-center gap-2 p-6",
              "border-2 border-dashed border-[var(--border)] rounded-lg",
              "bg-[var(--surface-1)] cursor-pointer",
              "hover:border-[var(--primary)] hover:bg-[var(--surface-2)]",
              "transition-colors",
              isUploading && "opacity-50 pointer-events-none"
            )}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleBackgroundImageUpload}
              disabled={isUploading}
              className="sr-only"
            />
            {isUploading ? (
              <>
                <CircleNotch className="h-6 w-6 text-[var(--text-muted)] animate-spin" />
                <span className="text-xs text-[var(--text-muted)]">Uploading...</span>
              </>
            ) : (
              <>
                <ImageIcon className="h-6 w-6 text-[var(--text-muted)]" weight="regular" />
                <span className="text-xs text-[var(--text-secondary)]">
                  Add a background or image-based announcement
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {getAllowedTypesString()} (max {getMaxFileSizeString("announcement")})
                </span>
              </>
            )}
          </label>
        )}

        {uploadError && <p className="text-xs text-[var(--error)]">{uploadError}</p>}
      </div>

      {/* Title */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="rich-title" className="text-sm text-[var(--text-primary)]">
            Title
          </Label>
          <span className="text-xs text-[var(--text-muted)] tabular-nums">{title.length}/50</span>
        </div>
        <Input
          id="rich-title"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 50))}
          placeholder="Announcement title"
          maxLength={50}
          required
          disabled={isPending}
          className="text-lg font-semibold"
        />
      </div>

      {/* Editor/Preview Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-sm text-[var(--text-primary)]">Content</Label>
        <div className="flex items-center gap-1 rounded-lg bg-[var(--surface-2)] p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("edit")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              viewMode === "edit"
                ? "bg-[var(--background)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <PencilSimple className="h-3 w-3" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setViewMode("preview")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              viewMode === "preview"
                ? "bg-[var(--background)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <Eye className="h-3 w-3" />
            Preview
          </button>
        </div>
      </div>

      {/* Editor or Preview */}
      {viewMode === "edit" ? (
        <TipTapEditor
          content={content}
          onChange={setContent}
          placeholder="Write your announcement here... Use the toolbar to format text, add links, and insert images."
          onImageUpload={handleImageUpload}
        />
      ) : (
        <div className="relative border border-[var(--border)] rounded-lg overflow-hidden">
          {/* Background Image Layer */}
          {imageUrl && (
            <>
              <div className="absolute inset-0">
                <Image
                  src={imageUrl}
                  alt="Background"
                  fill
                  className="object-cover"
                  style={{ opacity: imageOpacity }}
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80" />
            </>
          )}

          {/* Content Layer */}
          <div className={cn("relative z-10", !imageUrl && "bg-[var(--surface-1)]")}>
            {/* Preview Header */}
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center gap-2 text-xs text-white/60 mb-1">
                <PushPin className="h-3 w-3" />
                <span>Announcement Preview</span>
              </div>
              <h2
                className={cn(
                  "text-xl font-bold",
                  imageUrl ? "text-white" : "text-[var(--text-primary)]"
                )}
              >
                {title || "Untitled Announcement"}
              </h2>
            </div>

            {/* Preview Content */}
            {content && content !== "<p></p>" ? (
              <div
                className={cn(
                  "pb-2",
                  imageUrl &&
                    "[&_*]:!text-white/90 [&_h1]:!text-white [&_h2]:!text-white [&_h3]:!text-white [&_a]:!text-rose-300"
                )}
              >
                <TipTapPreview content={content} />
              </div>
            ) : (
              <div
                className={cn(
                  "px-4 pb-4 text-center text-sm",
                  imageUrl ? "text-white/60" : "text-[var(--text-muted)]"
                )}
              >
                No content yet. Switch to Edit mode to add content.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expiration */}
      <div className="space-y-2">
        <Label className="text-sm text-[var(--text-primary)]">Expires (Optional)</Label>
        <DateTimePicker
          value={expiresAt}
          onChange={(val) => setExpiresAt(val)}
          disabled={isPending}
          placeholder="Select expiration date"
        />
        <p className="text-xs text-[var(--text-muted)]">
          Leave empty to keep the announcement indefinitely
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-[var(--error)]/10 border border-[var(--error)]/20">
          <p className="text-sm text-[var(--error)]">{error}</p>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" onClick={resetForm} disabled={isPending}>
          Clear
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isPending || !title.trim() || !content.trim() || content === "<p></p>"}
          className="flex-1"
        >
          {isPending ? (
            <>
              <CircleNotch className="h-4 w-4 mr-2 animate-spin" />
              Publishing...
            </>
          ) : (
            "Publish Announcement"
          )}
        </Button>
      </div>
    </div>
  );
}

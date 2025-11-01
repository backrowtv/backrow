"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Image as ImageIcon, CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { uploadBackgroundImage } from "@/app/actions/backgrounds";

interface BackgroundPickerProps {
  value?: {
    image_url: string;
    // Legacy fields kept for backwards compatibility
    height_preset?: string;
    height_px?: number | null;
    opacity?: number;
    object_position?: string;
    scale?: number;
    extend_past_content?: boolean;
    mobile_height_preset?: string | null;
    mobile_height_px?: number | null;
    mobile_scale?: number | null;
    mobile_object_position?: string | null;
    mobile_opacity?: number | null;
    credit_title?: string | null;
    credit_year?: number | null;
    credit_studio?: string | null;
    credit_actor?: string | null;
  };
  onChange: (value: BackgroundPickerProps["value"]) => void;
  showCredits?: boolean;
  className?: string;
}

// Unique key counter to force input reset
let fileInputKeyCounter = 0;

export function BackgroundPicker({
  value,
  onChange,
  showCredits = true,
  className,
}: BackgroundPickerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileInputKey, setFileInputKey] = useState(() => ++fileInputKeyCounter);

  const currentValue = useMemo(
    () =>
      value || {
        image_url: "",
        credit_title: null,
        credit_year: null,
        credit_studio: null,
        credit_actor: null,
      },
    [value]
  );

  const handleFileSelect = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setUploadError(null);

      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadBackgroundImage(formData);

      if ("error" in result && result.error) {
        setUploadError(result.error);
        setIsUploading(false);
        setFileInputKey(++fileInputKeyCounter);
        return;
      }

      if (result.url) {
        onChange({
          ...currentValue,
          image_url: result.url,
        });
      }

      setIsUploading(false);
      setFileInputKey(++fileInputKeyCounter);
    },
    [currentValue, onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveImage = () => {
    onChange({
      ...currentValue,
      image_url: "",
    });
  };

  const handleChange = <K extends keyof typeof currentValue>(
    key: K,
    val: (typeof currentValue)[K]
  ) => {
    onChange({
      ...currentValue,
      [key]: val,
    });
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Theater Frame Preview */}
      {currentValue.image_url && (
        <div className="space-y-3">
          <Label>Preview</Label>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4 overflow-hidden">
            <div
              className="relative w-full rounded-xl border-4 border-neutral-800 overflow-hidden"
              style={{ aspectRatio: "1.85 / 1" }}
            >
              <Image
                src={currentValue.image_url}
                alt="Background preview"
                fill
                sizes="600px"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      )}

      {/* Image Upload */}
      <div className="space-y-3">
        <Label>Background Image</Label>

        {currentValue.image_url ? (
          <div className="space-y-4">
            {/* Current Image */}
            <div
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                "bg-[var(--surface-1)] border-[var(--border)]"
              )}
            >
              {/* Thumbnail */}
              <div className="relative w-24 h-12 rounded overflow-hidden flex-shrink-0 bg-black">
                <Image
                  src={currentValue.image_url}
                  alt="Background"
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-primary)]">Current Image</p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {currentValue.image_url.split("/").pop()}
                </p>
              </div>

              {/* Remove Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveImage}
                className="h-8 w-8 p-0 text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error)]/10 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Replace Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-9"
            >
              {isUploading ? (
                <CircleNotch className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4 mr-2" />
              )}
              Replace Image
            </Button>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload background image"
            className={cn(
              "relative rounded-xl border-2 border-dashed transition-colors cursor-pointer",
              "flex flex-col items-center justify-center py-16",
              isDragging
                ? "border-[var(--primary)] bg-[var(--primary)]/5"
                : "border-[var(--border)] hover:border-[var(--primary)]/50 bg-[var(--surface-1)]",
              isUploading && "pointer-events-none opacity-60"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            {isUploading ? (
              <CircleNotch className="w-10 h-10 animate-spin text-[var(--text-muted)]" />
            ) : (
              <>
                <ImageIcon className="w-12 h-12 text-[var(--text-muted)] mb-4" />
                <p className="text-sm text-[var(--text-secondary)] mb-1">
                  Drag and drop an image, or click to browse
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  JPEG, PNG, WebP, GIF • Max 5MB • auto-cropped to 1.85:1
                </p>
              </>
            )}
          </div>
        )}

        <input
          key={fileInputKey}
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          // Use absolute positioning and opacity 0 instead of hidden (display: none)
          // to ensure programmatic clicks work reliably across all browsers/OS (especially macOS/Safari)
          className="absolute inset-0 w-0 h-0 opacity-0 pointer-events-none"
          tabIndex={-1}
        />

        {uploadError && <p className="text-sm text-red-400">{uploadError}</p>}
      </div>

      {/* Credits Section */}
      {showCredits && (
        <Card className="p-4 bg-[var(--surface-2)] border-[var(--border)]">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-[var(--text-primary)] mb-1">Image Credits</h4>
              <p className="text-xs text-[var(--text-muted)]">
                Add credits for movie stills or other copyrighted images
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="credit-title">Movie/Source Title</Label>
                <Input
                  id="credit-title"
                  placeholder="e.g., Batman Forever"
                  value={currentValue.credit_title || ""}
                  onChange={(e) => handleChange("credit_title", e.target.value || null)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="credit-year">Year</Label>
                <Input
                  id="credit-year"
                  type="number"
                  placeholder="e.g., 1995"
                  value={currentValue.credit_year || ""}
                  onChange={(e) => handleChange("credit_year", parseInt(e.target.value) || null)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="credit-studio">Studio/Copyright</Label>
                <Input
                  id="credit-studio"
                  placeholder="e.g., Warner Bros."
                  value={currentValue.credit_studio || ""}
                  onChange={(e) => handleChange("credit_studio", e.target.value || null)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="credit-actor">Featured Actor</Label>
                <Input
                  id="credit-actor"
                  placeholder="e.g., Jim Carrey"
                  value={currentValue.credit_actor || ""}
                  onChange={(e) => handleChange("credit_actor", e.target.value || null)}
                />
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

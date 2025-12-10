"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { BackgroundType, BackgroundOption } from "@/types/club-creation";
import {
  validateFileUpload,
  getAllowedTypesString,
  getMaxFileSizeString,
} from "@/lib/validation/file-upload";
import toast from "react-hot-toast";

interface BackgroundSelectorProps {
  backgroundType?: BackgroundType | null;
  backgroundValue?: string | null;
  onSelect: (type: BackgroundType, value: string, preview?: string, file?: File) => void;
  disabled?: boolean;
  fileInputName?: string; // Name for the file input in the form
  label?: string; // Custom label for the section
  helperText?: string; // Helper text below the section
}

// Preset gradient options (BackRow-branded rose/teal combinations)
const PRESET_GRADIENTS: BackgroundOption[] = [
  {
    id: "gradient-1",
    name: "Rose Sunset",
    type: "gradient",
    value: "rose-sunset",
    preview: "linear-gradient(135deg, #f43f5e 0%, #ec4899 50%, #a855f7 100%)",
  },
  {
    id: "gradient-2",
    name: "Teal Ocean",
    type: "gradient",
    value: "teal-ocean",
    preview: "linear-gradient(135deg, #14b8a6 0%, #06b6d4 50%, #3b82f6 100%)",
  },
  {
    id: "gradient-3",
    name: "Rose to Teal",
    type: "gradient",
    value: "rose-teal",
    preview: "linear-gradient(135deg, #f43f5e 0%, #ec4899 50%, #14b8a6 100%)",
  },
  {
    id: "gradient-4",
    name: "Dark Rose",
    type: "gradient",
    value: "dark-rose",
    preview: "linear-gradient(135deg, #831843 0%, #9f1239 50%, #be123c 100%)",
  },
  {
    id: "gradient-5",
    name: "Dark Teal",
    type: "gradient",
    value: "dark-teal",
    preview: "linear-gradient(135deg, #134e4a 0%, #0f766e 50%, #14b8a6 100%)",
  },
  {
    id: "gradient-6",
    name: "Purple Dreams",
    type: "gradient",
    value: "purple-dreams",
    preview: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)",
  },
  {
    id: "gradient-7",
    name: "Cinema Dark",
    type: "gradient",
    value: "cinema-dark",
    preview: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)",
  },
  {
    id: "gradient-8",
    name: "Warm Glow",
    type: "gradient",
    value: "warm-glow",
    preview: "linear-gradient(135deg, #f97316 0%, #f43f5e 50%, #ec4899 100%)",
  },
];

// Preset image options (curated movie-themed backgrounds)
// Note: These are placeholder URLs - replace with actual curated images
const PRESET_IMAGES: BackgroundOption[] = [
  {
    id: "preset-1",
    name: "Film Reel",
    type: "preset_image",
    value: "film-reel",
    preview: "/images/backgrounds/film-reel.jpg", // Placeholder - replace with actual image
  },
  {
    id: "preset-2",
    name: "Cinema Seats",
    type: "preset_image",
    value: "cinema-seats",
    preview: "/images/backgrounds/cinema-seats.jpg", // Placeholder - replace with actual image
  },
  {
    id: "preset-3",
    name: "Projector Light",
    type: "preset_image",
    value: "projector-light",
    preview: "/images/backgrounds/projector-light.jpg", // Placeholder - replace with actual image
  },
  {
    id: "preset-4",
    name: "Movie Theater",
    type: "preset_image",
    value: "movie-theater",
    preview: "/images/backgrounds/movie-theater.jpg", // Placeholder - replace with actual image
  },
  {
    id: "preset-5",
    name: "Film Strip",
    type: "preset_image",
    value: "film-strip",
    preview: "/images/backgrounds/film-strip.jpg", // Placeholder - replace with actual image
  },
  {
    id: "preset-6",
    name: "Popcorn",
    type: "preset_image",
    value: "popcorn",
    preview: "/images/backgrounds/popcorn.jpg", // Placeholder - replace with actual image
  },
];

export function BackgroundSelector({
  backgroundType,
  backgroundValue,
  onSelect,
  disabled = false,
  fileInputName = "background_image",
  label,
  helperText,
}: BackgroundSelectorProps) {
  const [selectedType, setSelectedType] = useState<BackgroundType | null>(backgroundType || null);
  const [customPreview, setCustomPreview] = useState<string | null>(null);
  const [_customFile, setCustomFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGradientSelect = (gradient: BackgroundOption) => {
    setSelectedType("gradient");
    setCustomPreview(null);
    onSelect("gradient", gradient.value, gradient.preview);
  };

  const handlePresetImageSelect = (preset: BackgroundOption) => {
    setSelectedType("preset_image");
    setCustomPreview(null);
    onSelect("preset_image", preset.value, preset.preview);
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Use centralized file validation
    const validation = validateFileUpload(file, "background");
    if (!validation.valid) {
      toast.error(validation.error || "Invalid file");
      e.target.value = "";
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const previewUrl = reader.result as string;
      setCustomPreview(previewUrl);
      setCustomFile(file);
      setSelectedType("custom_image");
      // Pass the file to the parent so it can be included in form submission
      onSelect("custom_image", file.name, previewUrl, file);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCustom = () => {
    setCustomPreview(null);
    setCustomFile(null);
    setSelectedType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // Reset to default gradient
    onSelect("gradient", PRESET_GRADIENTS[0].value, PRESET_GRADIENTS[0].preview);
  };

  const getCurrentPreview = (): string | undefined => {
    if (selectedType === "custom_image" && customPreview) {
      return customPreview;
    }
    if (selectedType === "gradient") {
      const gradient = PRESET_GRADIENTS.find((g) => g.value === backgroundValue);
      return gradient?.preview;
    }
    if (selectedType === "preset_image") {
      const preset = PRESET_IMAGES.find((p) => p.value === backgroundValue);
      return preset?.preview;
    }
    return undefined;
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
          {label || "Club Background"}
        </label>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          {helperText ||
            "Choose a background to personalize your club. You can use a preset gradient, curated image, or upload your own."}
        </p>
      </div>

      {/* Preview */}
      {getCurrentPreview() && (
        <div
          className="relative w-full h-32 rounded-lg overflow-hidden border"
          style={{ borderColor: "var(--border)" }}
        >
          {selectedType === "custom_image" || selectedType === "preset_image" ? (
            <Image
              src={getCurrentPreview()!}
              alt="Background preview"
              fill
              className="object-cover"
              sizes="100vw"
              onError={(e) => {
                // Fallback if preset image doesn't exist
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full" style={{ background: getCurrentPreview() }} />
          )}
          {selectedType === "custom_image" && (
            <button
              type="button"
              onClick={handleRemoveCustom}
              disabled={disabled}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Remove custom background"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Tabs for gradient/preset/custom */}
      <div className="space-y-4">
        {/* Preset Gradients */}
        <div>
          <h4 className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
            Preset Gradients
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {PRESET_GRADIENTS.map((gradient) => (
              <button
                key={gradient.id}
                type="button"
                onClick={() => handleGradientSelect(gradient)}
                disabled={disabled}
                className={`relative h-16 rounded-lg border-2 transition-all ${
                  selectedType === "gradient" && backgroundValue === gradient.value
                    ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20"
                    : "border-[var(--border)] hover:border-[var(--border-hover)]"
                }`}
                style={{ background: gradient.preview }}
                aria-label={`Select ${gradient.name} gradient`}
              >
                {selectedType === "gradient" && backgroundValue === gradient.value && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="w-4 h-4 rounded-full bg-[var(--primary)] border-2 border-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Preset Images */}
        <div>
          <h4 className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
            Curated Images
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {PRESET_IMAGES.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetImageSelect(preset)}
                disabled={disabled}
                className={`relative h-20 rounded-lg border-2 overflow-hidden transition-all ${
                  selectedType === "preset_image" && backgroundValue === preset.value
                    ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20"
                    : "border-[var(--border)] hover:border-[var(--border-hover)]"
                }`}
                aria-label={`Select ${preset.name} background`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--surface-3)] to-[var(--surface-2)]" />
                {selectedType === "preset_image" && backgroundValue === preset.value && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="w-4 h-4 rounded-full bg-[var(--primary)] border-2 border-white" />
                  </div>
                )}
                <span className="absolute bottom-1 left-1 right-1 text-xs text-white font-medium truncate px-1 bg-black/50 rounded">
                  {preset.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Upload */}
        <div>
          <h4 className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
            Custom Image
          </h4>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            >
              <Upload className="h-4 w-4 mr-2" />
              {customPreview ? "Change Image" : "Upload Image"}
            </Button>
            {customPreview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveCustom}
                disabled={disabled}
              >
                Remove
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              name={fileInputName}
              accept="image/*"
              className="hidden"
              onChange={handleCustomUpload}
              disabled={disabled}
            />
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
            Max {getMaxFileSizeString("background")} • {getAllowedTypesString()}
          </p>
        </div>
      </div>
    </div>
  );
}

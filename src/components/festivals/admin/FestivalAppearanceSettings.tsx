"use client";

import { useState, useRef, useActionState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackgroundSelector } from "@/components/clubs/BackgroundSelector";
import { updateFestivalAppearance } from "@/app/actions/festivals";
import { BackgroundType } from "@/types/club-creation";
import { Camera, Gear, X } from "@phosphor-icons/react";
import toast from "react-hot-toast";

interface FestivalAppearanceSettingsProps {
  festivalId: string;
  currentPictureUrl?: string | null;
  currentBackgroundType?: string | null;
  currentBackgroundValue?: string | null;
  onClose?: () => void;
}

type FormState = { error?: string; success?: boolean } | null;

export function FestivalAppearanceSettings({
  festivalId,
  currentPictureUrl,
  currentBackgroundType,
  currentBackgroundValue,
  onClose,
}: FestivalAppearanceSettingsProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    updateFestivalAppearance,
    null
  );

  const [picturePreview, setPicturePreview] = useState<string | null>(currentPictureUrl || null);
  const [backgroundType, setBackgroundType] = useState<BackgroundType | null>(
    (currentBackgroundType as BackgroundType) || null
  );
  const [backgroundValue, setBackgroundValue] = useState<string | null>(
    currentBackgroundValue || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh on success
  if (state && "success" in state && state.success) {
    toast.success("Festival appearance updated!");
    router.refresh();
    onClose?.();
  }

  return (
    <Card className="border-[var(--border)] bg-[var(--surface-1)]">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Gear className="h-4 w-4" />
          Festival Appearance
        </CardTitle>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="festivalId" value={festivalId} />
          <input type="hidden" name="background_type" value={backgroundType || ""} />
          <input type="hidden" name="background_value" value={backgroundValue || ""} />

          {state && "error" in state && state.error && (
            <div className="p-3 rounded-lg bg-red-600 border border-red-600 text-white text-sm">
              {state.error}
            </div>
          )}

          {/* Festival Picture */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Festival Picture
            </label>
            <p className="text-xs text-[var(--text-muted)]">
              A circular image that represents this festival
            </p>

            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[var(--border)] bg-[var(--surface-2)]">
                {picturePreview ? (
                  <Image
                    src={picturePreview}
                    alt="Festival picture"
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Camera className="h-6 w-6 text-[var(--text-muted)]" />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPending}
                >
                  {picturePreview ? "Change Picture" : "Upload Picture"}
                </Button>
                {picturePreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPicturePreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    disabled={isPending}
                  >
                    Remove
                  </Button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                name="picture"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error("Picture must be less than 5MB");
                      e.target.value = "";
                      return;
                    }
                    const reader = new FileReader();
                    reader.onloadend = () => setPicturePreview(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
                disabled={isPending}
              />
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">
              Max 5MB • JPEG, PNG, GIF, or WebP
            </p>
          </div>

          {/* Background */}
          <div>
            <BackgroundSelector
              backgroundType={backgroundType}
              backgroundValue={backgroundValue || undefined}
              onSelect={(type, value, _preview) => {
                setBackgroundType(type);
                setBackgroundValue(value);
              }}
              disabled={isPending}
              fileInputName="background_image"
              label="Festival Background"
              helperText="This background appears at the top of the dedicated festival page"
            />
          </div>

          <div className="pt-2">
            <Button type="submit" className="w-full" isLoading={isPending}>
              {isPending ? "Saving..." : "Save Appearance"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

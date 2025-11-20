"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  RatingScaleCustomizer,
  type RatingScaleSettings,
} from "@/components/ratings/RatingScaleCustomizer";
import { updateRatingPreferences } from "@/app/actions/profile";
import type { UserRatingPreferences } from "@/types/user-rating-preferences";
import { DEFAULT_RATING_PREFERENCES } from "@/types/user-rating-preferences";
import { Text } from "@/components/ui/typography";
import toast from "react-hot-toast";

interface PersonalRatingScaleFormProps {
  initialPreferences?: UserRatingPreferences;
}

export function PersonalRatingScaleForm({
  initialPreferences = DEFAULT_RATING_PREFERENCES,
}: PersonalRatingScaleFormProps) {
  const [preferences, setPreferences] = useState<UserRatingPreferences>(initialPreferences);
  const [isPending, startTransition] = useTransition();
  const [savedPreferences, setSavedPreferences] =
    useState<UserRatingPreferences>(initialPreferences);

  const hasChanges = JSON.stringify(preferences) !== JSON.stringify(savedPreferences);

  const handleChange = (settings: RatingScaleSettings) => {
    setPreferences((prev) => ({
      ...prev,
      ...settings,
    }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateRatingPreferences(preferences);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Rating preferences saved");
        setSavedPreferences(preferences);
      }
    });
  };

  return (
    <div>
      {/* Mobile title — above the card */}
      <div className="sm:hidden flex items-center justify-between mb-2">
        <Text size="sm" className="font-medium">
          Rating Scale
        </Text>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={isPending}
          className={cn(
            "h-6 text-xs px-2.5 transition-opacity",
            hasChanges ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="relative">
        <RatingScaleCustomizer
          settings={preferences}
          onChange={handleChange}
          disabled={isPending}
          showHeader={true}
          showPreview={true}
        />

        {/* Save button — desktop only, positioned in header area */}
        {hasChanges && (
          <div className="absolute top-4 right-4 hidden sm:block">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={isPending}
              className="h-7 text-xs"
            >
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

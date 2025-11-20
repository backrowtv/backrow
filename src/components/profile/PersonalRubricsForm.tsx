"use client";

import { useState } from "react";
import { RubricLibrary } from "@/components/ratings/RubricLibrary";
import { PersonalRatingScaleForm } from "@/components/profile/PersonalRatingScaleForm";
import { Text } from "@/components/ui/typography";
import type { UserRubric } from "@/app/actions/rubrics.types";
import type { UserRatingPreferences } from "@/types/user-rating-preferences";
import { DEFAULT_RATING_PREFERENCES } from "@/types/user-rating-preferences";
import { Info } from "@phosphor-icons/react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PersonalRubricsFormProps {
  initialRubrics: UserRubric[];
  initialRatingPreferences?: UserRatingPreferences;
}

export function PersonalRubricsForm({
  initialRubrics,
  initialRatingPreferences = DEFAULT_RATING_PREFERENCES,
}: PersonalRubricsFormProps) {
  const [rubrics, setRubrics] = useState<UserRubric[]>(initialRubrics);

  return (
    <div className="space-y-8">
      {/* General Rating Scale Section */}
      <PersonalRatingScaleForm initialPreferences={initialRatingPreferences} />

      {/* Divider */}
      <div className="border-t" style={{ borderColor: "var(--border)" }} />

      {/* Rubric Library Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Text size="sm" className="font-medium">
            Rubric Library
          </Text>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full hover:bg-[var(--hover)] p-0.5 transition-colors"
                >
                  <Info className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[260px]">
                <p className="text-xs">
                  Create and manage your personal rating rubrics for category-based ratings. Set one
                  as default, and override it per-club in each club&apos;s settings.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <RubricLibrary initialRubrics={rubrics} onRubricsChange={setRubrics} />
      </div>
    </div>
  );
}

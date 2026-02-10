"use client";

import { CustomizeHint } from "@/components/ui/CustomizeHint";
import { useUserProfile } from "@/components/auth/UserProfileProvider";

export function RatingCustomizeHint() {
  const { isHintDismissed } = useUserProfile();

  return (
    <CustomizeHint
      hintKey="rating-customize-hint"
      initialDismissed={isHintDismissed("rating-customize-hint")}
      href="/profile/settings/ratings"
      linkText="customize your rating scale & create rubrics"
    />
  );
}

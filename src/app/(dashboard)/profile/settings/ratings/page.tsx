import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PersonalRubricsForm } from "@/components/profile/PersonalRubricsForm";
import { MobileBackButton } from "@/components/profile/MobileBackButton";
import type { UserRubric } from "@/app/actions/rubrics.types";
import type { UserRatingPreferences } from "@/types/user-rating-preferences";
import { DEFAULT_RATING_PREFERENCES } from "@/types/user-rating-preferences";

export default async function RatingsSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Get user's rubrics from the new user_rubrics table
  const { data: rubrics } = await supabase
    .from("user_rubrics")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Get user's rating preferences
  const { data: userData } = await supabase
    .from("users")
    .select("rating_preferences")
    .eq("id", user.id)
    .single();

  const ratingPreferences: UserRatingPreferences =
    (userData?.rating_preferences as UserRatingPreferences) || DEFAULT_RATING_PREFERENCES;

  const userRubrics: UserRubric[] = (rubrics || []).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    name: r.name,
    categories: r.categories as UserRubric["categories"],
    is_default: r.is_default,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Mobile Back Button */}
        <MobileBackButton href="/profile/settings" label="Settings" />

        {/* Header - Hidden on mobile since TopNav shows "Profile" */}
        <div className="hidden md:block mb-6">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Rating Settings</h1>
        </div>

        <PersonalRubricsForm
          initialRubrics={userRubrics}
          initialRatingPreferences={ratingPreferences}
        />
      </div>
    </div>
  );
}

import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { NominationsContainer } from "@/components/profile/NominationsContainer";
import { Skeleton } from "@/components/ui/skeleton";
import { TourPopup } from "@/components/onboarding/TourPopup";
import { profileNominationsTour } from "@/components/onboarding/tour-content";

export default async function NominationsPage() {
  // Opt out of caching to allow useSearchParams in client components
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="bg-[var(--background)]">
      <TourPopup hintKey="tour-profile-nominations" {...profileNominationsTour} />
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Header - Hidden on mobile since TopNav shows "Profile" */}
        <div className="hidden lg:block mb-6">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Nominations</h1>
          <p className="text-xs text-[var(--text-muted)]">
            Your movie nominations - past and future
          </p>
        </div>

        <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
          <NominationsContainer userId={user.id} />
        </Suspense>
      </div>
    </div>
  );
}

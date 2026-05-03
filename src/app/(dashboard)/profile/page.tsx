import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileActivityFeed } from "@/components/profile/ProfileActivityFeed";
import { FutureNominations } from "@/components/profile/FutureNominations";
import { RecentlyWatched } from "@/components/profile/RecentlyWatched";
import { ProfileCompletionBanner } from "@/components/profile/ProfileCompletionBanner";
import { TourPopup } from "@/components/onboarding/TourPopup";
import { profileTour } from "@/components/onboarding/tour-content";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

// Quick-link cards for profile navigation
const profileLinks = [
  {
    label: "Settings",
    description: "Account, notifications, and preferences",
    href: "/profile/settings",
  },
  {
    label: "Display Case",
    description: "Favorites, achievements, and badges",
    href: "/profile/display-case",
  },
  {
    label: "Stats",
    description: "Performance, ratings, and fun stats",
    href: "/profile/stats",
  },
];

function ActivitySkeleton() {
  return (
    <div className="space-y-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-2 py-1.5">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-2.5 w-12" />
        </div>
      ))}
    </div>
  );
}

function RecentlyWatchedSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Skeleton key={i} className="w-24 md:w-28 aspect-[2/3] rounded-md flex-shrink-0" />
      ))}
    </div>
  );
}

function ProfilePageSkeleton() {
  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="space-y-6">
        <RecentlyWatchedSkeleton />
        <Skeleton className="h-48 w-full rounded-lg" />
        <ActivitySkeleton />
      </div>
    </div>
  );
}

// Server component that fetches user data and stats
async function ProfilePageContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Check if profile needs completion (display name or bio missing)
  const { data: profile } = await supabase
    .from("users")
    .select("display_name, bio, dismissed_hints")
    .eq("id", user.id)
    .maybeSingle();

  const needsDisplayName = !profile?.display_name;
  const needsBio = !profile?.bio;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <TourPopup hintKey="tour-profile" {...profileTour} />
      {/* Profile completion prompt */}
      {(needsDisplayName || needsBio) && (
        <ProfileCompletionBanner
          initialDismissed={
            !!(profile?.dismissed_hints as Record<string, boolean>)?.["profile-completion"]
          }
          needsDisplayName={needsDisplayName}
          needsBio={needsBio}
        />
      )}

      {/* Main Content */}
      <div className="space-y-6">
        {/* Recently Watched + Activity Feed - Stacked single column */}
        <div className="grid grid-cols-1 gap-6">
          {/* Recently Watched - Half width on desktop */}
          <section>
            <Suspense fallback={<RecentlyWatchedSkeleton />}>
              <RecentlyWatched userId={user.id} />
            </Suspense>
          </section>

          {/* Recent Activity - Half width on desktop, after watched on mobile */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
                Recent Activity
              </h2>
              <Link
                href="/activity?category=member_activity"
                className="flex items-center gap-0.5 text-sm text-[var(--primary)] transition-colors"
              >
                All
                <CaretRight className="h-4 w-4" />
              </Link>
            </div>
            <Suspense fallback={<ActivitySkeleton />}>
              <ProfileActivityFeed userId={user.id} limit={5} currentUserId={user.id} />
            </Suspense>
          </section>
        </div>

        {/* Future Nominations - Full width below */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
              Future Nominations
            </h2>
            <Link
              href="/profile/future-nominations"
              className="flex items-center gap-0.5 text-sm text-[var(--primary)] transition-colors"
            >
              All
              <CaretRight className="h-4 w-4" />
            </Link>
          </div>
          <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
            <FutureNominations userId={user.id} showAddButton={true} showDetails={false} />
          </Suspense>
        </section>

        {/* Quick Links */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-[var(--border)]">
          {profileLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] hover:border-[var(--text-muted)] transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                  {link.label}
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">{link.description}</p>
              </div>
              <CaretRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors flex-shrink-0" />
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfilePageSkeleton />}>
      <ProfilePageContent />
    </Suspense>
  );
}

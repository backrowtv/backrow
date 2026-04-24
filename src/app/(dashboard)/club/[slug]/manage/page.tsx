import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import {
  CalendarDots,
  FilmSlate,
  Megaphone,
  UserGear,
  Gear,
  Star,
  ClockCounterClockwise,
} from "@phosphor-icons/react/dist/ssr";
import { resolveClub } from "@/lib/clubs/resolveClub";
import { ClubNavigation } from "@/components/clubs/ClubNavigation";
import Link from "next/link";

// BackRow Featured Club slug for homepage movies
const BACKROW_FEATURED_SLUG = "backrow-featured";

interface ManagePageProps {
  params: Promise<{ slug: string }>;
}

export default function ManagePage(props: ManagePageProps) {
  return (
    <Suspense fallback={null}>
      <ManagePageContent {...props} />
    </Suspense>
  );
}

async function ManagePageContent({ params }: ManagePageProps) {
  const identifier = (await params).slug;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Resolve club by slug or ID
  const clubResolution = await resolveClub(supabase, identifier);
  if (!clubResolution) redirect("/clubs");

  const clubId = clubResolution.id;
  const clubSlug = clubResolution.slug || clubId;

  // Check if user is a member and admin
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    redirect("/clubs");
  }

  const isAdmin = membership?.role === "producer" || membership?.role === "director";
  const isProducer = membership?.role === "producer";

  // Only admins can access this page
  if (!isAdmin) {
    redirect(`/club/${clubSlug}`);
  }

  // Get club info
  const { data: club } = await supabase
    .from("clubs")
    .select("name, slug, settings")
    .eq("id", clubId)
    .single();

  // Check if this is the BackRow Featured Club (for homepage movies)
  const isBackrowFeatured = club?.slug === BACKROW_FEATURED_SLUG;
  const clubSettings = club?.settings as Record<string, unknown> | null;
  const isEndlessFestival = clubSettings?.festival_type === "endless";

  // Build menu items based on role
  type MenuItem = {
    title: string;
    description: string;
    href: string;
    icon: typeof FilmSlate;
    producerOnly?: boolean;
  };

  const menuItems: MenuItem[] = [
    {
      title: "Festival",
      description: "Create festivals and manage phases",
      href: `/club/${clubSlug}/manage/festival`,
      icon: FilmSlate,
    },
    {
      title: "Season",
      description: "Manage, pause, and create seasons",
      href: `/club/${clubSlug}/manage/season`,
      icon: CalendarDots,
    },
    {
      title: "Announcements",
      description: "Post updates to club members",
      href: `/club/${clubSlug}/manage/announcements`,
      icon: Megaphone,
    },
    {
      title: "Import History",
      description: "Add movies your club watched before BackRow",
      href: `/club/${clubSlug}/manage/import-history`,
      icon: ClockCounterClockwise,
    },
  ];

  // Add homepage movies for BackRow Featured Club only
  if (isBackrowFeatured && isEndlessFestival) {
    menuItems.push({
      title: "Homepage Movies",
      description: "Manage featured and throwback movies",
      href: `/club/${clubSlug}/manage/homepage-movies`,
      icon: Star,
    });
  }

  // Producer-only items
  if (isProducer) {
    menuItems.push({
      title: "Club Management",
      description: "Moderation, ownership transfer, and club settings",
      href: `/club/${clubSlug}/manage/club-management`,
      icon: UserGear,
      producerOnly: true,
    });
  }

  // Settings is always last
  menuItems.push({
    title: "Settings",
    description: "Club rules, scoring, and preferences",
    href: `/club/${clubSlug}/settings`,
    icon: Gear,
  });

  return (
    <>
      <ClubNavigation
        clubSlug={clubSlug}
        clubName={club?.name || "Club"}
        isAdmin={isAdmin}
        isProducer={isProducer}
      />
      <div className="bg-[var(--background)]">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
          {/* Header - Hidden on mobile since TopNav shows club name */}
          <div className="hidden lg:block mb-6">
            <h1 className="text-lg font-semibold text-[var(--club-accent,var(--text-primary))]">
              Manage Club
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              {isProducer ? "Full admin access" : "Director tools"}
            </p>
          </div>

          {/* Menu Items - Compact list */}
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <div className="flex items-center gap-3 py-3 px-3 -mx-3 rounded-lg transition-colors hover:bg-[var(--surface-1)]">
                    <div className="w-10 h-10 rounded-lg bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-[var(--text-muted)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {item.title}
                        </p>
                        {item.producerOnly && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)]">
                            Producer
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">{item.description}</p>
                    </div>
                    <CaretRight className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

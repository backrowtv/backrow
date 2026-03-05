import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { HomeFeed } from "./HomeFeed";
import { ClubActivityFeedSkeleton } from "./ClubActivityFeed";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import {
  TimelineItemCompact,
  TimelineCompactList,
  type TimelineItemCompactData,
  type TimelineItemType,
} from "@/components/timeline/TimelineItemCompact";
import { EmptyState } from "@/components/shared/EmptyState";
import { CalendarBlank } from "@phosphor-icons/react/dist/ssr";

// ============================================
// UPCOMING DATES WIDGET
// ============================================

async function getUpcomingDates(userId: string): Promise<TimelineItemCompactData[]> {
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("user_id", userId);

  if (!memberships || memberships.length === 0) return [];

  const clubIds = memberships.map((m) => m.club_id);

  const { data: festivals } = await supabase
    .from("festivals")
    .select(
      `
      id,
      slug,
      theme,
      phase,
      nomination_deadline,
      watch_deadline,
      rating_deadline,
      club:club_id (
        id,
        name,
        slug,
        picture_url,
        avatar_icon,
        avatar_color_index,
        avatar_border_color_index
      )
    `
    )
    .in("club_id", clubIds)
    .in("status", ["nominating", "watching"])
    .order("nomination_deadline", { ascending: true })
    .limit(5);

  const upcomingDates: TimelineItemCompactData[] = [];

  festivals?.forEach((f) => {
    const club = Array.isArray(f.club) ? f.club[0] : f.club;
    if (!club) return;

    const clubSlug = club.slug || club.id;
    const festivalSlug = f.slug || f.id;
    const link = `/club/${clubSlug}/festival/${festivalSlug}`;
    const clubAvatarIcon = (club as { avatar_icon?: string | null }).avatar_icon || null;
    const clubAvatarColorIndex =
      (club as { avatar_color_index?: number | null }).avatar_color_index ?? null;
    const clubAvatarBorderColorIndex =
      (club as { avatar_border_color_index?: number | null }).avatar_border_color_index ?? null;

    if (f.nomination_deadline && new Date(f.nomination_deadline) > new Date()) {
      upcomingDates.push({
        id: `${f.id}-nomination`,
        type: "nomination_deadline" as TimelineItemType,
        date: f.nomination_deadline,
        title: f.theme || "Festival",
        clubName: club.name,
        clubSlug,
        clubAvatarUrl: club.picture_url || null,
        clubAvatarIcon,
        clubAvatarColorIndex,
        clubAvatarBorderColorIndex,
        link,
      });
    }
    if (f.rating_deadline && new Date(f.rating_deadline) > new Date()) {
      upcomingDates.push({
        id: `${f.id}-rating`,
        type: "rating_deadline" as TimelineItemType,
        date: f.rating_deadline,
        title: f.theme || "Festival",
        clubName: club.name,
        clubSlug,
        clubAvatarUrl: club.picture_url || null,
        clubAvatarIcon,
        clubAvatarColorIndex,
        clubAvatarBorderColorIndex,
        link,
      });
    }
  });

  return upcomingDates
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);
}

// ============================================
// MAIN COMPONENT
// ============================================

async function WidgetsContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const upcomingDates = await getUpcomingDates(user.id);

  return (
    <div className="space-y-4">
      {/* Upcoming - Always show */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-primary)]">
            Upcoming
          </h2>
          <Link
            href="/timeline"
            className="flex items-center gap-0.5 text-sm text-[var(--primary)] transition-colors"
          >
            All
            <CaretRight className="h-4 w-4" />
          </Link>
        </div>
        <div>
          {upcomingDates.length > 0 ? (
            <TimelineCompactList>
              {upcomingDates.map((item) => (
                <TimelineItemCompact key={item.id} item={item} />
              ))}
            </TimelineCompactList>
          ) : (
            <EmptyState
              icon={CalendarBlank}
              title="No upcoming deadlines or events"
              variant="compact"
            />
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <HomeFeed />
    </div>
  );
}

function WidgetsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16 rounded-lg" />
      <ClubActivityFeedSkeleton />
    </div>
  );
}

export async function HomeWidgets() {
  return (
    <Suspense fallback={<WidgetsSkeleton />}>
      <WidgetsContent />
    </Suspense>
  );
}

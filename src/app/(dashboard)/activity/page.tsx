import { createClient } from "@/lib/supabase/server";
import {
  getPaginatedActivityFeed,
  wrapActivitiesWithoutGrouping,
  enrichWithMoviePosters,
} from "@/lib/activity/club-activity-feed";
import {
  parseActivityFiltersFromURL,
  subFiltersToActions,
  getDateRangeFromPreset,
  serializeActivityFiltersToURL,
} from "@/lib/activity/activity-filters";
import { ActivityFiltersV2 } from "@/components/activity/ActivityFiltersV2";
import { type MemberOption } from "@/components/activity/MemberFilterCombobox";
import { ActivityFeedClient } from "@/components/activity/ActivityFeedClient";
import { PaginationControls } from "@/components/activity/PaginationControls";
import { EmptyState } from "@/components/shared/EmptyState";
import { Clock } from "@phosphor-icons/react/dist/ssr";

interface ActivityPageProps {
  searchParams: Promise<{
    category?: string;
    sub?: string;
    club?: string; // Legacy single club (backward compat)
    clubs?: string; // New multi-club support
    user?: string;
    date?: string;
    page?: string;
    size?: string;
  }>;
}

const DEFAULT_PAGE_SIZE = 15;
const VALID_PAGE_SIZES = [15, 25, 50, 100];

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="bg-[var(--background)]">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
          <p className="text-center text-[var(--text-muted)]">
            Please sign in to view your activity.
          </p>
        </div>
      </div>
    );
  }

  // Parse pagination
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const requestedSize = parseInt(params.size || String(DEFAULT_PAGE_SIZE), 10);
  const pageSize = VALID_PAGE_SIZES.includes(requestedSize) ? requestedSize : DEFAULT_PAGE_SIZE;

  // Parse filters from URL using the new helper
  const urlSearchParams = new URLSearchParams();
  if (params.category) urlSearchParams.set("category", params.category);
  if (params.sub) urlSearchParams.set("sub", params.sub);
  if (params.club) urlSearchParams.set("club", params.club);
  if (params.clubs) urlSearchParams.set("clubs", params.clubs);
  if (params.user) urlSearchParams.set("user", params.user);
  if (params.date) urlSearchParams.set("date", params.date);

  const filters = parseActivityFiltersFromURL(urlSearchParams);

  // Convert category to filter type for data layer
  const filter =
    filters.category === "club_activity"
      ? "club"
      : filters.category === "member_activity"
        ? "member"
        : "all";

  // Convert sub-filters to action types
  const actionTypes =
    filters.category && filters.subFilters.length > 0
      ? subFiltersToActions(filters.category, filters.subFilters)
      : [];

  // Get date range from preset
  const dateRange = getDateRangeFromPreset(filters.dateRange);

  // Get user's clubs for filter dropdown (with role info)
  const { data: memberships } = await supabase
    .from("club_members")
    .select("club_id, role")
    .eq("user_id", user.id);

  const userClubIds = memberships?.map((m) => m.club_id) || [];

  // Build a map of club_id -> user's role
  const userRolesMap = new Map<string, string>();
  memberships?.forEach((m) => {
    userRolesMap.set(m.club_id, m.role);
  });

  // Compute admin club IDs upfront (only depends on memberships, not on further queries)
  const selectedClubIds = filters.clubIds.filter((id) => userClubIds.includes(id));
  const adminClubIds = selectedClubIds.filter((id) => {
    const role = userRolesMap.get(id);
    return role === "producer" || role === "director";
  });
  const isAdminOfAnySelectedClub = adminClubIds.length > 0;
  let clubMembers: MemberOption[] = [];
  let clubAdmins: MemberOption[] = [];

  // Run clubs and members queries in parallel (both depend only on memberships)
  const [clubsResult, membersResult] = await Promise.all([
    userClubIds.length > 0
      ? supabase
          .from("clubs")
          .select("id, name")
          .in("id", userClubIds)
          .eq("archived", false)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
    isAdminOfAnySelectedClub
      ? supabase
          .from("club_members")
          .select(
            `
            user_id,
            role,
            club_id,
            user:user_id (
              id,
              display_name,
              avatar_url
            )
          `
          )
          .in("club_id", adminClubIds)
          .order("role", { ascending: false })
      : Promise.resolve({ data: null }),
  ]);

  const clubs = (clubsResult.data || []).map((c) => ({ id: c.id, name: c.name }));

  if (membersResult.data) {
    // Deduplicate members by user_id (same user might be in multiple clubs)
    const memberMap = new Map<string, MemberOption>();

    membersResult.data.forEach((m) => {
      const userData = Array.isArray(m.user) ? m.user[0] : m.user;
      if (!memberMap.has(m.user_id)) {
        memberMap.set(m.user_id, {
          id: m.user_id,
          display_name: (userData as { display_name: string | null } | null)?.display_name || null,
          avatar_url: (userData as { avatar_url: string | null } | null)?.avatar_url || null,
          role: m.role,
        });
      }
    });

    clubMembers = Array.from(memberMap.values());
    clubAdmins = clubMembers.filter((m) => m.role === "producer" || m.role === "director");
  }

  // Calculate offset for database-level pagination
  const offset = (page - 1) * pageSize;

  // Fetch hidden activity IDs BEFORE the main query so they can be excluded at DB level
  const { data: hiddenRows } = await supabase
    .from("hidden_activities")
    .select("activity_id")
    .eq("user_id", user.id);
  const hiddenIds = hiddenRows?.map((r) => r.activity_id) || [];

  // Fetch activities using proper database pagination
  // Hidden activities are excluded at the DB level so pagination counts are accurate
  const { activities, total: totalItems } = await getPaginatedActivityFeed(user.id, {
    limit: pageSize,
    offset,
    filter: filter as "all" | "club" | "member",
    clubIds: selectedClubIds.length > 0 ? selectedClubIds : undefined,
    targetUserId: filters.userId || undefined,
    actionTypes: actionTypes.length > 0 ? actionTypes : undefined,
    dateRange: dateRange || undefined,
    excludeIds: hiddenIds.length > 0 ? hiddenIds : undefined,
  });

  // Wrap activities without grouping and enrich with movie posters
  const wrappedRaw = wrapActivitiesWithoutGrouping(activities);
  const paginatedActivities = await enrichWithMoviePosters(wrappedRaw);

  // Calculate total pages from database count
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Build filter params for pagination (without page/size)
  // Convert to string since URLSearchParams doesn't serialize from Server → Client Components
  const filterParamsForPagination = serializeActivityFiltersToURL(filters).toString();

  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Header - hidden on mobile */}
        <div className="hidden md:block mb-6">
          <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Activity</h1>
          <p className="text-sm text-[var(--text-muted)]">
            See what&apos;s happening in your clubs and your personal activity.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <ActivityFiltersV2
            clubs={clubs}
            isAdminOfSelectedClub={isAdminOfAnySelectedClub}
            clubMembers={clubMembers}
            clubAdmins={clubAdmins}
          />
        </div>

        {/* Activity Feed */}
        <div
          className="divide-y divide-[var(--border)]"
          style={{
            minHeight: paginatedActivities.length > 0 ? `${pageSize * 53 - 1}px` : undefined,
          }}
        >
          {paginatedActivities.length === 0 ? (
            <EmptyState
              icon={Clock}
              title={
                filters.category === "club_activity"
                  ? "No club activity to show"
                  : filters.category === "member_activity"
                    ? "No personal activity to show"
                    : "No activity to show yet"
              }
              message={
                filters.subFilters.length > 0 ||
                filters.clubIds.length > 0 ||
                filters.dateRange !== "all_time"
                  ? "Try adjusting your filters to see more activity."
                  : "Join a club or start watching movies to see activity here."
              }
              variant="inline"
            />
          ) : (
            <ActivityFeedClient activities={paginatedActivities} currentUserId={user.id} />
          )}
        </div>

        {/* Pagination */}
        {(totalPages > 1 || pageSize !== DEFAULT_PAGE_SIZE) && (
          <div className="mt-8 pt-4 border-t border-[var(--border)]">
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              basePath="/activity"
              filterParams={filterParamsForPagination}
            />
          </div>
        )}
      </div>
    </div>
  );
}

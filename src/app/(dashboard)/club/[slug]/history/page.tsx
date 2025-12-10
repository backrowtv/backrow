import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resolveClub } from "@/lib/clubs/resolveClub";
import { ClubNavigation } from "@/components/clubs/ClubNavigation";
import {
  ClubHistoryView,
  type Season,
  type Festival,
  type NominationWithMovie,
} from "@/components/clubs/ClubHistoryView";

const DEFAULT_PAGE_SIZE = 20;
const VALID_PAGE_SIZES = [20, 40, 60, 100];

interface HistoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; page?: string; size?: string }>;
}

export default async function HistoryPage({ params, searchParams }: HistoryPageProps) {
  const identifier = (await params).slug;
  const sp = await searchParams;
  const { tab } = sp;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const requestedSize = parseInt(sp.size || String(DEFAULT_PAGE_SIZE), 10);
  const pageSize = VALID_PAGE_SIZES.includes(requestedSize) ? requestedSize : DEFAULT_PAGE_SIZE;
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

  // Check if user is a member
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    redirect("/clubs");
  }

  // Get club details including settings
  const { data: club } = await supabase
    .from("clubs")
    .select(
      "id, name, slug, picture_url, settings, avatar_icon, avatar_color_index, avatar_border_color_index"
    )
    .eq("id", clubId)
    .single();

  const isAdmin = membership?.role === "producer" || membership?.role === "director";
  const isProducer = membership?.role === "producer";
  const clubSlug = clubResolution.slug || clubId;
  const clubSettings = club?.settings as Record<string, unknown> | null;
  const isEndlessClub = clubSettings?.festival_type === "endless";

  // ============================================
  // Fetch Historical Data
  // ============================================

  // Get seasons for this club
  const { data: seasons } = await supabase
    .from("seasons")
    .select("id, name, subtitle, start_date, end_date")
    .eq("club_id", clubId)
    .order("start_date", { ascending: false })
    .limit(10);

  // Get all festivals for this club (needed for nominations lookup)
  const { data: allFestivalsData } = await supabase
    .from("festivals")
    .select("id, slug, theme, status, start_date, season_id")
    .eq("club_id", clubId)
    .order("start_date", { ascending: false })
    .limit(50);

  // For endless clubs, don't show festivals in the festivals tab
  const festivalsData = isEndlessClub ? [] : allFestivalsData || [];

  // Get movies (nominations) for this club (use all festivals for lookup)
  const festivalIds = allFestivalsData?.map((f) => f.id) || [];
  const { data: nominations, count: totalCount } = await supabase
    .from("nominations")
    .select(
      `
      id,
      users:user_id (
        display_name
      ),
      festivals:festival_id (
        id,
        slug,
        theme,
        status,
        start_date
      ),
      movies:tmdb_id (
        tmdb_id,
        title,
        poster_url,
        year,
        director,
        genres,
        overview
      )
    `,
      { count: "exact" }
    )
    .in("festival_id", festivalIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  // Transform nominations data
  const transformedNominations: NominationWithMovie[] = (nominations || []).map((nom) => {
    const moviesRelation = Array.isArray(nom.movies) ? nom.movies[0] : nom.movies;
    const festivalsRelation = Array.isArray(nom.festivals) ? nom.festivals[0] : nom.festivals;
    const usersRelation = Array.isArray(nom.users) ? nom.users[0] : nom.users;
    return {
      id: nom.id,
      nominator_name: (usersRelation as { display_name?: string } | null)?.display_name || null,
      movies: moviesRelation as NominationWithMovie["movies"],
      festivals: festivalsRelation as NominationWithMovie["festivals"],
    };
  });

  const totalItems = totalCount || 0;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  // Transform seasons and festivals data
  const transformedSeasons: Season[] = (seasons || []).map((s) => ({
    id: s.id,
    name: s.name,
    subtitle: s.subtitle,
    start_date: s.start_date,
    end_date: s.end_date,
  }));

  const transformedFestivals: Festival[] = (festivalsData || []).map((f) => ({
    id: f.id,
    slug: f.slug,
    theme: f.theme,
    status: f.status,
    start_date: f.start_date,
    season_id: f.season_id,
  }));

  // Determine default tab from URL params
  const defaultTab = tab === "festivals" ? "festivals" : tab === "movies" ? "movies" : "seasons";

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
          {/* Header - Desktop only */}
          <div className="hidden md:block mb-6">
            <h1 className="text-xl font-semibold text-[var(--club-accent,var(--text-primary))]">
              History
            </h1>
            <p className="text-sm text-[var(--text-muted)]">Past seasons, festivals, and movies</p>
          </div>

          <ClubHistoryView
            seasons={transformedSeasons}
            festivals={transformedFestivals}
            nominations={transformedNominations}
            clubSlug={clubSlug}
            isEndlessClub={isEndlessClub}
            defaultTab={defaultTab as "seasons" | "festivals" | "movies"}
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
          />
        </div>
      </div>
    </>
  );
}

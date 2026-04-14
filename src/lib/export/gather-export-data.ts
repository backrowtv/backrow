import { SupabaseClient } from "@supabase/supabase-js";
import { toCsv } from "./csv";

interface ExportFiles {
  [filename: string]: string;
}

export async function gatherExportData(
  userId: string,
  email: string,
  supabase: SupabaseClient
): Promise<ExportFiles> {
  // Run all queries in parallel
  const [
    profileResult,
    ratingsResult,
    nominationsResult,
    favoritesResult,
    favoriteClubsResult,
    standingsResult,
    membershipsResult,
    threadsResult,
    commentsResult,
  ] = await Promise.all([
    // 1. Profile
    supabase
      .from("users")
      .select("display_name, username, bio, created_at, watch_provider_region, favorite_genres")
      .eq("id", userId)
      .maybeSingle(),

    // 2. Ratings with movie + festival context
    supabase
      .from("ratings")
      .select(
        "rating, created_at, nomination:nominations(tmdb_id, movie:movies(title, year)), festival:festivals(theme, club:clubs(name))"
      )
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),

    // 3. Watch history (nominations with completed_at)
    supabase
      .from("nominations")
      .select("tmdb_id, completed_at, created_at, movie:movies(title, year)")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .not("completed_at", "is", null)
      .eq("hidden_from_history", false)
      .order("completed_at", { ascending: false }),

    // 4. User favorites (movies/persons)
    supabase
      .from("user_favorites")
      .select("tmdb_id, item_type, title, subtitle, created_at")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true }),

    // 5. Favorite clubs
    supabase
      .from("favorite_clubs")
      .select("created_at, club:clubs(name, slug)")
      .eq("user_id", userId),

    // 6. Festival standings with festival + club context
    supabase
      .from("festival_standings")
      .select(
        "rank, points, average_rating, nominations_count, ratings_count, guessing_accuracy, festival:festivals(theme, status, start_date, rating_deadline, club:clubs(name))"
      )
      .eq("user_id", userId),

    // 7. Club memberships
    supabase
      .from("club_members")
      .select("role, joined_at, club:clubs(name, slug)")
      .eq("user_id", userId),

    // 8. Discussion threads
    supabase
      .from("discussion_threads")
      .select(
        "title, content, thread_type, created_at, club:clubs(name), festival:festivals(theme)"
      )
      .eq("author_id", userId)
      .order("created_at", { ascending: false }),

    // 9. Discussion comments
    supabase
      .from("discussion_comments")
      .select("content, created_at, thread:discussion_threads(title, club:clubs(name))")
      .eq("author_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const files: ExportFiles = {};

  // --- profile.csv ---
  const profile = profileResult.data;
  files["profile.csv"] = toCsv(
    ["Field", "Value"],
    [
      ["Display Name", profile?.display_name],
      ["Username", profile?.username],
      ["Email", email],
      ["Bio", profile?.bio],
      ["Member Since", formatDate(profile?.created_at)],
      ["Watch Provider Region", profile?.watch_provider_region],
      [
        "Favorite Genres",
        Array.isArray(profile?.favorite_genres) ? profile.favorite_genres.join("; ") : "",
      ],
    ]
  );

  // --- ratings.csv ---
  const ratings = ratingsResult.data || [];
  files["ratings.csv"] = toCsv(
    ["TMDB ID", "Title", "Year", "Rating", "Date", "Festival", "Club"],
    ratings.map((r) => {
      const nom = asSingle(r.nomination);
      const movie = nom ? asSingle(nom.movie) : null;
      const fest = asSingle(r.festival);
      const club = fest ? asSingle(fest.club) : null;
      return [
        nom?.tmdb_id,
        movie?.title,
        movie?.year,
        r.rating,
        formatDate(r.created_at),
        fest?.theme,
        club?.name,
      ];
    })
  );

  // --- watch-history.csv ---
  const watched = nominationsResult.data || [];
  files["watch-history.csv"] = toCsv(
    ["TMDB ID", "Title", "Year", "Watched Date", "Nominated Date"],
    watched.map((n) => {
      const movie = asSingle(n.movie);
      return [
        n.tmdb_id,
        movie?.title,
        movie?.year,
        formatDate(n.completed_at),
        formatDate(n.created_at),
      ];
    })
  );

  // --- favorites.csv ---
  const favorites = favoritesResult.data || [];
  const favClubs = favoriteClubsResult.data || [];
  files["favorites.csv"] = toCsv(
    ["Type", "Name", "TMDB ID", "Date Added"],
    [
      ...favorites.map((f) => [f.item_type, f.title, f.tmdb_id, formatDate(f.created_at)]),
      ...favClubs.map((fc) => {
        const club = asSingle(fc.club);
        return ["club", club?.name, null, formatDate(fc.created_at)];
      }),
    ]
  );

  // --- festivals.csv ---
  const standings = standingsResult.data || [];
  files["festivals.csv"] = toCsv(
    [
      "Festival",
      "Club",
      "Status",
      "Start Date",
      "End Date",
      "Rank",
      "Points",
      "Avg Rating",
      "Nominations",
      "Ratings Given",
      "Guessing Accuracy",
    ],
    standings.map((s) => {
      const fest = asSingle(s.festival);
      const club = fest ? asSingle(fest.club) : null;
      return [
        fest?.theme,
        club?.name,
        fest?.status,
        formatDate(fest?.start_date),
        formatDate(fest?.rating_deadline),
        s.rank,
        s.points,
        s.average_rating,
        s.nominations_count,
        s.ratings_count,
        s.guessing_accuracy != null ? `${(s.guessing_accuracy * 100).toFixed(0)}%` : "",
      ];
    })
  );

  // --- clubs.csv ---
  const memberships = membershipsResult.data || [];
  files["clubs.csv"] = toCsv(
    ["Club", "Slug", "Role", "Joined Date"],
    memberships.map((m) => {
      const club = asSingle(m.club);
      return [club?.name, club?.slug, m.role, formatDate(m.joined_at)];
    })
  );

  // --- discussions.csv ---
  const threads = threadsResult.data || [];
  files["discussions.csv"] = toCsv(
    ["Title", "Content", "Type", "Club", "Festival", "Date"],
    threads.map((t) => {
      const club = asSingle(t.club);
      const fest = asSingle(t.festival);
      return [t.title, t.content, t.thread_type, club?.name, fest?.theme, formatDate(t.created_at)];
    })
  );

  // --- comments.csv ---
  const comments = commentsResult.data || [];
  files["comments.csv"] = toCsv(
    ["Comment", "Thread", "Club", "Date"],
    comments.map((c) => {
      const thread = asSingle(c.thread);
      const club = thread ? asSingle(thread.club) : null;
      return [c.content, thread?.title, club?.name, formatDate(c.created_at)];
    })
  );

  // --- README.txt ---
  files["README.txt"] = generateReadme();

  return files;
}

/** Format an ISO date string to YYYY-MM-DD, or empty string if null */
function formatDate(date: string | null | undefined): string {
  if (!date) return "";
  return date.slice(0, 10);
}

/**
 * Supabase embedded selects return an object for single FK relations,
 * but TypeScript types them as arrays. This helper safely unwraps.
 */

function asSingle<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function generateReadme(): string {
  return `BackRow Data Export
===================

This archive contains your BackRow data in CSV format.
All CSV files use UTF-8 encoding and can be opened in any spreadsheet application.

Files included:

  profile.csv       — Your display name, email, bio, and preferences
  ratings.csv       — Every movie rating you've given (TMDB ID, title, year, score, date, festival, club)
  watch-history.csv — Movies you've watched through BackRow (TMDB ID, title, year, date watched)
  favorites.csv     — Your favorited movies, people, and clubs
  festivals.csv     — Festivals you've participated in with your standings
  clubs.csv         — Clubs you're a member of with your role and join date
  discussions.csv   — Discussion threads you've created
  comments.csv      — Comments you've posted on discussions

TMDB IDs
--------
Every film reference includes a TMDB ID (The Movie Database). You can look up any
movie at https://www.themoviedb.org/movie/{TMDB_ID} or use these IDs to import
your data into other movie tracking platforms like Letterboxd or Trakt.

Dates are in YYYY-MM-DD format (UTC).
Ratings are on a 0.0 to 10.0 scale.
`;
}

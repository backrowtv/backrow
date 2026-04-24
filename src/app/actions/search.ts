"use server";

import { createClient } from "@/lib/supabase/server";
import { searchPeople, searchMovies, getPosterUrl } from "@/lib/tmdb/client";
import type { SearchFilterType } from "@/components/search/SearchInterface";
import type { SearchResults } from "./search.types";
import { escapeLike } from "@/lib/security/postgrest-escape";

// Helper to process person results for full search
// OPTIMIZED: Takes pre-loaded movies map to avoid N+1 queries
function processPersonResult(
  person: {
    id: number;
    name: string;
    profile_path: string | null;
    known_for_department: string;
    popularity: number;
  },
  moviesMap: Map<string, string[]>
): {
  id: number;
  name: string;
  profile_url: string | null;
  movies: string[];
  popularity: number;
  known_for_department: string;
} {
  return {
    id: person.id,
    name: person.name,
    profile_url: person.profile_path
      ? `https://image.tmdb.org/t/p/w185${person.profile_path}`
      : null,
    movies: moviesMap.get(person.name) || [],
    popularity: person.popularity,
    known_for_department: person.known_for_department,
  };
}

// OPTIMIZED: Batch load movies for multiple people in 3 queries (actors, directors, composers)
// instead of N individual queries
async function batchLoadMoviesForPeople(
  actors: { name: string }[],
  directors: { name: string }[],
  composers: { name: string }[],
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{
  actorMovies: Map<string, string[]>;
  directorMovies: Map<string, string[]>;
  composerMovies: Map<string, string[]>;
}> {
  const actorMovies = new Map<string, string[]>();
  const directorMovies = new Map<string, string[]>();
  const composerMovies = new Map<string, string[]>();

  const queries: Promise<void>[] = [];

  // Batch query for actors - get all movies with cast containing any of the actor names
  if (actors.length > 0) {
    queries.push(
      (async () => {
        // Use a single query with OR conditions for all actor names
        // This is more efficient than N separate queries
        const actorNames = actors.map((a) => a.name);
        const { data } = await supabase
          .from("movies")
          .select("title, cast")
          .not("cast", "is", null)
          .limit(200); // Get more movies to distribute across actors

        if (data) {
          // Client-side filtering - check which actors appear in each movie's cast
          for (const movie of data) {
            if (movie.cast) {
              const castArray = Array.isArray(movie.cast) ? movie.cast : [];
              for (const actorName of actorNames) {
                // Check if actor name appears in cast (case-insensitive partial match)
                const found = castArray.some((castMember: string) =>
                  castMember.toLowerCase().includes(actorName.toLowerCase())
                );
                if (found) {
                  const existing = actorMovies.get(actorName) || [];
                  if (existing.length < 5) {
                    actorMovies.set(actorName, [...existing, movie.title]);
                  }
                }
              }
            }
          }
        }
      })()
    );
  }

  // Batch query for directors
  if (directors.length > 0) {
    queries.push(
      (async () => {
        const directorNames = directors.map((d) => d.name);
        // Use OR condition for all director names
        const orCondition = directorNames
          .map((name) => `director.ilike.%${escapeLike(name)}%`)
          .join(",");
        const { data } = await supabase
          .from("movies")
          .select("title, director")
          .or(orCondition)
          .limit(100);

        if (data) {
          for (const movie of data) {
            if (movie.director) {
              for (const directorName of directorNames) {
                if (movie.director.toLowerCase().includes(directorName.toLowerCase())) {
                  const existing = directorMovies.get(directorName) || [];
                  if (existing.length < 5) {
                    directorMovies.set(directorName, [...existing, movie.title]);
                  }
                }
              }
            }
          }
        }
      })()
    );
  }

  // Batch query for composers
  if (composers.length > 0) {
    queries.push(
      (async () => {
        const composerNames = composers.map((c) => c.name);
        const orCondition = composerNames
          .map((name) => `composer.ilike.%${escapeLike(name)}%`)
          .join(",");
        const { data } = await supabase
          .from("movies")
          .select("title, composer")
          .or(orCondition)
          .limit(100);

        if (data) {
          for (const movie of data) {
            if (movie.composer) {
              for (const composerName of composerNames) {
                if (movie.composer.toLowerCase().includes(composerName.toLowerCase())) {
                  const existing = composerMovies.get(composerName) || [];
                  if (existing.length < 5) {
                    composerMovies.set(composerName, [...existing, movie.title]);
                  }
                }
              }
            }
          }
        }
      })()
    );
  }

  await Promise.all(queries);

  return { actorMovies, directorMovies, composerMovies };
}

// Search function for full search (no caching due to dynamic data requirements)
async function performSearchAll(
  query: string,
  filters: SearchFilterType[],
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string | null
): Promise<SearchResults> {
  const user = userId ? { id: userId } : null;

  const results: SearchResults = {
    movies: [],
    actors: [],
    directors: [],
    composers: [],
    notes: [],
    discussions: [],
  };

  if (!query || query.trim().length < 2) {
    return results;
  }

  const trimmedQuery = query.trim();
  const needsMovies = filters.includes("movies");
  const needsPeople =
    filters.includes("actors") || filters.includes("directors") || filters.includes("composers");

  try {
    // PERFORMANCE: Fetch TMDB data in parallel (only what's needed)
    const tmdbPromises: [
      Promise<Awaited<ReturnType<typeof searchMovies>> | null>,
      Promise<Awaited<ReturnType<typeof searchPeople>> | null>,
    ] = [
      needsMovies ? searchMovies(trimmedQuery).catch(() => null) : Promise.resolve(null),
      needsPeople ? searchPeople(trimmedQuery).catch(() => null) : Promise.resolve(null),
    ];

    const [tmdbMoviesResult, tmdbPeopleResult] = await Promise.all(tmdbPromises);

    // Process movie results
    if (needsMovies) {
      if (tmdbMoviesResult) {
        results.movies = tmdbMoviesResult.slice(0, 20).map((m) => ({
          tmdb_id: m.id,
          title: m.title,
          year: m.release_date ? parseInt(m.release_date.split("-")[0]) : null,
          poster_url: getPosterUrl(m.poster_path),
        }));
      } else {
        // Fallback to local database with fuzzy search if TMDB fails
        const { data: movies } = await supabase.rpc("fuzzy_search_movies", {
          search_query: trimmedQuery,
          result_limit: 20,
        });

        if (movies) {
          results.movies = movies.map(
            (m: {
              tmdb_id: number;
              title: string;
              year: number | null;
              poster_url: string | null;
            }) => ({
              tmdb_id: m.tmdb_id,
              title: m.title,
              year: m.year,
              poster_url: m.poster_url,
            })
          );
        }
      }
    }

    // Filter people by department once (instead of 3 separate API calls)
    const tmdbPeople = tmdbPeopleResult || [];
    const actors = filters.includes("actors")
      ? tmdbPeople.filter((p) => p.known_for_department === "Acting").slice(0, 20)
      : [];
    const directors = filters.includes("directors")
      ? tmdbPeople.filter((p) => p.known_for_department === "Directing").slice(0, 20)
      : [];
    const composers = filters.includes("composers")
      ? tmdbPeople.filter((p) => p.known_for_department === "Sound").slice(0, 20)
      : [];

    // PERFORMANCE: Run all database queries in parallel
    const dbQueries: PromiseLike<void>[] = [];

    // OPTIMIZED: Batch load movies for all people in just 3 queries total
    // instead of up to 60 individual queries (20 actors + 20 directors + 20 composers)
    if (actors.length > 0 || directors.length > 0 || composers.length > 0) {
      dbQueries.push(
        batchLoadMoviesForPeople(actors, directors, composers, supabase)
          .then(({ actorMovies, directorMovies, composerMovies }) => {
            // Process results using the pre-loaded movie data
            if (actors.length > 0) {
              results.actors = actors.map((actor) => processPersonResult(actor, actorMovies));
            }
            if (directors.length > 0) {
              results.directors = directors.map((director) =>
                processPersonResult(director, directorMovies)
              );
            }
            if (composers.length > 0) {
              results.composers = composers.map((composer) =>
                processPersonResult(composer, composerMovies)
              );
            }
          })
          .catch((_err) => {
            // Silently handle errors - search results will just have empty movie lists
          })
      );
    }

    // Notes and discussions (user-specific, functions use auth.uid() internally for security)
    if (user && (filters.includes("notes") || filters.includes("discussions"))) {
      // Notes search with fuzzy matching
      if (filters.includes("notes")) {
        // Club notes (uses auth.uid() internally to get user's clubs)
        dbQueries.push(
          supabase
            .rpc("fuzzy_search_club_notes", {
              search_query: trimmedQuery,
              result_limit: 20,
            })
            .then(({ data: clubNotes, error }) => {
              if (!error && clubNotes) {
                results.notes = clubNotes.map(
                  (n: {
                    id: string;
                    note: string;
                    club_id: string;
                    club_name: string | null;
                    tmdb_id: number;
                    movie_title: string | null;
                  }) => ({
                    id: n.id,
                    preview: n.note.length > 150 ? `${n.note.substring(0, 150)}...` : n.note,
                    club_id: n.club_id,
                    club_name: n.club_name,
                    movie_title: n.movie_title,
                    tmdb_id: n.tmdb_id,
                  })
                );
              }
            })
        );

        // Private notes (uses auth.uid() internally for security)
        dbQueries.push(
          supabase
            .rpc("fuzzy_search_private_notes", {
              search_query: trimmedQuery,
              result_limit: 20,
            })
            .then(({ data: privateNotes, error }) => {
              if (!error && privateNotes) {
                const privateNotesResults = privateNotes.map(
                  (n: {
                    id: string;
                    note: string;
                    tmdb_id: number;
                    movie_title: string | null;
                  }) => ({
                    id: n.id,
                    preview: n.note.length > 150 ? `${n.note.substring(0, 150)}...` : n.note,
                    club_id: null,
                    club_name: null,
                    movie_title: n.movie_title,
                    tmdb_id: n.tmdb_id,
                  })
                );
                results.notes = [...results.notes, ...privateNotesResults];
              }
            })
        );
      }

      // Discussions search (uses auth.uid() internally to get user's clubs)
      if (filters.includes("discussions")) {
        dbQueries.push(
          supabase
            .rpc("fuzzy_search_discussions", {
              search_query: trimmedQuery,
              result_limit: 20,
            })
            .then(({ data: discussions, error }) => {
              if (!error && discussions) {
                results.discussions = discussions.map(
                  (d: {
                    id: string;
                    slug: string | null;
                    title: string;
                    club_id: string;
                    club_name: string | null;
                    club_slug: string | null;
                  }) => ({
                    id: d.id,
                    slug: d.slug,
                    title: d.title,
                    club_id: d.club_id,
                    club_name: d.club_name,
                    club_slug: d.club_slug,
                    preview: null, // RPC doesn't return content preview
                  })
                );
              }
            })
        );
      }
    }

    // Wait for all database queries to complete
    await Promise.all(dbQueries);

    // Limit notes to 20 total
    results.notes = results.notes.slice(0, 20);

    return results;
  } catch (error) {
    console.error("Search error:", error);
    // Return empty results on error - let UI handle gracefully
    return results;
  }
}

export async function searchAll(
  query: string,
  filters: SearchFilterType[]
): Promise<SearchResults> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Perform search (no caching due to dynamic data requirements)
  const results = await performSearchAll(query, filters, supabase, user?.id || null);

  // Track search analytics (fire and forget)
  if (query && query.trim().length >= 2) {
    import("./search-analytics").then(({ trackSearchQuery }) => {
      trackSearchQuery(query, filters, results, user?.id).catch((err) => {
        console.error("Failed to track search query:", err);
      });
    });
  }

  return results;
}

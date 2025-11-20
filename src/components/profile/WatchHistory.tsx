import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PaginationControls } from "@/components/ui/pagination";
import type { RatingWithNomination } from "@/types/supabase-relations";
import { BrandText } from "@/components/ui/brand-text";
import { RatingBadge } from "@/components/dashboard/RatingBadge";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";
import { Eye } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/shared/EmptyState";

interface WatchHistoryProps {
  userId: string;
  page?: number;
}

const ITEMS_PER_PAGE = 24;

export async function WatchHistory({ userId, page = 1 }: WatchHistoryProps) {
  const supabase = await createClient();

  // Get total count for pagination
  const { count } = await supabase
    .from("ratings")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const totalPages = count ? Math.ceil(count / ITEMS_PER_PAGE) : 1;
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  // Get ratings with movie and festival info (including slugs)
  const { data: ratings } = await supabase
    .from("ratings")
    .select(
      `
      *,
      nominations:nomination_id (
        tmdb_id,
        festivals:festival_id (
          id,
          slug,
          club_id,
          clubs:club_id (
            id,
            slug,
            name
          )
        )
      )
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + ITEMS_PER_PAGE - 1);

  if (!ratings || ratings.length === 0) {
    return (
      <EmptyState
        icon={Eye}
        title="No watch history yet"
        message="Start rating movies in festivals to build your collection!"
        variant="card"
      />
    );
  }

  // Get movie details for each rating
  const tmdbIds = (ratings as RatingWithNomination[])
    .map((r) => r.nominations?.tmdb_id)
    .filter((id): id is number => id !== null && id !== undefined);

  const { data: movies } = await supabase
    .from("movies")
    .select("tmdb_id, title, poster_url, year")
    .in("tmdb_id", [...new Set(tmdbIds)]);

  const moviesMap = new Map((movies || []).map((m) => [m.tmdb_id, m]));

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {ratings.map((rating) => {
          const nominationsRelation = Array.isArray(rating.nominations)
            ? rating.nominations[0]
            : rating.nominations;
          const nomination = nominationsRelation as {
            tmdb_id?: number | null;
            festivals?: {
              id?: string;
              slug?: string | null;
              club_id?: string;
              clubs?: { id?: string; slug?: string | null; name?: string | null } | null;
            } | null;
          } | null;
          const festivals = nomination?.festivals;
          const festival = Array.isArray(festivals) ? festivals[0] : festivals;
          const clubsRelation = festival?.clubs;
          const club = Array.isArray(clubsRelation) ? clubsRelation[0] : clubsRelation;
          const tmdbId = nomination?.tmdb_id;
          const movie = tmdbId ? moviesMap.get(tmdbId) : null;
          const ratingValue = Number(rating.rating);
          const _isHighRating = ratingValue >= 8;
          const clubSlug = club?.slug;
          const festivalSlug = festival?.slug;

          // Skip if slugs are missing
          if (!clubSlug || !festivalSlug) {
            console.error("WatchHistory: Missing slugs", {
              clubSlug,
              festivalSlug,
              clubId: club?.id,
              festivalId: festival?.id,
            });
            return null;
          }

          return (
            <Link
              key={rating.id}
              href={`/club/${clubSlug}/festival/${festivalSlug}`}
              className="group"
            >
              <Card variant="default" hover interactive className="relative overflow-hidden p-0">
                {/* Poster container */}
                <div className="relative aspect-[2/3] w-full overflow-hidden">
                  {movie?.poster_url ? (
                    <>
                      <Image
                        src={`https://image.tmdb.org/t/p/w500${movie.poster_url}`}
                        alt={movie.title || "Movie"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                        placeholder="blur"
                        blurDataURL={getTMDBBlurDataURL()}
                      />
                      {/* Gradient overlay */}
                    </>
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{
                        background:
                          "linear-gradient(to bottom right, var(--surface-2), var(--surface-1))",
                      }}
                    >
                      <div className="text-center p-4">
                        <svg
                          className="w-12 h-12 mx-auto mb-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          No Poster
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Rating badge */}
                  <div className="absolute top-2 right-2">
                    <RatingBadge rating={ratingValue} variant="overlay" />
                  </div>

                  {/* Club badge (on hover) */}
                  {club?.name && (
                    <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div
                        className="backdrop-blur-md px-2 py-1 rounded text-xs truncate"
                        style={{ background: "rgba(0, 0, 0, 0.8)", color: "var(--text-primary)" }}
                      >
                        <BrandText>{club.name}</BrandText>
                      </div>
                    </div>
                  )}
                </div>

                {/* Movie info */}
                <div
                  className="p-3 backdrop-blur-sm"
                  style={{ backgroundColor: "var(--surface-1)", opacity: 0.5 }}
                >
                  <h3
                    className="font-semibold group-hover:transition-colors line-clamp-2 mb-1 text-sm leading-tight"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {movie?.title || "Unknown Movie"}
                  </h3>
                  {movie?.year && (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {movie.year}
                    </p>
                  )}
                </div>

                {/* Hover glow effect */}
                <div className="absolute inset-0 ring-2 ring-[var(--border)] group-hover:ring-[var(--border-hover)] rounded-xl transition-all duration-300 pointer-events-none" />
              </Card>
            </Link>
          );
        })}
      </div>

      {totalPages > 1 && (
        <PaginationControls currentPage={currentPage} totalPages={totalPages} basePath="/profile" />
      )}
    </>
  );
}

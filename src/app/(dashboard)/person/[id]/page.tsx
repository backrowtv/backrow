import { getPersonDetails, type TMDBPerson } from "@/lib/tmdb/client";
import { getPerson, getPersonBySlug, cachePerson } from "@/app/actions/persons";
import { getMovieLinkPreferences } from "@/app/actions/navigation-preferences";
import { getMovieOverviews, cacheMovie } from "@/app/actions/movies";
import { DateDisplay } from "@/components/ui/date-display";
import { CollapsibleText } from "@/components/ui/collapsible-text";
import { ExternalLink } from "@/components/ui/external-logos";
import { KnownForCarousel } from "@/components/movies/KnownForCarousel";
import Image from "next/image";
import Link from "next/link";
import { FavoriteButton } from "@/components/movies/FavoriteButton";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateBlurDataURL } from "@/lib/utils/blur-generator";

interface PersonPageProps {
  params: Promise<{ id: string }>;
}

export default async function PersonPage({ params }: PersonPageProps) {
  const { id } = await params;

  // Check if it's a numeric ID (TMDB ID) or a slug
  const tmdbId = parseInt(id);
  const isNumericId = !isNaN(tmdbId) && tmdbId > 0;

  let person: TMDBPerson | null = null;
  type DbPerson = {
    id: string;
    tmdb_id: number;
    name: string;
    slug: string;
    profile_url: string | null;
    biography: string | null;
    birthday: string | null;
    deathday: string | null;
    place_of_birth: string | null;
    known_for_department: string | null;
  };
  let dbPerson: DbPerson | null = null;

  if (isNumericId) {
    // It's a TMDB ID - cache the person and redirect to slug
    const result = await getPerson(tmdbId);
    if (result.error || !result.person) {
      // Try to fetch from TMDB and cache
      const cacheResult = await cachePerson(tmdbId);
      if (cacheResult.error || !cacheResult.person) {
        notFound();
      }
      dbPerson = cacheResult.person;
    } else {
      dbPerson = result.person;
    }

    // Redirect to slug URL
    redirect(`/person/${dbPerson!.slug}`);
  } else {
    // It's a slug - look up by slug
    const result = await getPersonBySlug(id);
    if (result.error || !result.person) {
      notFound();
    }
    dbPerson = result.person;
  }

  // Fetch full details from TMDB for movie credits and user preferences
  const [personDetails, movieLinkPrefs] = await Promise.all([
    getPersonDetails(dbPerson!.tmdb_id),
    getMovieLinkPreferences(),
  ]);
  person = personDetails;
  const visibleLinksOrdered = movieLinkPrefs.visibleLinks;

  // Calculate age
  const calculateAge = (birthday: string, deathday?: string | null): number | null => {
    if (!birthday) return null;
    const birthDate = new Date(birthday);
    const endDate = deathday ? new Date(deathday) : new Date();
    let age = endDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = endDate.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = person.birthday ? calculateAge(person.birthday, person.deathday) : null;

  // Determine primary role for display
  const isActor = person.known_for_department === "Acting";
  const primaryCast = person.movie_credits.cast;
  const primaryCrew = person.movie_credits.crew;

  // Get appropriate section title based on department
  const getRecentSectionTitle = () => {
    switch (person.known_for_department) {
      case "Acting":
        return "Recent Roles";
      case "Directing":
        return "Recent Films";
      case "Sound":
        return "Recent Scores";
      default:
        return "Recent Work";
    }
  };

  // Sort "Known For" by movie popularity (matches TMDB's own ranking)
  const knownForRaw = isActor
    ? [...primaryCast].sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    : [...primaryCrew].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

  // Deduplicate by movie ID (keep first/most popular entry)
  const seenKnownFor = new Set<number>();
  const knownForCredits = knownForRaw.filter((credit) => {
    if (seenKnownFor.has(credit.id)) return false;
    seenKnownFor.add(credit.id);
    return true;
  });

  // Fetch movie overviews from our database for tooltips
  const knownForIds = knownForCredits.slice(0, 10).map((credit) => credit.id);
  let movieOverviews = await getMovieOverviews(knownForIds);

  // Cache any movies that don't have overviews yet
  const missingOverviewIds = knownForIds.filter((id) => {
    const cached = movieOverviews.get(id);
    return !cached?.overview;
  });

  if (missingOverviewIds.length > 0) {
    // Cache movies in parallel (limit to 5 concurrent to avoid rate limits)
    const batchSize = 5;
    for (let i = 0; i < missingOverviewIds.length; i += batchSize) {
      const batch = missingOverviewIds.slice(i, i + batchSize);
      await Promise.all(batch.map((id) => cacheMovie(id)));
    }
    // Re-fetch overviews after caching
    movieOverviews = await getMovieOverviews(knownForIds);
  }

  // Enrich known for credits with overview and year data
  const knownForWithOverviews = knownForCredits.slice(0, 10).map((credit) => {
    const cached = movieOverviews.get(credit.id);
    const yearFromRelease = credit.release_date
      ? new Date(credit.release_date).getFullYear()
      : null;
    const character = isActor
      ? (credit as (typeof primaryCast)[number]).character || null
      : (credit as (typeof primaryCrew)[number]).job || null;
    return {
      id: credit.id,
      title: credit.title,
      poster_path: credit.poster_path,
      overview: cached?.overview || null,
      year: cached?.year || yearFromRelease,
      character,
    };
  });

  // Group filmography by movie ID, combining roles
  type FilmographyEntry = {
    id: number;
    title: string;
    poster_path: string | null;
    release_date: string;
    roles: string[];
  };

  const filmographyMap = new Map<number, FilmographyEntry>();
  const allCredits = isActor ? primaryCast : primaryCrew;

  for (const credit of allCredits) {
    const role = isActor
      ? (credit as (typeof primaryCast)[number]).character || "Unknown role"
      : (credit as (typeof primaryCrew)[number]).job || "Crew";

    if (filmographyMap.has(credit.id)) {
      const entry = filmographyMap.get(credit.id)!;
      if (!entry.roles.includes(role)) {
        entry.roles.push(role);
      }
    } else {
      filmographyMap.set(credit.id, {
        id: credit.id,
        title: credit.title,
        poster_path: credit.poster_path,
        release_date: credit.release_date,
        roles: [role],
      });
    }
  }

  // Sort filmography by date desc (most recent first)
  const filmographyCredits = Array.from(filmographyMap.values()).sort(
    (a, b) => new Date(b.release_date || 0).getTime() - new Date(a.release_date || 0).getTime()
  );

  // Pick backdrop from top known-for credits (highest rated with a backdrop)
  const backdropCredit = knownForCredits.find((c) => c.backdrop_path);
  const backdropUrl = backdropCredit
    ? `https://image.tmdb.org/t/p/w1280${backdropCredit.backdrop_path}`
    : null;

  // Generate blur placeholders for profile and backdrop images
  const [profileBlur, backdropBlur] = await Promise.all([
    person.profile_path
      ? generateBlurDataURL(person.profile_path, "profile")
      : Promise.resolve(undefined),
    backdropCredit?.backdrop_path
      ? generateBlurDataURL(backdropCredit.backdrop_path, "backdrop")
      : Promise.resolve(undefined),
  ]);

  // Check if user has this person favorited
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let existingFavoriteId: string | null = null;
  if (user) {
    const { data: fav } = await supabase
      .from("user_favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("tmdb_id", dbPerson!.tmdb_id)
      .eq("item_type", "person")
      .maybeSingle();
    existingFavoriteId = fav?.id ?? null;
  }

  return (
    <div className="bg-[var(--background)]">
      {/* Hero Section - Matching movie page layout */}
      <div className="relative w-full h-[250px] lg:h-[350px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/30 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--background)] to-transparent z-10" />
        {backdropUrl && (
          <Image
            src={backdropUrl}
            alt={person.name}
            fill
            sizes="100vw"
            className="object-cover opacity-55"
            priority
            {...(backdropBlur ? { placeholder: "blur" as const, blurDataURL: backdropBlur } : {})}
          />
        )}
        <div className="absolute inset-0 flex items-end z-20 pb-6">
          <div className="max-w-3xl mx-auto w-full px-4 lg:px-6">
            <div className="flex gap-4 lg:gap-6 items-end lg:items-start">
              {/* Profile Image - Small on mobile, matching movie poster style */}
              <div className="relative w-[120px] lg:w-[160px] aspect-[2/3] rounded-lg overflow-hidden shadow-xl border border-white/10 flex-shrink-0 bg-[var(--surface-1)]">
                {person.profile_path ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w500${person.profile_path}`}
                    alt={person.name}
                    fill
                    sizes="(min-width: 1024px) 160px, 120px"
                    className="object-cover"
                    priority
                    {...(profileBlur
                      ? { placeholder: "blur" as const, blurDataURL: profileBlur }
                      : {})}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-[var(--text-muted)]">
                    No Image
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-2">
                  <h1 className="text-xl lg:text-2xl font-bold text-[var(--text-primary)] leading-tight flex-1 min-w-0">
                    {person.name}
                  </h1>
                  {user && (
                    <FavoriteButton
                      tmdbId={dbPerson!.tmdb_id}
                      itemType="person"
                      title={person.name}
                      imagePath={person.profile_path}
                      subtitle={person.known_for_department}
                      existingFavoriteId={existingFavoriteId}
                    />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--text-muted)] mb-3">
                  {person.known_for_department && <span>{person.known_for_department}</span>}
                  {person.birthday && (
                    <>
                      <span className="text-[var(--text-muted)]/50">•</span>
                      {person.deathday ? (
                        /* Deceased: show birth date - death date, aged X */
                        <span>
                          <DateDisplay date={person.birthday} format="date" />–
                          <DateDisplay date={person.deathday} format="date" />
                          {age !== null && `, aged ${age}`}
                        </span>
                      ) : (
                        /* Living: show birth date and age */
                        <span>
                          <DateDisplay date={person.birthday} format="date" /> ({age} years old)
                        </span>
                      )}
                    </>
                  )}
                  {person.place_of_birth && (
                    <>
                      <span className="text-[var(--text-muted)]/50">•</span>
                      <span className="truncate max-w-[200px] lg:max-w-none">
                        {person.place_of_birth}
                      </span>
                    </>
                  )}
                </div>

                {/* External Links - Logo buttons (rendered in user's preferred order) */}
                <div className="flex items-center gap-2 flex-wrap">
                  {visibleLinksOrdered.map((linkType) => {
                    if (linkType === "imdb" && person.external_ids?.imdb_id) {
                      return (
                        <ExternalLink
                          key={linkType}
                          href={`https://www.imdb.com/name/${person.external_ids.imdb_id}`}
                          logo="imdb"
                          label="View on IMDb"
                        />
                      );
                    }
                    if (linkType === "tmdb") {
                      return (
                        <ExternalLink
                          key={linkType}
                          href={`https://www.themoviedb.org/person/${person.id}`}
                          logo="tmdb"
                          label="View on TMDB"
                        />
                      );
                    }
                    if (linkType === "wikipedia") {
                      if (!person.external_ids?.wikidata_id) return null;
                      return (
                        <ExternalLink
                          key={linkType}
                          href={`https://www.wikidata.org/wiki/Special:GoToLinkedPage/enwiki/${person.external_ids.wikidata_id}`}
                          logo="wikipedia"
                          label="View on Wikipedia"
                        />
                      );
                    }
                    // Letterboxd and Trakt don't have person pages, so skip them
                    return null;
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        <div className="space-y-6">
          {/* Biography - Collapsible */}
          {person.biography && (
            <section>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-2">
                Biography
              </h3>
              <CollapsibleText text={person.biography} />
            </section>
          )}

          {/* Known For - Horizontal scroll (sorted by popularity) */}
          {knownForWithOverviews.length > 0 && <KnownForCarousel movies={knownForWithOverviews} />}

          {/* Recent Work */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-3">
              {getRecentSectionTitle()}
            </h3>

            {/* Mobile: 3 items, Desktop: 5 items */}
            <div className="space-y-0.5">
              {filmographyCredits.slice(0, 3).map((credit) => (
                <Link
                  key={`filmography-${credit.id}`}
                  href={`/movies/${credit.id}`}
                  className="flex items-center gap-3 py-2 rounded-lg hover:bg-[var(--surface-1)] transition-colors -mx-2 px-2 group"
                >
                  <div className="relative w-10 h-14 flex-shrink-0 rounded overflow-hidden bg-[var(--surface-1)]">
                    {credit.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w92${credit.poster_path}`}
                        alt={credit.title}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-[8px]">
                        —
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h4 className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors truncate">
                        {credit.title}
                      </h4>
                      <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
                        {credit.release_date ? new Date(credit.release_date).getFullYear() : "—"}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      {credit.roles.join(", ")}
                    </p>
                  </div>
                </Link>
              ))}
              {/* Additional items for desktop only */}
              {filmographyCredits.slice(3, 5).map((credit) => (
                <Link
                  key={`filmography-desktop-${credit.id}`}
                  href={`/movies/${credit.id}`}
                  className="hidden lg:flex items-center gap-3 py-2 rounded-lg hover:bg-[var(--surface-1)] transition-colors -mx-2 px-2 group"
                >
                  <div className="relative w-10 h-14 flex-shrink-0 rounded overflow-hidden bg-[var(--surface-1)]">
                    {credit.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w92${credit.poster_path}`}
                        alt={credit.title}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-[8px]">
                        —
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h4 className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors truncate">
                        {credit.title}
                      </h4>
                      <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
                        {credit.release_date ? new Date(credit.release_date).getFullYear() : "—"}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      {credit.roles.join(", ")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {filmographyCredits.length > 5 && (
              <div className="pt-3">
                <a
                  href={`https://www.themoviedb.org/person/${person.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
                >
                  View all {filmographyCredits.length} credits on TMDB →
                </a>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

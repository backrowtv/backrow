"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/typography";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DebossedTabs } from "@/components/ui/debossed-tabs";
import { FilmSlate, User, ChatCircleText, Note, Users } from "@phosphor-icons/react";
import type { SearchResults as SearchResultsType } from "@/app/actions/search.types";
import { cn } from "@/lib/utils";
import { getPersonUrl } from "@/lib/persons/slugs";

interface SearchResultsProps {
  results: SearchResultsType | null;
  isLoading: boolean;
  query: string;
}

// Unified person type combining actors, directors, and composers
interface UnifiedPerson {
  id?: number;
  name: string;
  slug?: string;
  profile_url: string | null;
  movies: string[];
  role: "Actor" | "Director" | "Composer";
  popularity?: number;
}

export function SearchResults({ results, isLoading, query }: SearchResultsProps) {
  const [activeTab, setActiveTab] = useState("all");

  // Combine and sort all people by popularity
  const unifiedPeople = useMemo(() => {
    if (!results) return [];

    const people: UnifiedPerson[] = [
      ...results.actors.map((a) => ({ ...a, role: "Actor" as const })),
      ...results.directors.map((d) => ({ ...d, role: "Director" as const })),
      ...results.composers.map((c) => ({ ...c, role: "Composer" as const })),
    ];

    // Sort by popularity (descending) - most famous first
    return people.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }, [results]);

  // Count results per category
  const counts = useMemo(
    () => ({
      movies: results?.movies.length || 0,
      people: unifiedPeople.length,
      notes: results?.notes.length || 0,
      discussions: results?.discussions.length || 0,
    }),
    [results, unifiedPeople]
  );

  const totalResults = counts.movies + counts.people + counts.notes + counts.discussions;

  // Build tab options for debossed tabs (must be before early returns)
  const tabOptions = useMemo(() => {
    const options = [{ value: "all", label: "All", count: totalResults }];
    if (counts.movies > 0) {
      options.push({ value: "movies", label: "Movies", count: counts.movies });
    }
    if (counts.people > 0) {
      options.push({ value: "people", label: "People", count: counts.people });
    }
    if (counts.notes > 0) {
      options.push({ value: "notes", label: "Notes", count: counts.notes });
    }
    if (counts.discussions > 0) {
      options.push({ value: "discussions", label: "Discussions", count: counts.discussions });
    }
    return options;
  }, [totalResults, counts]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i} variant="default">
              <CardContent className="p-0">
                <Skeleton className="aspect-[2/3] w-full rounded-t-xl" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!results) {
    return null;
  }

  if (totalResults === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-4">
          <FilmSlate className="w-8 h-8 text-[var(--text-muted)]" />
        </div>
        <Text size="body" className="font-medium mb-2 text-center">
          No results found
        </Text>
        <Text size="small" muted className="max-w-md text-center">
          We couldn&apos;t find anything matching &quot;{query}&quot;. Try a different search term
          or check your spelling.
        </Text>
      </div>
    );
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Actor":
        return "bg-blue-600 text-white border-blue-600";
      case "Director":
        return "bg-amber-600 text-white border-amber-600";
      case "Composer":
        return "bg-purple-600 text-white border-purple-600";
      default:
        return "";
    }
  };

  // Render movie card - use TMDB ID directly for reliable linking
  const renderMovieCard = (movie: SearchResultsType["movies"][0]) => (
    <Link key={movie.tmdb_id} href={`/movies/${movie.tmdb_id}`}>
      <Card variant="default" hover interactive className="h-full">
        <CardContent className="p-0">
          {movie.poster_url ? (
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-t-xl">
              <Image
                src={movie.poster_url}
                alt={movie.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
              />
            </div>
          ) : (
            <div className="aspect-[2/3] w-full bg-[var(--surface-2)] flex items-center justify-center rounded-t-xl">
              <FilmSlate className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
          )}
          <div className="p-3">
            <Text size="small" className="font-medium line-clamp-2 mb-1">
              {movie.title}
            </Text>
            {movie.year && (
              <Text size="tiny" muted>
                {movie.year}
              </Text>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  // Render person card (unified for actors, directors, composers)
  const renderPersonCard = (person: UnifiedPerson, idx: number) => (
    <Link key={`person-${person.id || idx}`} href={getPersonUrl(person.id, person.slug)}>
      <Card variant="default" hover interactive className="h-full">
        <CardContent className="p-0">
          {person.profile_url ? (
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-t-xl">
              <Image
                src={person.profile_url}
                alt={person.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
              />
              <div className="absolute top-2 right-2">
                <span
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                    getRoleColor(person.role)
                  )}
                >
                  {person.role}
                </span>
              </div>
            </div>
          ) : (
            <div className="aspect-[2/3] w-full bg-[var(--surface-2)] flex flex-col items-center justify-center rounded-t-xl relative">
              <User className="w-8 h-8 text-[var(--text-muted)]" />
              <div className="absolute top-2 right-2">
                <span
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                    getRoleColor(person.role)
                  )}
                >
                  {person.role}
                </span>
              </div>
            </div>
          )}
          <div className="p-3">
            <Text size="small" className="font-medium line-clamp-2 mb-1">
              {person.name}
            </Text>
            {person.movies && person.movies.length > 0 && (
              <Text size="tiny" muted className="line-clamp-2">
                {person.movies.slice(0, 2).join(", ")}
              </Text>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  // Render note card
  const renderNoteCard = (note: SearchResultsType["notes"][0]) => (
    <Card key={note.id} variant="default" hover interactive className="h-full">
      <CardContent className="p-4 h-full flex flex-col">
        <div className="flex items-start gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0">
            <Note className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          <div className="flex-1 min-w-0">
            {note.movie_title && (
              <Text size="small" className="font-medium line-clamp-1">
                {note.movie_title}
              </Text>
            )}
            {note.club_name && (
              <Text size="tiny" muted>
                {note.club_name}
              </Text>
            )}
          </div>
        </div>
        <Text size="small" className="line-clamp-3 flex-1" muted>
          {note.preview}
        </Text>
        {note.club_id && (
          <Link
            href={`/club/${note.club_id}`}
            className="text-xs text-[var(--primary)] hover:underline mt-2 inline-block"
          >
            View in club →
          </Link>
        )}
      </CardContent>
    </Card>
  );

  // Render discussion card
  const renderDiscussionCard = (discussion: SearchResultsType["discussions"][0]) => (
    <Link
      key={discussion.id}
      href={`/club/${discussion.club_slug}/discuss/${discussion.slug || discussion.id}`}
    >
      <Card variant="default" hover interactive className="h-full">
        <CardContent className="p-4 h-full flex flex-col">
          <div className="flex items-start gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0">
              <ChatCircleText className="w-4 h-4 text-[var(--text-muted)]" />
            </div>
            <div className="flex-1 min-w-0">
              <Text size="small" className="font-medium line-clamp-2">
                {discussion.title}
              </Text>
              {discussion.club_name && (
                <Text size="tiny" muted>
                  {discussion.club_name}
                </Text>
              )}
            </div>
          </div>
          {discussion.preview && (
            <Text size="small" className="line-clamp-2 flex-1" muted>
              {discussion.preview}
            </Text>
          )}
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="space-y-6">
      {/* Mobile: Debossed tabs */}
      <div className="md:hidden">
        <DebossedTabs options={tabOptions} value={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Desktop: Standard tabs */}
        <TabsList className="hidden md:flex w-full gap-1 p-1 overflow-x-auto">
          <TabsTrigger value="all" className="flex items-center gap-1.5 min-w-fit">
            <span>All</span>
            <span className="text-xs text-[var(--text-muted)]">({totalResults})</span>
          </TabsTrigger>
          {counts.movies > 0 && (
            <TabsTrigger value="movies" className="flex items-center gap-1.5 min-w-fit">
              <FilmSlate className="w-4 h-4" />
              <span>Movies</span>
              <span className="text-xs text-[var(--text-muted)]">({counts.movies})</span>
            </TabsTrigger>
          )}
          {counts.people > 0 && (
            <TabsTrigger value="people" className="flex items-center gap-1.5 min-w-fit">
              <Users className="w-4 h-4" />
              <span>People</span>
              <span className="text-xs text-[var(--text-muted)]">({counts.people})</span>
            </TabsTrigger>
          )}
          {counts.notes > 0 && (
            <TabsTrigger value="notes" className="flex items-center gap-1.5 min-w-fit">
              <Note className="w-4 h-4" />
              <span>Notes</span>
              <span className="text-xs text-[var(--text-muted)]">({counts.notes})</span>
            </TabsTrigger>
          )}
          {counts.discussions > 0 && (
            <TabsTrigger value="discussions" className="flex items-center gap-1.5 min-w-fit">
              <ChatCircleText className="w-4 h-4" />
              <span>Discussions</span>
              <span className="text-xs text-[var(--text-muted)]">({counts.discussions})</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* All Results Tab */}
        <TabsContent value="all">
          <div className="space-y-8">
            {/* Movies Section */}
            {counts.movies > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <FilmSlate className="w-5 h-5 text-[var(--text-muted)]" />
                  <Text
                    size="small"
                    className="font-semibold uppercase tracking-wide text-[var(--text-muted)]"
                  >
                    Movies
                  </Text>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {results.movies.slice(0, 5).map(renderMovieCard)}
                </div>
                {counts.movies > 5 && (
                  <button
                    onClick={() => setActiveTab("movies")}
                    className="mt-4 text-sm text-[var(--primary)] hover:underline"
                  >
                    View all {counts.movies} movies →
                  </button>
                )}
              </section>
            )}

            {/* People Section */}
            {counts.people > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-[var(--text-muted)]" />
                  <Text
                    size="small"
                    className="font-semibold uppercase tracking-wide text-[var(--text-muted)]"
                  >
                    People
                  </Text>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {unifiedPeople.slice(0, 5).map((person, idx) => renderPersonCard(person, idx))}
                </div>
                {counts.people > 5 && (
                  <button
                    onClick={() => setActiveTab("people")}
                    className="mt-4 text-sm text-[var(--primary)] hover:underline"
                  >
                    View all {counts.people} people →
                  </button>
                )}
              </section>
            )}

            {/* Notes Section */}
            {counts.notes > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Note className="w-5 h-5 text-[var(--text-muted)]" />
                  <Text
                    size="small"
                    className="font-semibold uppercase tracking-wide text-[var(--text-muted)]"
                  >
                    Notes
                  </Text>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.notes.slice(0, 4).map(renderNoteCard)}
                </div>
                {counts.notes > 4 && (
                  <button
                    onClick={() => setActiveTab("notes")}
                    className="mt-4 text-sm text-[var(--primary)] hover:underline"
                  >
                    View all {counts.notes} notes →
                  </button>
                )}
              </section>
            )}

            {/* Discussions Section */}
            {counts.discussions > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <ChatCircleText className="w-5 h-5 text-[var(--text-muted)]" />
                  <Text
                    size="small"
                    className="font-semibold uppercase tracking-wide text-[var(--text-muted)]"
                  >
                    Discussions
                  </Text>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.discussions.slice(0, 4).map(renderDiscussionCard)}
                </div>
                {counts.discussions > 4 && (
                  <button
                    onClick={() => setActiveTab("discussions")}
                    className="mt-4 text-sm text-[var(--primary)] hover:underline"
                  >
                    View all {counts.discussions} discussions →
                  </button>
                )}
              </section>
            )}
          </div>
        </TabsContent>

        {/* Movies Tab */}
        <TabsContent value="movies">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {results.movies.map(renderMovieCard)}
          </div>
        </TabsContent>

        {/* People Tab */}
        <TabsContent value="people">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {unifiedPeople.map((person, idx) => renderPersonCard(person, idx))}
          </div>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.notes.map(renderNoteCard)}
          </div>
        </TabsContent>

        {/* Discussions Tab */}
        <TabsContent value="discussions">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.discussions.map(renderDiscussionCard)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { Metadata } from "next";
import { SearchInterface } from "@/components/search/SearchInterface";
import { UpcomingMovies } from "@/components/marketing/UpcomingMovies";
import { CuratedMovies } from "@/components/search/CuratedMovies";
import { getUpcomingMoviesData } from "@/app/actions/marketing";
import { getActiveCuratedCollections } from "@/app/actions/curated-collections";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "Search | BackRow",
  description:
    "Search for movies, actors, directors, composers, notes, and discussion threads on BackRow",
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params?.q || "";

  // Fetch data for display when no search is active
  const [upcomingMovies, curatedCollections] = await Promise.all([
    getUpcomingMoviesData().catch(() => []),
    getActiveCuratedCollections().catch(() => []),
  ]);

  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Header - hidden on mobile */}
        <div className="hidden md:block mb-6">
          <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Search</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Find movies, actors, directors, and more.
          </p>
        </div>

        <SearchInterface initialQuery={query} />

        {/* Show curated collections when no search query */}
        {!query && (
          <TooltipProvider>
            {/* Admin-managed curated collections */}
            {curatedCollections.map((collection) => (
              <div key={collection.id} className="mt-6 md:mt-12">
                <CuratedMovies
                  title={collection.name}
                  subtitle={collection.subtitle || undefined}
                  emoji={collection.emoji}
                  movies={collection.movies}
                />
              </div>
            ))}

            {/* Upcoming Movies */}
            <div className="mt-6 md:mt-12">
              <UpcomingMovies movies={upcomingMovies} />
            </div>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}

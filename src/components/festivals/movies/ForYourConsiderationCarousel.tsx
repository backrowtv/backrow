"use client";

import { useState, useEffect, useCallback, memo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import useEmblaCarousel from "embla-carousel-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  FilmReel,
  CaretLeft,
  CaretRight,
  Star,
  Link as LinkIcon,
  CircleNotch,
} from "@phosphor-icons/react";
import { nominateFromFutureList } from "@/app/actions/profile";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";
import toast from "react-hot-toast";

interface FutureNominationItem {
  id: string;
  tmdb_id: number;
  note: string | null;
  tags: string[] | null;
  movie: {
    tmdb_id: number;
    title: string;
    poster_url: string | null;
    year: number | null;
  } | null;
  isLinkedToFestival?: boolean;
}

interface ForYourConsiderationCarouselProps {
  userId: string;
  festivalId: string;
  clubId: string;
  clubSlug: string;
  festivalSlug: string;
  festivalTheme?: string | null;
  hasNominated?: boolean;
}

// Movie Card Component
const MovieCard = memo(function MovieCard({
  item,
  isSelected,
  isMobile,
}: {
  item: FutureNominationItem;
  isSelected: boolean;
  isMobile: boolean;
}) {
  const movie = item.movie;

  return (
    <div className="flex flex-col items-center">
      <div className="p-1">
        <div
          className={`relative rounded-lg overflow-hidden shadow-xl transition-all duration-300 ${isSelected ? "ring-2 ring-[var(--primary)]" : ""}`}
          style={{
            backgroundColor: "var(--surface-2)",
            width: isMobile ? "140px" : "160px",
            aspectRatio: "2/3",
          }}
        >
          {movie?.poster_url ? (
            <Image
              src={
                movie.poster_url.startsWith("http")
                  ? movie.poster_url
                  : `https://image.tmdb.org/t/p/w500${movie.poster_url}`
              }
              alt={movie.title || "Movie"}
              fill
              className="object-cover"
              sizes={isMobile ? "140px" : "160px"}
              priority={isSelected}
              placeholder="blur"
              blurDataURL={getTMDBBlurDataURL()}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FilmReel className="w-12 h-12" style={{ color: "var(--text-muted)" }} />
            </div>
          )}

          {/* Note badge if exists */}
          {item.note && (
            <div className="absolute bottom-2 left-2 right-8">
              <Badge
                variant="secondary"
                size="sm"
                className="shadow-lg w-full justify-center truncate text-[10px]"
              >
                <span className="truncate">{item.note}</span>
              </Badge>
            </div>
          )}

          {/* Linked to this festival indicator */}
          {item.isLinkedToFestival && (
            <div
              className="absolute bottom-2 right-2 w-5 h-5 rounded flex items-center justify-center shadow-lg"
              style={{ backgroundColor: "var(--primary)" }}
              title="Linked to this festival"
            >
              <LinkIcon className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Title & Details */}
      <div className={`mt-2 text-center w-full ${isMobile ? "max-w-[140px]" : "max-w-[160px]"}`}>
        <h3
          className={`font-semibold truncate ${isMobile ? "text-xs" : "text-sm"}`}
          style={{ color: "var(--text-primary)" }}
        >
          {movie?.title || "Unknown Movie"}
        </h3>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {movie?.year}
        </p>
      </div>
    </div>
  );
});

// Focus Carousel Component (cinematic style)
const FocusCarousel = memo(function FocusCarousel({
  items,
  selectedIndex,
  onSelectMovie,
  isMobile,
}: {
  items: FutureNominationItem[];
  selectedIndex: number;
  onSelectMovie: (index: number) => void;
  isMobile: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(selectedIndex);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "center",
    containScroll: false,
    startIndex: selectedIndex,
    duration: 80, // Slow cinematic scroll
  });

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < items.length - 1;

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      const index = emblaApi.selectedScrollSnap();
      setCurrentIndex(index);
      if (index !== selectedIndex) {
        onSelectMovie(index);
      }
    };

    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, selectedIndex, onSelectMovie]);

  useEffect(() => {
    if (emblaApi && selectedIndex !== currentIndex) {
      emblaApi.scrollTo(selectedIndex);
    }
  }, [emblaApi, selectedIndex, currentIndex]);

  const scrollPrev = useCallback(() => {
    if (emblaApi && canGoPrev) emblaApi.scrollPrev();
  }, [emblaApi, canGoPrev]);

  const scrollNext = useCallback(() => {
    if (emblaApi && canGoNext) emblaApi.scrollNext();
  }, [emblaApi, canGoNext]);

  const posterHeight = isMobile ? 200 : 230;
  const arrowTop = posterHeight / 2;

  return (
    <div className="relative">
      <div className="overflow-hidden mx-10 md:mx-14" ref={emblaRef}>
        <div className="flex">
          {items.map((item, index) => {
            const isSelected = index === currentIndex;
            return (
              <div
                key={item.id}
                className="flex-[0_0_auto] min-w-0 px-1.5 cursor-pointer"
                style={{ width: isMobile ? "140px" : "160px" }}
                onClick={() => {
                  if (!isSelected) {
                    emblaApi?.scrollTo(index);
                  }
                }}
              >
                <div
                  className="transition-all duration-700 ease-out"
                  style={{
                    transform: isSelected ? "scale(1)" : "scale(0.85)",
                    opacity: isSelected ? 1 : 0.5,
                  }}
                >
                  <MovieCard item={item} isSelected={isSelected} isMobile={isMobile} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Arrow buttons */}
      <button
        onClick={scrollPrev}
        disabled={!canGoPrev}
        className="absolute left-0 md:left-2 z-40 p-2 rounded-full transition-transform duration-200 ease-out hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed -translate-y-1/2"
        style={{
          backgroundColor: "var(--surface-1)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
          top: `${arrowTop}px`,
        }}
        aria-label="Previous movie"
      >
        <CaretLeft className="w-5 h-5" />
      </button>
      <button
        onClick={scrollNext}
        disabled={!canGoNext}
        className="absolute right-0 md:right-2 z-40 p-2 rounded-full transition-transform duration-200 ease-out hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed -translate-y-1/2"
        style={{
          backgroundColor: "var(--surface-1)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
          top: `${arrowTop}px`,
        }}
        aria-label="Next movie"
      >
        <CaretRight className="w-5 h-5" />
      </button>

      {/* Position dots */}
      <div className="flex justify-center items-center gap-1.5 mt-2">
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            className={`rounded-full transition-all duration-200 ${
              index === currentIndex ? "w-6 h-2.5" : "w-2 h-2 opacity-50 hover:opacity-80"
            }`}
            style={{
              backgroundColor: index === currentIndex ? "var(--primary)" : "var(--surface-3)",
            }}
            aria-label={`Go to movie ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
});

export function ForYourConsiderationCarousel({
  userId,
  festivalId,
  clubId,
  clubSlug: _clubSlug,
  festivalSlug: _festivalSlug,
  festivalTheme,
  hasNominated = false,
}: ForYourConsiderationCarouselProps) {
  const [items, setItems] = useState<FutureNominationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isNominating, setIsNominating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load future nominations with theme link info
  useEffect(() => {
    async function loadFutureNominations() {
      try {
        // Get user's future nominations
        const { data, error } = await supabase
          .from("future_nomination_list")
          .select("id, tmdb_id, note, tags, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
          setItems([]);
          setLoading(false);
          return;
        }

        // Get movie details
        const tmdbIds = data.map((item) => item.tmdb_id);
        const { data: movies } = await supabase
          .from("movies")
          .select("tmdb_id, title, poster_url, year")
          .in("tmdb_id", [...new Set(tmdbIds)]);

        const moviesMap = new Map((movies || []).map((m) => [m.tmdb_id, m]));

        // Get links to THIS specific festival
        const { data: festivalLinks } = await supabase
          .from("future_nomination_links")
          .select("future_nomination_id")
          .in(
            "future_nomination_id",
            data.map((d) => d.id)
          )
          .eq("festival_id", festivalId)
          .eq("nominated", false);

        const linkedToFestivalSet = new Set(
          festivalLinks?.map((l) => l.future_nomination_id) || []
        );

        // Build items with movie data and festival link info
        const itemsWithMovies: FutureNominationItem[] = data.map((item) => ({
          id: item.id,
          tmdb_id: item.tmdb_id,
          note: item.note,
          tags: item.tags,
          movie: moviesMap.get(item.tmdb_id) || null,
          isLinkedToFestival: linkedToFestivalSet.has(item.id),
        }));

        // Sort: movies linked to this festival FIRST, then by original order
        itemsWithMovies.sort((a, b) => {
          if (a.isLinkedToFestival && !b.isLinkedToFestival) return -1;
          if (!a.isLinkedToFestival && b.isLinkedToFestival) return 1;
          return 0; // Keep original order (by created_at desc)
        });

        setItems(itemsWithMovies);
      } catch (error) {
        console.error("Error loading future nominations:", error);
      } finally {
        setLoading(false);
      }
    }

    loadFutureNominations();
  }, [userId, festivalId, supabase]);

  const currentItem = items[selectedIndex];

  const handleNominate = async () => {
    if (!currentItem) return;

    setIsNominating(true);
    try {
      const result = await nominateFromFutureList(currentItem.id, clubId, festivalId);

      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(`"${currentItem.movie?.title}" nominated!`);
      setShowConfirmDialog(false);

      // Remove the nominated item from the list
      setItems((prev) => prev.filter((item) => item.id !== currentItem.id));

      // Adjust selected index if needed
      if (selectedIndex >= items.length - 1) {
        setSelectedIndex(Math.max(0, items.length - 2));
      }

      router.refresh();
    } catch (error) {
      console.error("Error nominating:", error);
      toast.error("Failed to nominate movie");
    } finally {
      setIsNominating(false);
    }
  };

  if (loading) {
    return (
      <Card variant="default">
        <CardContent className="p-6">
          <div className="flex justify-center items-center py-8">
            <CircleNotch className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return null;
  }

  // Hide when user has already nominated
  if (hasNominated) {
    return null;
  }

  return (
    <>
      <Card variant="default">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4" style={{ color: "var(--primary)" }} />
              For Your Consideration
            </CardTitle>
            <Badge variant="secondary" size="sm">
              {items.length} saved
            </Badge>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Movies from your future nominations list
          </p>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="space-y-4">
            {/* Focus Carousel */}
            <FocusCarousel
              items={items}
              selectedIndex={selectedIndex}
              onSelectMovie={setSelectedIndex}
              isMobile={isMobile}
            />

            {/* Nominate button for selected movie */}
            {currentItem && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={isNominating}
                >
                  {isNominating ? <CircleNotch className="w-4 h-4 animate-spin mr-2" /> : null}
                  Nominate {currentItem.movie?.title ? `"${currentItem.movie.title}"` : "Movie"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Nominate Movie?"
        description={
          <span>
            Are you sure you want to nominate <strong>{currentItem?.movie?.title}</strong> for this
            festival?
            {festivalTheme && (
              <span className="block mt-1 text-[var(--text-muted)]">Theme: {festivalTheme}</span>
            )}
          </span>
        }
        confirmText="Nominate"
        onConfirm={handleNominate}
        variant="default"
        isLoading={isNominating}
      />
    </>
  );
}

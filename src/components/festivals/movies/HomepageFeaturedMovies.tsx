"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  MagnifyingGlass,
  X,
  CircleNotch,
  Plus,
  FilmReel,
  PencilSimple,
} from "@phosphor-icons/react";
import { Textarea } from "@/components/ui/textarea";
import { Star, Rewind } from "@phosphor-icons/react";
import Image from "next/image";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";
import toast from "react-hot-toast";
import {
  getEndlessFestivalData,
  addMovieToPlaying,
  setDisplaySlot,
  deleteFromEndlessFestival,
  moveToCompleted,
  updateNominationPitch,
  type EndlessMovie,
} from "@/app/actions/endless-festival";
import { searchMovies } from "@/app/actions/tmdb";

interface HomepageFeaturedMoviesProps {
  clubId: string;
  clubSlug: string;
}

type SlotType = "featured" | "throwback";

export function HomepageFeaturedMovies({
  clubId,
  clubSlug: _clubSlug,
}: HomepageFeaturedMoviesProps) {
  const [isPending, startTransition] = useTransition();
  const [nowPlaying, setNowPlaying] = useState<EndlessMovie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetSlot, setTargetSlot] = useState<SlotType>("featured");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{
      id: number;
      title: string;
      year: number | null;
      poster_path: string | null;
    }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<{
    id: number;
    title: string;
    year: number | null;
    poster_path: string | null;
  } | null>(null);
  const [curatorNote, setCuratorNote] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [editingMovie, setEditingMovie] = useState<EndlessMovie | null>(null);
  const [editPitch, setEditPitch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Get current featured movies
  const featuredMovie = nowPlaying.find((m) => m.display_slot === "featured");
  const throwbackMovie = nowPlaying.find((m) => m.display_slot === "throwback");

  // Fetch endless festival data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const result = await getEndlessFestivalData(clubId);
      if (!("error" in result)) {
        setNowPlaying(result.nowPlaying);
      }
      setIsLoading(false);
    };
    loadData();
  }, [clubId]);

  // Handle search with debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchMovies(searchQuery.trim());
        if (results && !("error" in results)) {
          setSearchResults(results.slice(0, 8));
        } else if ("error" in results) {
          console.error("Search error:", results.error);
          toast.error("Search failed");
          setSearchResults([]);
        }
      } catch (err) {
        console.error("Search error:", err);
        toast.error("Search failed");
        setSearchResults([]);
      }
      setIsSearching(false);
    }, 300);

    searchTimeoutRef.current = timeout;

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchQuery]);

  const openAddModal = (slot: SlotType) => {
    setTargetSlot(slot);
    setShowAddModal(true);
  };

  const handleAddMovie = async () => {
    if (!selectedMovie) return;

    startTransition(async () => {
      const result = await addMovieToPlaying(
        clubId,
        selectedMovie.id,
        curatorNote || undefined,
        targetSlot
      );

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`Added ${selectedMovie.title}`);
        closeModal();

        const data = await getEndlessFestivalData(clubId);
        if (!("error" in data)) {
          setNowPlaying(data.nowPlaying);
        }
        router.refresh();
      }
    });
  };

  const handleRemoveFromSlot = async (movie: EndlessMovie) => {
    startTransition(async () => {
      const result = await setDisplaySlot(movie.id, null);

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Removed from homepage");
        setNowPlaying((prev) =>
          prev.map((m) => (m.id === movie.id ? { ...m, display_slot: null } : m))
        );
        router.refresh();
      }
    });
  };

  const handleDeleteMovie = async (movie: EndlessMovie) => {
    if (!confirm(`Remove "${movie.title}" from the club?`)) return;

    startTransition(async () => {
      const result = await deleteFromEndlessFestival(movie.id);

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Removed");
        setNowPlaying((prev) => prev.filter((m) => m.id !== movie.id));
        router.refresh();
      }
    });
  };

  const handleMoveToCompleted = async (movie: EndlessMovie) => {
    startTransition(async () => {
      const result = await moveToCompleted(movie.id);

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Marked as watched");
        setNowPlaying((prev) => prev.filter((m) => m.id !== movie.id));
        router.refresh();
      }
    });
  };

  const closeModal = () => {
    setShowAddModal(false);
    setSelectedMovie(null);
    setSearchQuery("");
    setCuratorNote("");
    setSearchResults([]);
  };

  const openEditModal = (movie: EndlessMovie) => {
    setEditingMovie(movie);
    setEditPitch(movie.curator_note || "");
  };

  const closeEditModal = () => {
    setEditingMovie(null);
    setEditPitch("");
  };

  const handleUpdatePitch = async () => {
    if (!editingMovie) return;

    startTransition(async () => {
      const result = await updateNominationPitch(editingMovie.id, editPitch);

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Pitch updated");
        closeEditModal();

        // Update local state
        setNowPlaying((prev) =>
          prev.map((m) =>
            m.id === editingMovie.id ? { ...m, curator_note: editPitch.trim() || null } : m
          )
        );
        router.refresh();
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <CircleNotch className="w-4 h-4 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Featured New Release */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Star weight="fill" className="w-3.5 h-3.5 text-[var(--warning)]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Featured New Release
          </span>
        </div>
        {featuredMovie ? (
          <MovieSlotContent
            movie={featuredMovie}
            onRemove={() => handleRemoveFromSlot(featuredMovie)}
            onComplete={() => handleMoveToCompleted(featuredMovie)}
            onDelete={() => handleDeleteMovie(featuredMovie)}
            onEdit={() => openEditModal(featuredMovie)}
            isPending={isPending}
          />
        ) : (
          <EmptySlot onAdd={() => openAddModal("featured")} isPending={isPending} />
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--border)]" />

      {/* Throwback Movie */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Rewind weight="fill" className="w-3.5 h-3.5 text-[var(--primary)]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Throwback Movie
          </span>
        </div>
        {throwbackMovie ? (
          <MovieSlotContent
            movie={throwbackMovie}
            onRemove={() => handleRemoveFromSlot(throwbackMovie)}
            onComplete={() => handleMoveToCompleted(throwbackMovie)}
            onDelete={() => handleDeleteMovie(throwbackMovie)}
            onEdit={() => openEditModal(throwbackMovie)}
            isPending={isPending}
          />
        ) : (
          <EmptySlot onAdd={() => openAddModal("throwback")} isPending={isPending} />
        )}
      </div>

      {/* Add Movie Modal */}
      <Modal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        title={`Add ${targetSlot === "featured" ? "New Release" : "Throwback"}`}
        size="md"
      >
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <Input
              ref={searchInputRef as React.Ref<HTMLInputElement>}
              type="text"
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 search-input-debossed"
            />
          </div>

          {/* Selected movie */}
          {selectedMovie && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-1)]">
              <MoviePoster
                url={
                  selectedMovie.poster_path
                    ? `https://image.tmdb.org/t/p/w92${selectedMovie.poster_path}`
                    : undefined
                }
                title={selectedMovie.title}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-[var(--text-primary)]">
                  {selectedMovie.title}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {selectedMovie.year || "Unknown year"}
                </p>
              </div>
              <button
                onClick={() => setSelectedMovie(null)}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Search results */}
          {!selectedMovie && searchQuery.length >= 2 && (
            <div className="max-h-[200px] overflow-y-auto rounded-lg border border-[var(--border)]">
              {isSearching ? (
                <div className="p-4 flex justify-center">
                  <CircleNotch className="w-4 h-4 animate-spin text-[var(--text-muted)]" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-[var(--text-muted)]">No results found</p>
                </div>
              ) : (
                <div>
                  {searchResults.map((movie) => (
                    <button
                      key={movie.id}
                      onClick={() => setSelectedMovie(movie)}
                      className="w-full flex items-center gap-3 p-2.5 hover:bg-[var(--surface-1)] transition-colors text-left"
                    >
                      <MoviePoster
                        url={
                          movie.poster_path
                            ? `https://image.tmdb.org/t/p/w92${movie.poster_path}`
                            : undefined
                        }
                        title={movie.title}
                        size="tiny"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate text-[var(--text-primary)]">{movie.title}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {movie.year || "Unknown"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Curator note */}
          {selectedMovie && (
            <Input
              type="text"
              placeholder="Why this movie? (optional)"
              value={curatorNote}
              onChange={(e) => setCuratorNote(e.target.value)}
            />
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={handleAddMovie}
              disabled={!selectedMovie || isPending}
              isLoading={isPending}
            >
              Add
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Pitch Modal */}
      <Modal
        open={!!editingMovie}
        onOpenChange={(open) => !open && closeEditModal()}
        title="Edit Pitch"
        size="md"
      >
        <div className="space-y-4">
          {/* Movie info */}
          {editingMovie && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-1)]">
              <MoviePoster
                url={editingMovie.poster_url || undefined}
                title={editingMovie.title}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-[var(--text-primary)]">
                  {editingMovie.title}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {editingMovie.year || "Unknown year"}
                </p>
              </div>
            </div>
          )}

          {/* Pitch textarea */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Why this movie?
            </label>
            <Textarea
              placeholder="Share why you picked this movie... (optional)"
              value={editPitch}
              onChange={(e) => setEditPitch(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-[var(--text-muted)] text-right">{editPitch.length}/500</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={closeEditModal}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePitch} disabled={isPending} isLoading={isPending}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Movie poster component
function MoviePoster({
  url,
  title,
  size = "sm",
}: {
  url?: string;
  title: string;
  size?: "tiny" | "xs" | "sm" | "md";
}) {
  const dims =
    size === "tiny"
      ? "w-6 h-9"
      : size === "xs"
        ? "w-8 h-12"
        : size === "md"
          ? "w-14 h-20"
          : "w-10 h-15";
  const iconSize = size === "md" ? "w-5 h-5" : "w-3 h-3";

  return (
    <div
      className={`relative ${dims} rounded-lg overflow-hidden bg-[var(--surface-2)] flex-shrink-0 ring-1 ring-[var(--border)]`}
    >
      {url ? (
        <Image
          src={url}
          alt={title}
          fill
          className="object-cover"
          sizes={size === "xs" ? "32px" : size === "md" ? "56px" : "40px"}
          placeholder="blur"
          blurDataURL={getTMDBBlurDataURL()}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <FilmReel className={`${iconSize} text-[var(--text-muted)]`} />
        </div>
      )}
    </div>
  );
}

// Slot content when movie is assigned
function MovieSlotContent({
  movie,
  onRemove,
  onComplete,
  onDelete,
  onEdit,
  isPending,
}: {
  movie: EndlessMovie;
  onRemove: () => void;
  onComplete: () => void;
  onDelete: () => void;
  onEdit: () => void;
  isPending: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <MoviePoster url={movie.poster_url ?? undefined} title={movie.title} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {movie.title}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{movie.year || "Unknown year"}</p>
          </div>
          {/* Edit button */}
          <button
            onClick={onEdit}
            disabled={isPending}
            className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 flex-shrink-0"
            title="Edit pitch"
          >
            <PencilSimple className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Show curator note if present */}
        {movie.curator_note && (
          <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2 italic">
            "{movie.curator_note}"
          </p>
        )}
        {/* Inline actions */}
        <div className="flex items-center gap-2 mt-1.5">
          <button
            onClick={onComplete}
            disabled={isPending}
            className="text-[11px] font-medium text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors disabled:opacity-50"
          >
            Conclude
          </button>
          <span className="text-[var(--text-muted)]">·</span>
          <button
            onClick={onRemove}
            disabled={isPending}
            className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
          >
            Unfeature
          </button>
          <span className="text-[var(--text-muted)]">·</span>
          <button
            onClick={onDelete}
            disabled={isPending}
            className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--error)] transition-colors disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Empty slot state
function EmptySlot({ onAdd, isPending }: { onAdd: () => void; isPending: boolean }) {
  return (
    <button onClick={onAdd} disabled={isPending} className="flex items-center gap-3 group">
      <div className="w-14 h-20 rounded-lg border-2 border-dashed border-[var(--border)] group-hover:border-[var(--primary)]/50 flex items-center justify-center transition-colors">
        <Plus className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--primary)]" />
      </div>
      <div className="text-left">
        <p className="text-sm font-medium text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">
          Add movie
        </p>
        <p className="text-xs text-[var(--text-muted)]">Click to search</p>
      </div>
    </button>
  );
}

"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  FilmReel,
  User,
  FilmSlate,
  PencilSimple,
  Check,
  CircleNotch,
  Trash,
  CaretLeft,
  CaretRight,
  CaretDown,
  CaretUp,
  Notepad,
} from "@phosphor-icons/react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { deleteNomination } from "@/app/actions/nominations";
import { getMovieDetailsForDisplay, type MovieDetailsForDisplay } from "@/app/actions/tmdb";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface YourNominationSectionProps {
  nomination: {
    id: string;
    tmdb_id: number;
    pitch: string | null;
    movie: {
      title: string;
      year: number | null;
      poster_url: string | null;
      slug: string | null;
      director: string | null;
    } | null;
  } | null;
  festivalId: string;
  clubSlug: string;
  festivalSlug: string;
  canEdit?: boolean;
}

function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `$${Math.round(amount / 1_000_000)}M`;
  }
  if (amount >= 1_000) {
    return `$${Math.round(amount / 1_000)}K`;
  }
  return `$${amount}`;
}

function ScrollableTrough({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -120 : 120, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-0 bottom-0 z-10 w-6 flex items-center justify-center bg-gradient-to-r from-[var(--surface-1)]/80 to-transparent"
        >
          <CaretLeft className="w-3 h-3 text-[var(--text-muted)]" />
        </button>
      )}
      <div
        ref={scrollRef}
        className="carousel-trough rounded-lg px-2.5 py-2 overflow-x-auto scrollbar-hide"
      >
        <div className="flex gap-1.5">{children}</div>
      </div>
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 bottom-0 z-10 w-6 flex items-center justify-center bg-gradient-to-l from-[var(--surface-1)]/80 to-transparent"
        >
          <CaretRight className="w-3 h-3 text-[var(--text-muted)]" />
        </button>
      )}
    </div>
  );
}

function PersonPoster({
  person,
  size = "sm",
}: {
  person: {
    id: number;
    name: string;
    profile_path: string | null;
    character?: string;
    job?: string;
  };
  size?: "sm" | "lg" | "xl";
}) {
  const sizeMap = {
    sm: { width: "w-8", img: "32px", name: "text-[7px]", icon: "w-3 h-3" },
    lg: { width: "w-11", img: "44px", name: "text-[8px]", icon: "w-4 h-4" },
    xl: { width: "w-11", img: "44px", name: "text-[8px]", icon: "w-4 h-4" },
  };
  const s = sizeMap[size];
  const widthClass = s.width;
  const imgSize = s.img;
  const nameClass = s.name;
  const iconClass = s.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={`/person/${person.id}`} className={`flex-shrink-0 ${widthClass} group`}>
          <div className="poster-card-embossed rounded overflow-hidden aspect-[2/3] relative bg-[var(--surface-2)]">
            {person.profile_path ? (
              <Image
                src={`https://image.tmdb.org/t/p/w92${person.profile_path}`}
                alt={person.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform"
                sizes={imgSize}
                placeholder="blur"
                blurDataURL={getTMDBBlurDataURL()}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className={`${iconClass} text-[var(--text-muted)]`} />
              </div>
            )}
          </div>
          <p
            className={`${nameClass} text-[var(--text-muted)] text-center mt-0.5 line-clamp-2 leading-tight`}
          >
            {person.name}
          </p>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <p className="font-medium">{person.name}</p>
        {person.character && <p className="text-[var(--text-muted)]">as {person.character}</p>}
        {person.job && <p className="text-[var(--text-muted)]">{person.job}</p>}
      </TooltipContent>
    </Tooltip>
  );
}

export function YourNominationSection({
  nomination,
  festivalId: _festivalId,
  clubSlug: _clubSlug,
  festivalSlug: _festivalSlug,
  canEdit = true,
}: YourNominationSectionProps) {
  const [movieDetails, setMovieDetails] = useState<MovieDetailsForDisplay | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCastCrewOpen, setIsCastCrewOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const router = useRouter();

  // Fetch full movie details from TMDB
  useEffect(() => {
    async function fetchDetails() {
      if (!nomination?.tmdb_id) return;

      setIsLoadingDetails(true);
      try {
        const details = await getMovieDetailsForDisplay(nomination.tmdb_id);
        setMovieDetails(details);
      } catch (error) {
        console.error("Error fetching movie details:", error);
      } finally {
        setIsLoadingDetails(false);
      }
    }

    fetchDetails();
  }, [nomination?.tmdb_id]);

  const handleDeleteNomination = () => {
    if (!nomination) return;

    startDeleteTransition(async () => {
      const result = await deleteNomination(nomination.id);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Nomination removed");
        setShowDeleteConfirm(false);
        router.refresh();
      }
    });
  };

  if (!nomination) {
    return null;
  }

  const movie = nomination.movie;
  const movieUrl = movie?.slug ? `/movies/${movie.slug}` : `/movies/${nomination.tmdb_id}`;

  // Build crew list from movie details (deduplicated, ordered by importance)
  const crew: Array<{ id: number; name: string; profile_path: string | null; job: string }> = [];
  if (movieDetails) {
    const seenIds = new Set<number>();
    const addCrew = (members: typeof movieDetails.directors, job: string) => {
      for (const m of members) {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id);
          crew.push({ ...m, job });
        }
      }
    };
    addCrew(movieDetails.directors, "Director");
    addCrew(movieDetails.writers, "Writer");
    addCrew(movieDetails.cinematographers, "Cinematography");
    addCrew(movieDetails.composers, "Composer");
    addCrew(movieDetails.editors, "Editor");
    addCrew(movieDetails.productionDesigners, "Production Design");
    addCrew(movieDetails.costumeDesigners, "Costume Design");
  }

  return (
    <>
      <Card variant="default" className="overflow-hidden h-full flex flex-col">
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <FilmSlate className="w-4 h-4" style={{ color: "var(--primary)" }} />
              Your Nomination
            </CardTitle>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs h-6 px-2 text-[var(--error)] hover:opacity-80 hover:bg-[var(--error)]/10"
              >
                <Trash className="w-3 h-3 mr-1" />
                Remove
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-3 space-y-3">
          {/* Movie Info Row */}
          <div className="flex gap-3">
            {/* Poster */}
            <Link href={movieUrl} className="flex-shrink-0">
              <div className="relative w-20 aspect-[2/3] rounded-md overflow-hidden shadow-md hover:scale-105 transition-transform">
                {movie?.poster_url ? (
                  <Image
                    src={movie.poster_url}
                    alt={movie.title || "Movie"}
                    fill
                    className="object-cover"
                    sizes="80px"
                    placeholder="blur"
                    blurDataURL={getTMDBBlurDataURL()}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ backgroundColor: "var(--surface-2)" }}
                  >
                    <FilmReel className="w-5 h-5 text-[var(--text-muted)]" />
                  </div>
                )}
              </div>
            </Link>

            {/* Title, Year, Info, Pitch */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div>
                <Link href={movieUrl}>
                  <h3 className="font-semibold text-sm text-[var(--text-primary)] hover:text-[var(--primary)] transition-colors line-clamp-1">
                    {movie?.title || "Unknown Movie"}
                  </h3>
                </Link>
                {movie?.year && (
                  <p className="text-[11px] text-[var(--text-muted)]">{movie.year}</p>
                )}
              </div>

              {/* Movie Info with Labels — inline beside poster */}
              {movieDetails && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {movieDetails.certification && (
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-[var(--text-muted)]">Rated</span>
                      <span className="text-[11px] font-medium text-[var(--text-primary)]">
                        {movieDetails.certification}
                      </span>
                    </div>
                  )}
                  {movieDetails.runtime && (
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-[var(--text-muted)]">Runtime</span>
                      <span className="text-[11px] font-medium text-[var(--text-primary)]">
                        {formatRuntime(movieDetails.runtime)}
                      </span>
                    </div>
                  )}
                  {movieDetails.budget != null && movieDetails.budget > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-[var(--text-muted)]">Budget</span>
                      <span className="text-[11px] font-medium text-[var(--text-primary)]">
                        {formatCurrency(movieDetails.budget)}
                      </span>
                    </div>
                  )}
                  {movieDetails.revenue != null && movieDetails.revenue > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-[var(--text-muted)]">Box Office</span>
                      <span className="text-[11px] font-medium text-[var(--text-primary)]">
                        {formatCurrency(movieDetails.revenue)}
                      </span>
                    </div>
                  )}
                  {movieDetails.studio && (
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-[var(--text-muted)]">Studio</span>
                      <span className="text-[11px] font-medium text-[var(--text-primary)] truncate max-w-[100px]">
                        {movieDetails.studio}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Pitch */}
              {nomination.pitch && (
                <p className="text-[10px] text-[var(--text-secondary)] italic line-clamp-2">
                  &ldquo;{nomination.pitch}&rdquo;
                </p>
              )}
            </div>
          </div>

          {/* Loading spinner for details */}
          {isLoadingDetails && (
            <div className="flex justify-center py-2">
              <CircleNotch className="w-4 h-4 animate-spin text-[var(--text-muted)]" />
            </div>
          )}
        </CardContent>

        {/* Cast & Crew — compact preview collapsed, full troughs expanded */}
        {!isLoadingDetails && movieDetails && (movieDetails.cast.length > 0 || crew.length > 0) && (
          <Collapsible open={isCastCrewOpen} onOpenChange={setIsCastCrewOpen} className="mt-auto">
            {/* Collapsed preview: large posters filling the space — hidden on mobile */}
            {!isCastCrewOpen && (
              <div className="px-4 pb-1 hidden lg:block">
                <TooltipProvider delayDuration={300}>
                  <div className="grid grid-cols-2 gap-3">
                    {movieDetails.cast.length > 0 && (
                      <div>
                        <p className="text-[9px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">
                          Cast
                        </p>
                        <div className="flex gap-2">
                          {movieDetails.cast.slice(0, 4).map((person) => (
                            <PersonPoster key={person.id} person={person} size="xl" />
                          ))}
                        </div>
                      </div>
                    )}
                    {crew.length > 0 && (
                      <div>
                        <p className="text-[9px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">
                          Crew
                        </p>
                        <div className="flex gap-2">
                          {crew.slice(0, 4).map((person) => (
                            <PersonPoster key={person.id} person={person} size="xl" />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TooltipProvider>
              </div>
            )}

            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-center gap-1.5 py-1 cursor-pointer hover:bg-[var(--surface-2)] transition-colors border-t border-[var(--border)]">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  {isCastCrewOpen ? "Collapse" : "Expand"} Cast & Crew
                </span>
                {isCastCrewOpen ? (
                  <CaretUp className="w-3 h-3 text-[var(--text-muted)]" />
                ) : (
                  <CaretDown className="w-3 h-3 text-[var(--text-muted)]" />
                )}
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="pt-0 pb-3">
                <TooltipProvider delayDuration={300}>
                  <div className="space-y-2.5">
                    {/* Cast — full scrollable */}
                    {movieDetails.cast.length > 0 && (
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                          Cast
                        </p>
                        <ScrollableTrough>
                          {movieDetails.cast.slice(0, 8).map((person) => (
                            <PersonPoster key={person.id} person={person} />
                          ))}
                        </ScrollableTrough>
                      </div>
                    )}

                    {/* Crew — full scrollable */}
                    {crew.length > 0 && (
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                          Crew
                        </p>
                        <ScrollableTrough>
                          {crew.map((person) => (
                            <PersonPoster key={person.id} person={person} />
                          ))}
                        </ScrollableTrough>
                      </div>
                    )}
                  </div>
                </TooltipProvider>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Remove Nomination?"
        description={
          <span>
            Are you sure you want to remove <strong>{movie?.title}</strong> from this festival? This
            action cannot be undone.
          </span>
        }
        confirmText="Remove"
        onConfirm={handleDeleteNomination}
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
}

// Private Notes - rendered in sidebar under festival overview
const EXPAND_EASE = [0.04, 0.62, 0.23, 0.98] as [number, number, number, number];
const noteExpandTransition = {
  height: { duration: 0.3, ease: EXPAND_EASE },
  opacity: { duration: 0.25, delay: 0.05 },
};
const noteCollapseTransition = {
  height: { duration: 0.25, ease: EXPAND_EASE },
  opacity: { duration: 0.15 },
};

interface FestivalPrivateNotesProps {
  festivalId: string;
  initialNotes: Array<{
    id: string;
    note: string;
    created_at: string;
    updated_at: string | null;
  }>;
}

export function FestivalPrivateNotes({ festivalId, initialNotes }: FestivalPrivateNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleAddNote = async () => {
    const trimmed = newNote.trim();
    if (!trimmed) return;

    setIsSaving(true);
    try {
      const { createFestivalPrivateNote } = await import("@/app/actions/notes");
      const result = await createFestivalPrivateNote(festivalId, trimmed);
      if (result.error) {
        toast.error(result.error);
      } else if (result.data) {
        setNotes((prev) => [result.data!, ...prev]);
        setNewNote("");
        toast.success("Note saved");
      }
    } catch {
      toast.error("Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    const trimmed = editingText.trim();
    if (!trimmed) return;

    setIsSaving(true);
    try {
      const { updateFestivalPrivateNote } = await import("@/app/actions/notes");
      const result = await updateFestivalPrivateNote(noteId, trimmed);
      if (result.error) {
        toast.error(result.error);
      } else if (result.data) {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === noteId
              ? { ...n, note: result.data!.note, updated_at: result.data!.updated_at }
              : n
          )
        );
        setEditingNoteId(null);
        setEditingText("");
        toast.success("Note updated");
      }
    } catch {
      toast.error("Failed to update note");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setIsSaving(true);
    try {
      const { deleteFestivalPrivateNote } = await import("@/app/actions/notes");
      const result = await deleteFestivalPrivateNote(noteId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        setDeleteConfirmId(null);
        toast.success("Note deleted");
      }
    } catch {
      toast.error("Failed to delete note");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card variant="default" className="overflow-hidden">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Notepad className="w-4 h-4" style={{ color: "var(--primary)" }} />
            Private Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3 pt-0 space-y-2">
          {/* Existing notes */}
          <AnimatePresence initial={false}>
            {notes.map((note) => (
              <motion.div
                key={note.id}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1, transition: noteExpandTransition }}
                exit={{ height: 0, opacity: 0, transition: noteCollapseTransition }}
                className="overflow-hidden"
              >
                <div className="rounded bg-[var(--surface-2)] p-2">
                  <AnimatePresence mode="wait" initial={false}>
                    {editingNoteId === note.id ? (
                      <motion.div
                        key="editing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { duration: 0.2 } }}
                        exit={{ opacity: 0, transition: { duration: 0.15 } }}
                        className="space-y-1.5"
                      >
                        <Textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          rows={3}
                          className="text-base md:text-[10px] min-h-[60px] max-h-[200px] resize-y"
                        />
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingNoteId(null);
                              setEditingText("");
                            }}
                            className="h-6 text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateNote(note.id)}
                            disabled={isSaving || !editingText.trim()}
                            className="h-6 text-xs"
                          >
                            {isSaving ? (
                              <CircleNotch className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3 mr-1" />
                            )}
                            Save
                          </Button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="viewing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { duration: 0.2 } }}
                        exit={{ opacity: 0, transition: { duration: 0.15 } }}
                      >
                        <p className="text-[10px] text-[var(--text-secondary)] whitespace-pre-wrap">
                          {note.note}
                        </p>
                        <div className="flex items-center justify-between mt-1.5">
                          <p
                            className="text-[8px] text-[var(--text-muted)]"
                            suppressHydrationWarning
                          >
                            {new Date(
                              note.updated_at || note.created_at || ""
                            ).toLocaleDateString()}
                          </p>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setEditingText(note.note);
                              }}
                              className="h-5 w-5 p-0"
                            >
                              <PencilSimple className="w-3 h-3 text-[var(--text-muted)]" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirmId(note.id)}
                              className="h-5 w-5 p-0 text-[var(--error)] hover:text-[var(--error)]"
                            >
                              <Trash className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add new note */}
          <div className="space-y-1.5">
            <Textarea
              placeholder="Add a private note (only visible to you)..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={2}
              className="text-base md:text-[10px] placeholder:text-base placeholder:md:text-[10px] min-h-[48px] max-h-[200px] resize-y"
            />
            <AnimatePresence initial={false}>
              {newNote.trim() && (
                <motion.div
                  key="save-button"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1, transition: noteExpandTransition }}
                  exit={{ height: 0, opacity: 0, transition: noteCollapseTransition }}
                  className="overflow-hidden"
                >
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddNote}
                      disabled={isSaving}
                      className="h-6 text-xs"
                    >
                      {isSaving ? (
                        <CircleNotch className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3 mr-1" />
                      )}
                      Save Note
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null);
        }}
        title="Delete Note?"
        description="Are you sure you want to delete this note? This cannot be undone."
        confirmText="Delete"
        onConfirm={() => {
          if (deleteConfirmId) handleDeleteNote(deleteConfirmId);
        }}
        variant="danger"
        isLoading={isSaving}
      />
    </>
  );
}

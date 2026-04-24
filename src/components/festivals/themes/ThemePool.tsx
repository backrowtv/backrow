"use client";

import {
  addTheme,
  removeTheme,
  updateTheme,
  voteOnThemePool,
  getThemePoolVotes,
} from "@/app/actions/themes";
import { useActionState, useTransition, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Database } from "@/types/database";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { UpvoteButton } from "@/components/ui/upvote-button";
import { Plus, PencilSimple, Trash, Lock, Link } from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { AddMovieToThemeModal } from "../modals/AddMovieToThemeModal";
import { motion } from "framer-motion";

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  return `${diffMonths}mo ago`;
}

type ThemeRow = Database["public"]["Tables"]["theme_pool"]["Row"];
type Theme = ThemeRow & {
  added_by_user?: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

type SortOption = "new" | "top" | "old";

type VotesMap = Record<string, { upvotes: number; userVote: "upvote" | null }>;

interface ThemePoolProps {
  themes: Theme[];
  clubId: string;
  canManage?: boolean;
  themeSubmissionsLocked?: boolean;
  themeVotingEnabled?: boolean;
  /** Visual variant - 'default' has card styling, 'minimal' has transparent background */
  variant?: "default" | "minimal";
  /** External sort control - if provided, use this instead of internal state */
  sortBy?: SortOption;
  /** Hide internal sort controls */
  hideSort?: boolean;
  /** Current user ID to determine theme ownership */
  currentUserId?: string;
  /** External filter control - show only current user's themes */
  showOnlyMine?: boolean;
  /** Pre-fetched votes to avoid resort on expand */
  initialVotes?: VotesMap;
}

export function ThemePool({
  themes,
  clubId,
  canManage = true,
  themeSubmissionsLocked = false,
  themeVotingEnabled = false,
  variant = "default",
  sortBy: externalSortBy,
  hideSort = false,
  currentUserId,
  showOnlyMine: externalShowOnlyMine,
  initialVotes,
}: ThemePoolProps) {
  const isMinimal = variant === "minimal";
  const [state, formAction, isPending] = useActionState(addTheme, null);
  const [deletingThemeId, setDeletingThemeId] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();
  const [optimisticThemes, setOptimisticThemes] = useState<Theme[]>(themes);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [isUpdating, startUpdating] = useTransition();
  const [isCanceling, setIsCanceling] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const addInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const [internalSortBy, setInternalSortBy] = useState<SortOption>("top");
  const sortBy = externalSortBy ?? internalSortBy;
  const setSortBy = setInternalSortBy;
  const [votes, setVotes] = useState<VotesMap>(initialVotes || {});
  const [_isLoadingVotes, setIsLoadingVotes] = useState(false);
  const [votingThemeId, _setVotingThemeId] = useState<string | null>(null);
  const [hoveredThemeId, setHoveredThemeId] = useState<string | null>(null);
  const [internalShowOnlyMine, setShowOnlyMine] = useState(false);
  const showOnlyMine = externalShowOnlyMine ?? internalShowOnlyMine;
  // State for add movie to theme modal
  const [isAddMovieModalOpen, setIsAddMovieModalOpen] = useState(false);
  const [selectedThemeForMovie, setSelectedThemeForMovie] = useState<string | null>(null);

  // Sync optimistic themes with prop changes
  useEffect(() => {
    setOptimisticThemes(themes);
  }, [themes]);

  // Fetch votes when component mounts or voting enabled changes
  // Skip if initialVotes provided (data already pre-fetched)
  useEffect(() => {
    if (themeVotingEnabled && !initialVotes) {
      loadVotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadVotes is defined below (stable); initialVotes is a prop used only for initial skip check
  }, [themeVotingEnabled, clubId]);

  const loadVotes = async () => {
    setIsLoadingVotes(true);
    const result = await getThemePoolVotes(clubId);
    if (result.data) {
      setVotes(result.data);
    }
    setIsLoadingVotes(false);
  };

  const handleVote = async (themeId: string) => {
    if (!themeVotingEnabled) return;

    // Store current state for rollback
    const previousVote = votes[themeId] || { upvotes: 0, userVote: null };
    const isRemoving = previousVote.userVote === "upvote";

    // Optimistic update - immediately update UI
    setVotes((prev) => ({
      ...prev,
      [themeId]: {
        upvotes: (prev[themeId]?.upvotes || 0) + (isRemoving ? -1 : 1),
        userVote: isRemoving ? null : "upvote",
      },
    }));

    // Server call (no longer passing vote type - it's always upvote toggle)
    const result = await voteOnThemePool(themeId);

    if ("error" in result && result.error) {
      // Revert on error
      setVotes((prev) => ({
        ...prev,
        [themeId]: previousVote,
      }));
      toast.error(result.error);
    }
    // No need to loadVotes() - optimistic state is already correct
  };

  const unusedThemes = optimisticThemes.filter((t) => !t.is_used);

  // Sort unused themes based on sortBy
  const sortedThemes = [...unusedThemes].sort((a, b) => {
    if (sortBy === "new") {
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bDate - aDate;
    } else if (sortBy === "old") {
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      return aDate - bDate;
    } else if (sortBy === "top") {
      const aVotes = votes[a.id]?.upvotes || 0;
      const bVotes = votes[b.id]?.upvotes || 0;
      if (bVotes !== aVotes) {
        return bVotes - aVotes;
      }
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bDate - aDate;
    }
    return 0;
  });

  const filteredThemes =
    showOnlyMine && currentUserId
      ? sortedThemes.filter((t) => t.added_by_user?.id === currentUserId)
      : sortedThemes;

  const setInputRef = (element: HTMLInputElement | null) => {
    inputRef.current = element;
  };

  const handleRemoveClick = (themeId: string) => {
    setDeletingThemeId(themeId);
  };

  const handleConfirmDelete = () => {
    if (!deletingThemeId) return;

    const themeToDelete = optimisticThemes.find((t) => t.id === deletingThemeId);
    if (!themeToDelete) return;

    setOptimisticThemes((prev) => prev.filter((t) => t.id !== deletingThemeId));

    startDeleting(async () => {
      const result = await removeTheme(deletingThemeId, clubId);

      if (result && "error" in result && result.error) {
        setOptimisticThemes((prev) =>
          [...prev, themeToDelete].sort((a, b) => a.theme_name.localeCompare(b.theme_name))
        );
        toast.error(result.error);
        setDeletingThemeId(null);
      } else {
        toast.success("Theme removed");
        setDeletingThemeId(null);
        router.refresh();
      }
    });
  };

  const handleCancelDelete = () => {
    if (!isDeleting) {
      setDeletingThemeId(null);
    }
  };

  const deletingTheme = deletingThemeId
    ? optimisticThemes.find((t) => t.id === deletingThemeId)
    : null;

  function handleEditClick(theme: Theme) {
    setEditingId(theme.id);
    setEditValue(theme.theme_name);
  }

  function handleCancelEdit() {
    setIsCanceling(true);
    setEditingId(null);
    setEditValue("");
    setTimeout(() => setIsCanceling(false), 100);
  }

  async function handleSave(themeId: string) {
    if (isCanceling) return;

    if (!editValue.trim()) {
      toast.error("Theme name cannot be empty");
      return;
    }

    const themeToUpdate = optimisticThemes.find((t) => t.id === themeId);
    const oldName = themeToUpdate?.theme_name;

    if (themeToUpdate) {
      setOptimisticThemes((prev) =>
        prev.map((t) => (t.id === themeId ? { ...t, theme_name: editValue.trim() } : t))
      );
    }

    startUpdating(async () => {
      const result = await updateTheme(themeId, editValue.trim(), clubId);
      if (result && "error" in result && result.error) {
        if (themeToUpdate && oldName) {
          setOptimisticThemes((prev) =>
            prev.map((t) => (t.id === themeId ? { ...t, theme_name: oldName } : t))
          );
        }
        toast.error(result.error);
      } else {
        toast.success("Theme updated");
        setEditingId(null);
        setEditValue("");
        router.refresh();
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, themeId: string) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave(themeId);
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEdit();
    }
  }

  function handleAddMovieClick(themeName: string) {
    setSelectedThemeForMovie(themeName);
    setIsAddMovieModalOpen(true);
  }

  function handleAddMovieModalClose(open: boolean) {
    setIsAddMovieModalOpen(open);
    if (!open) {
      setSelectedThemeForMovie(null);
    }
  }

  // Clear form and append the newly-returned theme on success so the author
  // avatar renders immediately (no fallback flash waiting for revalidation).
  useEffect(() => {
    if (state && "success" in state && state.success) {
      if (addInputRef.current) {
        addInputRef.current.value = "";
      }
      if ("theme" in state && state.theme) {
        const newTheme = state.theme as Theme;
        setOptimisticThemes((prev) =>
          prev.some((t) => t.id === newTheme.id) ? prev : [newTheme, ...prev]
        );
      }
    }
  }, [state]);

  return (
    <div
      className={cn(!isMinimal && "overflow-hidden rounded-lg border")}
      style={
        !isMinimal
          ? {
              background: "var(--surface-1)",
              borderColor: "var(--border)",
            }
          : undefined
      }
    >
      {/* Header with count and sort - hidden in minimal mode */}
      {!isMinimal && (
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Theme Pool
            </h3>
            <span
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{
                background: "var(--surface-2)",
                color: "var(--text-secondary)",
              }}
            >
              {unusedThemes.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {currentUserId && unusedThemes.length > 0 && (
              <button
                onClick={() => setShowOnlyMine((v) => !v)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                  showOnlyMine
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                My Themes
              </button>
            )}
            {themeVotingEnabled && unusedThemes.length > 0 && (
              <div
                className="flex items-center gap-0.5 rounded-md p-0.5"
                style={{ background: "var(--surface-2)" }}
              >
                {(["new", "top", "old"] as SortOption[]).map((sort) => (
                  <button
                    key={sort}
                    onClick={() => setSortBy(sort)}
                    className={cn(
                      "px-2 py-1 text-xs font-medium rounded transition-colors capitalize",
                      sortBy === sort
                        ? "bg-[var(--background)] text-[var(--text-primary)] shadow-sm"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {sort}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Minimal mode sort controls - hidden if hideSort is true */}
      {isMinimal && !hideSort && themeVotingEnabled && unusedThemes.length > 0 && (
        <div className="flex items-center justify-end mb-2">
          <div
            className="flex items-center gap-0.5 rounded-md p-0.5"
            style={{ background: "var(--surface-1)/50" }}
          >
            {(["new", "top", "old"] as SortOption[]).map((sort) => (
              <button
                key={sort}
                onClick={() => setSortBy(sort)}
                className={cn(
                  "px-2 py-1 text-xs font-medium rounded transition-colors capitalize",
                  sortBy === sort
                    ? "bg-[var(--surface-2)] text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {sort}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Theme list - scrollable */}
      <div
        className={cn("overflow-y-auto", isMinimal ? "max-h-[320px]" : "max-h-[280px]")}
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "var(--border) transparent",
        }}
      >
        {unusedThemes.length === 0 ? (
          <div className={cn("text-center", isMinimal ? "py-4" : "px-4 py-8")}>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No themes yet
            </p>
          </div>
        ) : (
          <>
            <div
              className={cn(!isMinimal && "divide-y")}
              style={!isMinimal ? { borderColor: "var(--border)" } : undefined}
            >
              {filteredThemes.map((theme) => {
                const themeVotes = votes[theme.id] || { upvotes: 0, userVote: null };
                const isVoting = votingThemeId === theme.id;
                const isHovered = hoveredThemeId === theme.id;
                const isEditing = editingId === theme.id;
                const isOwnTheme = theme.added_by_user?.id === currentUserId;
                // Can edit/delete if own theme or admin
                const canEditDelete = isOwnTheme || canManage;

                return (
                  <motion.div
                    key={theme.id}
                    layout
                    transition={{
                      layout: {
                        type: "spring",
                        stiffness: 500,
                        damping: 35,
                      },
                    }}
                    className={cn(
                      "group flex items-start gap-2 transition-colors",
                      isMinimal ? "px-2 py-2 rounded-lg mb-1" : "px-3 py-2",
                      isHovered &&
                        (isMinimal ? "bg-[var(--surface-1)]/60" : "bg-[var(--surface-2)]")
                    )}
                    style={!isMinimal ? { borderColor: "var(--border)" } : undefined}
                    onMouseEnter={() => setHoveredThemeId(theme.id)}
                    onMouseLeave={() => setHoveredThemeId(null)}
                  >
                    {/* Upvote button */}
                    {themeVotingEnabled && (
                      <UpvoteButton
                        count={themeVotes.upvotes}
                        isVoted={themeVotes.userVote === "upvote"}
                        onVote={() => handleVote(theme.id)}
                        disabled={isVoting}
                        size="sm"
                      />
                    )}

                    {/* Theme name or edit input */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <>
                          <input
                            ref={setInputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSave(theme.id)}
                            onKeyDown={(e) => handleKeyDown(e, theme.id)}
                            disabled={isUpdating}
                            maxLength={50}
                            aria-label={`Edit theme name`}
                            className="w-full text-base rounded px-2 py-1 border transition-all focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:border-[var(--primary)]"
                            style={{
                              borderColor: "var(--border)",
                              background: "var(--surface-1)",
                              color: "var(--text-primary)",
                            }}
                          />
                          {/* Edit mode actions */}
                          {canEditDelete && (
                            <div className="flex items-center justify-end mt-1">
                              <button
                                onClick={handleCancelEdit}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setIsCanceling(true);
                                }}
                                disabled={isUpdating}
                                className="text-xs px-2 py-1 rounded hover:bg-[var(--surface-3)] transition-colors"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="min-w-0">
                          <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                            {theme.theme_name}
                          </span>
                          {/* Metadata row with action buttons */}
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="text-xs truncate"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {theme.added_by_user?.display_name ||
                                theme.added_by_user?.username ||
                                "Unknown"}
                              {theme.created_at && <> · {formatRelativeTime(theme.created_at)}</>}
                            </span>
                            {/* Action buttons - slide in on hover (desktop), always visible (mobile) */}
                            <div
                              className={cn(
                                "flex items-center gap-0.5 transition-all duration-200 ease-out",
                                // Mobile: always visible (base state)
                                "translate-x-0 opacity-100",
                                // Desktop (hover-capable): hidden by default, slide in on group hover
                                "[@media(hover:hover)]:translate-x-2 [@media(hover:hover)]:opacity-0",
                                "[@media(hover:hover)]:group-hover:translate-x-0 [@media(hover:hover)]:group-hover:opacity-100"
                              )}
                            >
                              {/* Link to future nominations - visible for own themes */}
                              {isOwnTheme && (
                                <button
                                  onClick={() => handleAddMovieClick(theme.theme_name)}
                                  aria-label={`Save movie for theme: ${theme.theme_name}`}
                                  className="p-1 rounded hover:bg-[var(--primary)]/10 transition-colors"
                                  style={{ color: "var(--primary)" }}
                                  title="Save a movie for this theme"
                                >
                                  <Link className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {canEditDelete && (
                                <>
                                  <button
                                    onClick={() => handleEditClick(theme)}
                                    aria-label={`Edit theme`}
                                    className="p-1 rounded hover:bg-[var(--surface-3)] transition-colors"
                                    style={{ color: "var(--text-secondary)" }}
                                  >
                                    <PencilSimple className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveClick(theme.id)}
                                    disabled={isDeleting && deletingThemeId === theme.id}
                                    aria-label={`Remove theme`}
                                    className="p-1 rounded hover:bg-[var(--error)]/10 transition-colors disabled:opacity-50"
                                    style={{ color: "var(--error)" }}
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Add theme form - compact footer */}
      {canManage && (
        <div
          className={cn(isMinimal ? "pt-2 pb-1" : "border-t px-3 py-2")}
          style={!isMinimal ? { borderColor: "var(--border)" } : undefined}
        >
          {themeSubmissionsLocked ? (
            <div
              className="flex items-center gap-2 text-xs py-1"
              style={{ color: "var(--warning)" }}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Submissions locked</span>
            </div>
          ) : (
            <form action={formAction} className="relative">
              <input type="hidden" name="clubId" value={clubId} />
              <input
                ref={addInputRef}
                name="themeName"
                type="text"
                required
                disabled={isPending}
                maxLength={50}
                placeholder="Add a theme..."
                aria-label="Theme name"
                className="w-full text-sm rounded-sm px-2 py-1.5 pr-9 border border-[var(--border)] transition-all outline-none focus:border-[var(--text-muted)] bg-transparent text-[var(--text-primary)]"
              />
              <button
                type="submit"
                disabled={isPending}
                aria-label="Add theme"
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded transition-colors text-[var(--club-accent,var(--primary))] hover:opacity-80 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          )}
          {state && "error" in state && state.error && (
            <p className="text-xs mt-1" style={{ color: "var(--error)" }}>
              {state.error}
            </p>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={deletingThemeId !== null}
        onOpenChange={handleCancelDelete}
        title="Remove Theme"
        description="Are you sure you want to remove this theme from the pool?"
        size="md"
      >
        <div className="space-y-4">
          <div
            className="rounded-md p-3 border"
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              borderColor: "rgba(239, 68, 68, 0.3)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>
              <span style={{ color: "var(--error)" }}>This cannot be undone.</span>
              {deletingTheme && (
                <span className="block mt-1">
                  Theme: <strong>{deletingTheme.theme_name}</strong>
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCancelDelete}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              isLoading={isDeleting}
            >
              Remove
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Movie to Theme Modal */}
      <AddMovieToThemeModal
        open={isAddMovieModalOpen}
        onOpenChange={handleAddMovieModalClose}
        themeName={selectedThemeForMovie || ""}
        clubId={clubId}
        onSuccess={() => {
          // Success toast is handled in the modal itself
        }}
      />
    </div>
  );
}

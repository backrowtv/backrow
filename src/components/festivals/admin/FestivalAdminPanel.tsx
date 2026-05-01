"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  CaretDown,
  CaretUp,
  CaretRight,
  CaretLeft,
  Gear,
  Warning,
  PencilSimple,
  UserMinus,
  FilmReel,
  Check,
  CircleNotch,
  X,
  Star,
  Question,
} from "@phosphor-icons/react";
import { advanceFestivalPhase, revertFestivalPhase, cancelFestival } from "@/app/actions/festivals";
import {
  removeMemberFromFestival,
  removeMovieFromFestival,
  updateFestivalTheme,
  adminOverrideRating,
  adminOverrideGuess,
} from "@/app/actions/admin-festival";
import toast from "react-hot-toast";

type FestivalPhase = "theme_selection" | "nomination" | "watch_rate" | "results";

interface Member {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface Nomination {
  id: string;
  tmdb_id: number;
  user_id: string;
  movie_title: string | null;
  nominator_name: string | null;
}

interface FestivalAdminPanelProps {
  festivalId: string;
  clubId: string;
  clubSlug: string;
  festivalSlug: string;
  currentPhase: FestivalPhase;
  theme: string | null;
  status: string;
  members: Member[];
  nominations: Nomination[];
  hasTheme?: boolean;
  nominationCount?: number;
  userRole: "producer" | "director";
  guessingEnabled?: boolean;
}

const PHASE_LABELS: Record<FestivalPhase, string> = {
  theme_selection: "Theme Selection",
  nomination: "Nominations",
  watch_rate: "Watch & Rate",
  results: "Results",
};

const PHASE_ORDER: FestivalPhase[] = ["theme_selection", "nomination", "watch_rate", "results"];

function getNextPhase(current: FestivalPhase): FestivalPhase | null {
  const index = PHASE_ORDER.indexOf(current);
  return index < PHASE_ORDER.length - 1 ? PHASE_ORDER[index + 1] : null;
}

function getPrevPhase(current: FestivalPhase): FestivalPhase | null {
  const index = PHASE_ORDER.indexOf(current);
  return index > 0 ? PHASE_ORDER[index - 1] : null;
}

export function FestivalAdminPanel({
  festivalId,
  clubId: _clubId,
  clubSlug,
  festivalSlug,
  currentPhase,
  theme,
  status: _status,
  members,
  nominations,
  hasTheme: _hasTheme = false,
  nominationCount: _nominationCount = 0,
  userRole,
  guessingEnabled = false,
}: FestivalAdminPanelProps) {
  // Role-aware title
  const controlsTitle = userRole === "producer" ? "Producer Controls" : "Director Controls";
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Theme editing
  const [isEditingTheme, setIsEditingTheme] = useState(false);
  const [newTheme, setNewTheme] = useState(theme || "");

  // Dialogs
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showRemoveMemberConfirm, setShowRemoveMemberConfirm] = useState(false);
  const [showRemoveMovieConfirm, setShowRemoveMovieConfirm] = useState(false);
  const [showAdvanceConfirm, setShowAdvanceConfirm] = useState(false);
  const [showForceAdvanceConfirm, setShowForceAdvanceConfirm] = useState(false);
  const [showForceRevertConfirm, setShowForceRevertConfirm] = useState(false);

  // Selections
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [selectedNominationId, setSelectedNominationId] = useState<string>("");

  // Rating override
  const [showRatingOverride, setShowRatingOverride] = useState(false);
  const [overrideUserId, setOverrideUserId] = useState<string>("");
  const [overrideNominationId, setOverrideNominationId] = useState<string>("");
  const [overrideRating, setOverrideRating] = useState<string>("");

  // Guess override
  const [showGuessOverride, setShowGuessOverride] = useState(false);
  const [guessOverrideUserId, setGuessOverrideUserId] = useState<string>("");
  const [guessOverrideNominationId, setGuessOverrideNominationId] = useState<string>("");
  const [guessOverrideGuessedUserId, setGuessOverrideGuessedUserId] = useState<string>("");

  const nextPhase = getNextPhase(currentPhase);
  const prevPhase = getPrevPhase(currentPhase);
  const selectedMember = members.find((m) => m.user_id === selectedMemberId);
  const selectedNomination = nominations.find((n) => n.id === selectedNominationId);

  const handleAdvancePhase = () => {
    startTransition(async () => {
      const result = await advanceFestivalPhase(festivalId);
      if ("error" in result && result.error) {
        // If advance fails due to requirements, swap to the force dialog
        if (
          result.error.includes("required") ||
          result.error.includes("nomination") ||
          result.error.includes("theme") ||
          result.error.includes("rating")
        ) {
          setShowAdvanceConfirm(false);
          setShowForceAdvanceConfirm(true);
        } else {
          toast.error(result.error);
        }
      } else {
        toast.success(`Advanced to ${PHASE_LABELS[nextPhase!]}`);
        setShowAdvanceConfirm(false);
        router.refresh();
      }
    });
  };

  // Kept for potential future use - currently UI only offers force revert via dialog
  const _handleRevertPhase = () => {
    startTransition(async () => {
      const result = await revertFestivalPhase(festivalId);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Reverted to ${PHASE_LABELS[prevPhase!]}`);
        router.refresh();
      }
    });
  };
  void _handleRevertPhase; // Suppress unused warning

  const handleForceAdvancePhase = () => {
    startTransition(async () => {
      const result = await advanceFestivalPhase(festivalId, true);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Force advanced to ${PHASE_LABELS[nextPhase!]}`);
        setShowForceAdvanceConfirm(false);
        router.refresh();
      }
    });
  };

  const handleForceRevertPhase = () => {
    startTransition(async () => {
      const result = await revertFestivalPhase(festivalId, { force: true });
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Force reverted to ${PHASE_LABELS[prevPhase!]}`);
        setShowForceRevertConfirm(false);
        router.refresh();
      }
    });
  };

  const handleCancelFestival = () => {
    startTransition(async () => {
      const result = await cancelFestival(festivalId);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Festival cancelled");
        setShowCancelConfirm(false);
        router.push(`/club/${clubSlug}`);
      }
    });
  };

  const handleSaveTheme = () => {
    if (!newTheme.trim()) {
      toast.error("Theme cannot be empty");
      return;
    }

    startTransition(async () => {
      const result = await updateFestivalTheme(festivalId, newTheme.trim());
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Theme updated");
        setIsEditingTheme(false);
        if (result.newSlug && result.newSlug !== festivalSlug) {
          router.replace(`/club/${clubSlug}/festival/${result.newSlug}`);
        } else {
          router.refresh();
        }
      }
    });
  };

  const handleRemoveMember = () => {
    if (!selectedMemberId) return;

    startTransition(async () => {
      const result = await removeMemberFromFestival(festivalId, selectedMemberId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Member removed from festival");
        setShowRemoveMemberConfirm(false);
        setSelectedMemberId("");
        router.refresh();
      }
    });
  };

  const handleRemoveMovie = () => {
    if (!selectedNominationId) return;

    startTransition(async () => {
      const result = await removeMovieFromFestival(festivalId, selectedNominationId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Movie removed from festival");
        setShowRemoveMovieConfirm(false);
        setSelectedNominationId("");
        router.refresh();
      }
    });
  };

  const handleOverrideRating = () => {
    if (!overrideUserId || !overrideNominationId || !overrideRating) {
      toast.error("Please fill in all fields");
      return;
    }

    const ratingValue = parseFloat(overrideRating);
    if (isNaN(ratingValue) || ratingValue < 0 || ratingValue > 10) {
      toast.error("Rating must be between 0 and 10");
      return;
    }

    startTransition(async () => {
      const result = await adminOverrideRating(
        festivalId,
        overrideUserId,
        overrideNominationId,
        ratingValue
      );
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Rating updated");
        setShowRatingOverride(false);
        setOverrideUserId("");
        setOverrideNominationId("");
        setOverrideRating("");
        router.refresh();
      }
    });
  };

  const handleOverrideGuess = () => {
    if (!guessOverrideUserId || !guessOverrideNominationId || !guessOverrideGuessedUserId) {
      toast.error("Please fill in all fields");
      return;
    }

    startTransition(async () => {
      const result = await adminOverrideGuess(
        festivalId,
        guessOverrideUserId,
        guessOverrideNominationId,
        guessOverrideGuessedUserId
      );
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Guess updated");
        setShowGuessOverride(false);
        setGuessOverrideUserId("");
        setGuessOverrideNominationId("");
        setGuessOverrideGuessedUserId("");
        router.refresh();
      }
    });
  };

  return (
    <Card variant="default" className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Gear className="w-4 h-4 text-[var(--text-muted)]" />
          {controlsTitle}
        </CardTitle>
      </CardHeader>

      {/* Phase Controls — always visible */}
      <CardContent className="space-y-3 pb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Phase Controls
        </h4>
        <div className="flex gap-2">
          {prevPhase ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForceRevertConfirm(true)}
              disabled={isPending}
              className="flex-1 text-[11px] whitespace-nowrap"
            >
              <CaretLeft className="w-3.5 h-3.5 mr-1.5" />
              Revert Phase
            </Button>
          ) : (
            <div className="flex-1" />
          )}
          {nextPhase ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAdvanceConfirm(true)}
              disabled={isPending}
              className="flex-1 text-[11px] whitespace-nowrap"
            >
              {isPending && <CircleNotch className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Advance Phase
              <CaretRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          ) : (
            <div className="flex-1 text-xs text-[var(--text-muted)] text-center">
              Festival complete
            </div>
          )}
        </div>
        <p className="text-[10px] text-[var(--text-muted)]">
          Current phase: <span className="font-medium">{PHASE_LABELS[currentPhase]}</span>
        </p>
      </CardContent>

      {/* Expandable: Festival Management & more */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-center gap-1.5 py-1 cursor-pointer hover:bg-[var(--surface-2)] transition-colors border-t border-[var(--border)]">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              {isOpen ? "Hide" : "Show"} Management
            </span>
            {isOpen ? (
              <CaretUp className="w-3 h-3 text-[var(--text-muted)]" />
            ) : (
              <CaretDown className="w-3 h-3 text-[var(--text-muted)]" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-3">
            {/* Festival Management */}
            <div className="space-y-3 pt-3 border-t border-[var(--border)]">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Festival Management
              </h4>

              {/* Theme Editing */}
              <div className="space-y-2">
                <Label className="text-xs">Theme</Label>
                {isEditingTheme ? (
                  <div className="flex gap-2">
                    <Input
                      value={newTheme}
                      onChange={(e) => setNewTheme(e.target.value)}
                      placeholder="Enter theme..."
                      className="h-8 text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveTheme}
                      disabled={isPending}
                      className="h-8 px-2"
                    >
                      {isPending ? (
                        <CircleNotch className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsEditingTheme(false);
                        setNewTheme(theme || "");
                      }}
                      className="h-8 px-2"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--text-primary)]">
                      {theme || "No theme set"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingTheme(true)}
                      className="h-6 px-2 text-xs"
                    >
                      <PencilSimple className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                )}
              </div>

              {/* Cancel Festival */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelConfirm(true)}
                className="text-xs text-[var(--error)] hover:opacity-80 hover:bg-[var(--error)]/10 border-[var(--error)]/30"
              >
                <Warning className="w-3.5 h-3.5 mr-1.5" />
                Cancel Festival
              </Button>
            </div>

            {/* Member Management */}
            <div className="space-y-3 pt-3 border-t border-[var(--border)]">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Member Management
              </h4>

              <div className="space-y-2">
                <Label className="text-xs">Remove Member from Festival</Label>
                <div className="flex gap-2">
                  <Select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="h-8 text-sm flex-1"
                  >
                    <option value="">Select a member...</option>
                    {members.map((member) => (
                      <option key={member.user_id} value={member.user_id}>
                        {member.display_name || member.username || "Unknown"}
                      </option>
                    ))}
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectedMemberId && setShowRemoveMemberConfirm(true)}
                    disabled={!selectedMemberId || isPending}
                    className="h-8 px-3 text-xs text-[var(--error)] hover:opacity-80 hover:bg-[var(--error)]/10"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <p className="text-[10px] text-[var(--text-muted)]">
                  This removes their nomination and all their ratings from this festival
                </p>
              </div>
            </div>

            {/* Nomination Management */}
            {nominations.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-[var(--border)]">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Nomination Management
                </h4>

                <div className="space-y-2">
                  <Label className="text-xs">Remove Movie from Festival</Label>
                  <div className="flex gap-2">
                    <Select
                      value={selectedNominationId}
                      onChange={(e) => setSelectedNominationId(e.target.value)}
                      className="h-8 text-sm flex-1"
                    >
                      <option value="">Select a movie...</option>
                      {nominations.map((nom) => (
                        <option key={nom.id} value={nom.id}>
                          {nom.movie_title || "Unknown"} (by {nom.nominator_name || "Unknown"})
                        </option>
                      ))}
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectedNominationId && setShowRemoveMovieConfirm(true)}
                      disabled={!selectedNominationId || isPending}
                      className="h-8 px-3 text-xs text-[var(--error)] hover:opacity-80 hover:bg-[var(--error)]/10"
                    >
                      <FilmReel className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    This removes the movie and all ratings/guesses for it
                  </p>
                </div>
              </div>
            )}

            {/* Rating Override */}
            <Collapsible open={showRatingOverride} onOpenChange={setShowRatingOverride}>
              <div className="pt-3 border-t border-[var(--border)]">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between text-xs h-8">
                    <span className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5" />
                      Rating Override
                    </span>
                    {showRatingOverride ? (
                      <CaretUp className="w-3.5 h-3.5" />
                    ) : (
                      <CaretDown className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-3 space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">User</Label>
                    <Select
                      value={overrideUserId}
                      onChange={(e) => setOverrideUserId(e.target.value)}
                      className="h-8 text-sm"
                    >
                      <option value="">Select a user...</option>
                      {members.map((member) => (
                        <option key={member.user_id} value={member.user_id}>
                          {member.display_name || member.username || "Unknown"}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Movie</Label>
                    <Select
                      value={overrideNominationId}
                      onChange={(e) => setOverrideNominationId(e.target.value)}
                      className="h-8 text-sm"
                    >
                      <option value="">Select a movie...</option>
                      {nominations.map((nom) => (
                        <option key={nom.id} value={nom.id}>
                          {nom.movie_title || "Unknown"}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">New Rating (0-10)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={overrideRating}
                      onChange={(e) => setOverrideRating(e.target.value)}
                      placeholder="e.g., 7.5"
                      className="h-8 text-sm"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOverrideRating}
                    disabled={
                      isPending || !overrideUserId || !overrideNominationId || !overrideRating
                    }
                    className="w-full text-xs"
                  >
                    {isPending ? (
                      <CircleNotch className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Apply Rating Override
                  </Button>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Guess Override - only show if guessing is enabled */}
            {guessingEnabled && nominations.length > 0 && (
              <Collapsible open={showGuessOverride} onOpenChange={setShowGuessOverride}>
                <div className="pt-3 border-t border-[var(--border)]">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between text-xs h-8"
                    >
                      <span className="flex items-center gap-1.5">
                        <Question className="w-3.5 h-3.5" />
                        Guess Override
                      </span>
                      {showGuessOverride ? (
                        <CaretUp className="w-3.5 h-3.5" />
                      ) : (
                        <CaretDown className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs">User (whose guess to override)</Label>
                      <Select
                        value={guessOverrideUserId}
                        onChange={(e) => setGuessOverrideUserId(e.target.value)}
                        className="h-8 text-sm"
                      >
                        <option value="">Select a user...</option>
                        {members.map((member) => (
                          <option key={member.user_id} value={member.user_id}>
                            {member.display_name || member.username || "Unknown"}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Movie (they&apos;re guessing for)</Label>
                      <Select
                        value={guessOverrideNominationId}
                        onChange={(e) => setGuessOverrideNominationId(e.target.value)}
                        className="h-8 text-sm"
                      >
                        <option value="">Select a movie...</option>
                        {nominations.map((nom) => (
                          <option key={nom.id} value={nom.id}>
                            {nom.movie_title || "Unknown"}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Guessed Nominator</Label>
                      <Select
                        value={guessOverrideGuessedUserId}
                        onChange={(e) => setGuessOverrideGuessedUserId(e.target.value)}
                        className="h-8 text-sm"
                      >
                        <option value="">Select who they guessed...</option>
                        {members.map((member) => (
                          <option key={member.user_id} value={member.user_id}>
                            {member.display_name || member.username || "Unknown"}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOverrideGuess}
                      disabled={
                        isPending ||
                        !guessOverrideUserId ||
                        !guessOverrideNominationId ||
                        !guessOverrideGuessedUserId
                      }
                      className="w-full text-xs"
                    >
                      {isPending ? (
                        <CircleNotch className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Apply Guess Override
                    </Button>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="Cancel Festival?"
        description="Are you sure you want to cancel this festival? This action cannot be undone and all nominations, ratings, and results will be lost."
        confirmText="Cancel Festival"
        onConfirm={handleCancelFestival}
        variant="danger"
        isLoading={isPending}
      />

      <ConfirmationDialog
        open={showRemoveMemberConfirm}
        onOpenChange={setShowRemoveMemberConfirm}
        title="Remove Member from Festival?"
        description={
          <span>
            Are you sure you want to remove{" "}
            <strong>
              {selectedMember?.display_name || selectedMember?.username || "this member"}
            </strong>{" "}
            from this festival?
            <br />
            This will:
            <ul className="list-disc list-inside mt-2 text-sm">
              <li>Remove their nomination (if any)</li>
              <li>Remove all their ratings</li>
              <li>Recalculate festival results</li>
            </ul>
          </span>
        }
        confirmText="Remove Member"
        onConfirm={handleRemoveMember}
        variant="danger"
        isLoading={isPending}
      />

      <ConfirmationDialog
        open={showRemoveMovieConfirm}
        onOpenChange={setShowRemoveMovieConfirm}
        title="Remove Movie from Festival?"
        description={
          <span>
            Are you sure you want to remove{" "}
            <strong>{selectedNomination?.movie_title || "this movie"}</strong> from this festival?
            <br />
            This will:
            <ul className="list-disc list-inside mt-2 text-sm">
              <li>Remove the nomination</li>
              <li>Remove all ratings for this movie</li>
              <li>Recalculate festival results</li>
            </ul>
          </span>
        }
        confirmText="Remove Movie"
        onConfirm={handleRemoveMovie}
        variant="danger"
        isLoading={isPending}
      />

      <ConfirmationDialog
        open={showAdvanceConfirm}
        onOpenChange={setShowAdvanceConfirm}
        title="Advance Phase?"
        description={
          <span>
            Move this festival to{" "}
            <strong>{nextPhase ? PHASE_LABELS[nextPhase] : "the next phase"}</strong>? Members will
            be notified. You can revert from this panel if needed.
          </span>
        }
        confirmText="Advance Phase"
        onConfirm={handleAdvancePhase}
        isLoading={isPending}
      />

      <ConfirmationDialog
        open={showForceAdvanceConfirm}
        onOpenChange={setShowForceAdvanceConfirm}
        title="Force Advance Phase?"
        description={
          <span>
            Are you sure you want to force advance to{" "}
            <strong>{nextPhase ? PHASE_LABELS[nextPhase] : "next phase"}</strong>?
            <br />
            This will skip the following validation checks:
            <ul className="list-disc list-inside mt-2 text-sm">
              {currentPhase === "theme_selection" && <li>Theme selection requirement</li>}
              {currentPhase === "nomination" && (
                <>
                  <li>Minimum nomination requirement</li>
                  <li>Guessing minimum (if enabled)</li>
                </>
              )}
              {currentPhase === "watch_rate" && <li>Minimum rating requirement</li>}
            </ul>
          </span>
        }
        confirmText="Force Advance"
        onConfirm={handleForceAdvancePhase}
        variant="danger"
        isLoading={isPending}
      />

      <ConfirmationDialog
        open={showForceRevertConfirm}
        onOpenChange={setShowForceRevertConfirm}
        title="Force Revert Phase?"
        description={
          <span>
            Are you sure you want to force revert to{" "}
            <strong>{prevPhase ? PHASE_LABELS[prevPhase] : "previous phase"}</strong>?
            <br />
            This action may affect existing data:
            <ul className="list-disc list-inside mt-2 text-sm">
              {currentPhase === "results" && <li>Cached results will be deleted</li>}
              {currentPhase === "watch_rate" && <li>Ratings may become orphaned</li>}
              {currentPhase === "nomination" && <li>Nominations may become orphaned</li>}
            </ul>
          </span>
        }
        confirmText="Force Revert"
        onConfirm={handleForceRevertPhase}
        variant="danger"
        isLoading={isPending}
      />
    </Card>
  );
}

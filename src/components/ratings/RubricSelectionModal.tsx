"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { RubricEditor } from "./RubricEditor";
import type { RatingRubric, RubricEnforcement } from "@/types/club-settings";
import { PRESET_RUBRICS, createRubricsFromPreset } from "@/types/club-settings";
import { getUserRubrics, createRubric, lockFestivalRubric } from "@/app/actions/rubrics";
import type { UserRubric } from "@/app/actions/rubrics.types";
import toast from "react-hot-toast";
import { Scales, Plus, Star, CaretRight, Warning, Buildings, User } from "@phosphor-icons/react";

type ViewState = "choose" | "select-personal" | "create-new" | "use-club";

interface RubricSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  festivalId: string;
  festivalName?: string;
  clubName?: string;
  // Club rubric info
  clubRubricEnforcement: RubricEnforcement;
  clubRubricCategories?: RatingRubric[];
  clubRubricName?: string;
  // Callback when selection is complete
  onSelectionComplete: (selection: {
    rubricId?: string;
    rubricSnapshot?: { name: string; categories: RatingRubric[] };
    useClubRubric: boolean;
    optedOut: boolean;
  }) => void;
}

export function RubricSelectionModal({
  open,
  onOpenChange,
  festivalId,
  festivalName,
  clubName,
  clubRubricEnforcement,
  clubRubricCategories,
  clubRubricName,
  onSelectionComplete,
}: RubricSelectionModalProps) {
  const [view, setView] = useState<ViewState>("choose");
  const [userRubrics, setUserRubrics] = useState<UserRubric[]>([]);
  const [selectedRubric, setSelectedRubric] = useState<UserRubric | null>(null);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [loadingRubrics, setLoadingRubrics] = useState(false);

  // Create new rubric state
  const [newRubricName, setNewRubricName] = useState("");
  const [newRubricCategories, setNewRubricCategories] = useState<RatingRubric[]>([]);
  const [showPresets, setShowPresets] = useState(false);

  const [isPending, startTransition] = useTransition();

  // Load user's rubrics when modal opens
  useEffect(() => {
    if (open && view === "select-personal") {
      setLoadingRubrics(true);
      getUserRubrics().then((result) => {
        if (result.data) {
          setUserRubrics(result.data);
          // Auto-select default if exists
          const defaultRubric = result.data.find((r) => r.is_default);
          if (defaultRubric) {
            setSelectedRubric(defaultRubric);
          }
        }
        setLoadingRubrics(false);
      });
    }
  }, [open, view]);

  const handleUseClubRubric = useCallback(() => {
    if (!clubRubricCategories || clubRubricCategories.length === 0) {
      toast.error("Club has no rubric configured");
      return;
    }

    startTransition(async () => {
      const result = await lockFestivalRubric(festivalId, {
        useClubRubric: true,
        dontAskAgain,
      });

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        onSelectionComplete({
          useClubRubric: true,
          optedOut: false,
          rubricSnapshot: {
            name: clubRubricName || "Club Rubric",
            categories: clubRubricCategories,
          },
        });
        onOpenChange(false);
      }
    });
  }, [
    clubRubricCategories,
    festivalId,
    dontAskAgain,
    clubRubricName,
    onSelectionComplete,
    onOpenChange,
  ]);

  // If club requires their rubric, auto-select it
  useEffect(() => {
    if (open && clubRubricEnforcement === "required") {
      handleUseClubRubric();
    }
  }, [open, clubRubricEnforcement, handleUseClubRubric]);

  const handleSelectPersonalRubric = () => {
    if (!selectedRubric) {
      toast.error("Please select a rubric");
      return;
    }

    startTransition(async () => {
      const result = await lockFestivalRubric(festivalId, {
        rubricId: selectedRubric.id,
        dontAskAgain,
      });

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        onSelectionComplete({
          rubricId: selectedRubric.id,
          useClubRubric: false,
          optedOut: false,
          rubricSnapshot: {
            name: selectedRubric.name,
            categories: selectedRubric.categories,
          },
        });
        onOpenChange(false);
      }
    });
  };

  const handleCreateAndUse = () => {
    const totalWeight = newRubricCategories.reduce((sum, c) => sum + c.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      toast.error("Category weights must total 100%");
      return;
    }

    if (!newRubricName.trim()) {
      toast.error("Rubric name is required");
      return;
    }

    if (newRubricCategories.some((c) => !c.name.trim())) {
      toast.error("All categories must have a name");
      return;
    }

    startTransition(async () => {
      // First create the rubric
      const createResult = await createRubric(
        newRubricName,
        newRubricCategories,
        userRubrics.length === 0 // Set as default if first rubric
      );

      if (createResult.error || !createResult.data) {
        toast.error(createResult.error || "Failed to create rubric");
        return;
      }

      // Then lock it for the festival
      const lockResult = await lockFestivalRubric(festivalId, {
        rubricId: createResult.data.id,
        dontAskAgain,
      });

      if (lockResult.error) {
        toast.error(lockResult.error);
      } else {
        onSelectionComplete({
          rubricId: createResult.data.id,
          useClubRubric: false,
          optedOut: false,
          rubricSnapshot: {
            name: createResult.data.name,
            categories: createResult.data.categories,
          },
        });
        onOpenChange(false);
        toast.success("Rubric created and selected!");
      }
    });
  };

  const handleOptOut = () => {
    startTransition(async () => {
      const result = await lockFestivalRubric(festivalId, {
        optOut: true,
        dontAskAgain,
      });

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        onSelectionComplete({
          useClubRubric: false,
          optedOut: true,
        });
        onOpenChange(false);
      }
    });
  };

  const handleLoadPreset = (presetId: string) => {
    const preset = PRESET_RUBRICS.find((p) => p.id === presetId);
    if (!preset) return;

    setNewRubricName(preset.name);
    setNewRubricCategories(createRubricsFromPreset(preset));
    setShowPresets(false);
  };

  // Render different views
  const renderContent = () => {
    // If club requires their rubric, show locked message
    if (clubRubricEnforcement === "required") {
      return (
        <div className="space-y-4">
          <div
            className="p-4 rounded-lg flex items-start gap-3"
            style={{ backgroundColor: "var(--warning)/10" }}
          >
            <Warning className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: "var(--warning)" }} />
            <div>
              <Text size="sm" className="font-medium">
                Club Rubric Required
              </Text>
              <Text size="sm" muted className="mt-1">
                {clubName} requires all members to use the club&apos;s rating rubric for this
                festival.
              </Text>
            </div>
          </div>

          {clubRubricCategories && clubRubricCategories.length > 0 && (
            <div
              className="p-3 rounded-lg border"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-1)" }}
            >
              <Text size="sm" className="font-medium mb-2">
                {clubRubricName || "Club Rubric"}
              </Text>
              <div className="flex flex-wrap gap-1">
                {clubRubricCategories.map((c) => (
                  <span
                    key={c.id}
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: "var(--surface-2)", color: "var(--text-muted)" }}
                  >
                    {c.name} ({c.weight}%)
                  </span>
                ))}
              </div>
            </div>
          )}

          <Button
            variant="primary"
            className="w-full"
            onClick={handleUseClubRubric}
            disabled={isPending}
          >
            {isPending ? "Confirming..." : "Continue with Club Rubric"}
          </Button>
        </div>
      );
    }

    switch (view) {
      case "choose":
        return (
          <div className="space-y-4">
            <Text size="sm" muted className="text-center">
              How would you like to rate movies in {festivalName || "this festival"}?
            </Text>

            <div className="space-y-2">
              {/* Use Personal Rubric */}
              <button
                onClick={() => setView("select-personal")}
                className="w-full p-4 rounded-lg border text-left transition-colors hover:border-[var(--primary)] hover:bg-[var(--surface-1)]"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "var(--primary)/10" }}
                  >
                    <User className="h-5 w-5" style={{ color: "var(--primary)" }} />
                  </div>
                  <div className="flex-1">
                    <Text className="font-medium">Use My Rubric</Text>
                    <Text size="tiny" muted>
                      Select from your personal rubric library
                    </Text>
                  </div>
                  <CaretRight className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                </div>
              </button>

              {/* Use Club Rubric (if available and suggested) */}
              {clubRubricEnforcement === "suggested" &&
                clubRubricCategories &&
                clubRubricCategories.length > 0 && (
                  <button
                    onClick={() => setView("use-club")}
                    className="w-full p-4 rounded-lg border text-left transition-colors hover:border-[var(--primary)] hover:bg-[var(--surface-1)]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: "var(--surface-2)" }}
                      >
                        <Buildings className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Text className="font-medium">Use Club Rubric</Text>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: "var(--primary)/10",
                              color: "var(--primary)",
                            }}
                          >
                            Suggested
                          </span>
                        </div>
                        <Text size="tiny" muted>
                          {clubRubricName || clubName}&apos;s recommended rubric
                        </Text>
                      </div>
                      <CaretRight className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                    </div>
                  </button>
                )}

              {/* Create New Rubric */}
              <button
                onClick={() => setView("create-new")}
                className="w-full p-4 rounded-lg border text-left transition-colors hover:border-[var(--primary)] hover:bg-[var(--surface-1)]"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "var(--surface-2)" }}
                  >
                    <Plus className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                  </div>
                  <div className="flex-1">
                    <Text className="font-medium">Create New Rubric</Text>
                    <Text size="tiny" muted>
                      Build a custom rubric for this festival
                    </Text>
                  </div>
                  <CaretRight className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                </div>
              </button>

              {/* Simple Rating (opt out) */}
              <button
                type="button"
                aria-label="Use simple rating instead"
                onClick={handleOptOut}
                disabled={isPending}
                className="w-full p-4 rounded-lg border text-left transition-colors hover:border-[var(--border)] hover:bg-[var(--surface-1)]"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "var(--surface-2)" }}
                  >
                    <Scales className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                  </div>
                  <div className="flex-1">
                    <Text className="font-medium">Simple Rating</Text>
                    <Text size="tiny" muted>
                      Just use a single score, no categories
                    </Text>
                  </div>
                </div>
              </button>
            </div>

            {/* Don't ask again */}
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="dont-ask-again"
                checked={dontAskAgain}
                onCheckedChange={(checked) => setDontAskAgain(checked as boolean)}
              />
              <Label
                htmlFor="dont-ask-again"
                className="text-sm cursor-pointer"
                style={{ color: "var(--text-muted)" }}
              >
                Don&apos;t show this again (use simple rating by default)
              </Label>
            </div>
          </div>
        );

      case "select-personal":
        return (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setView("choose")} className="gap-1">
              <CaretRight className="h-4 w-4 rotate-180" />
              Back
            </Button>

            {loadingRubrics ? (
              <div className="p-8 text-center">
                <Text size="sm" muted>
                  Loading your rubrics...
                </Text>
              </div>
            ) : userRubrics.length === 0 ? (
              <div
                className="p-6 rounded-lg border-2 border-dashed text-center"
                style={{ borderColor: "var(--border)" }}
              >
                <Scales
                  className="h-8 w-8 mx-auto mb-2 opacity-30"
                  style={{ color: "var(--text-muted)" }}
                />
                <Text size="sm" muted className="mb-3">
                  You don&apos;t have any rubrics yet
                </Text>
                <Button variant="primary" size="sm" onClick={() => setView("create-new")}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create Your First Rubric
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {userRubrics.map((rubric) => (
                  <button
                    key={rubric.id}
                    onClick={() => setSelectedRubric(rubric)}
                    className={cn(
                      "w-full p-3 rounded-lg border text-left transition-all",
                      selectedRubric?.id === rubric.id
                        ? "ring-1 ring-[var(--primary)] bg-[var(--surface-3)] shadow-sm border-transparent"
                        : "hover:border-[var(--primary)]/50"
                    )}
                    style={{
                      borderColor: selectedRubric?.id === rubric.id ? undefined : "var(--border)",
                      backgroundColor:
                        selectedRubric?.id === rubric.id ? undefined : "var(--surface-1)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Text className="font-medium">{rubric.name}</Text>
                      {rubric.is_default && (
                        <Star
                          weight="fill"
                          className="h-3.5 w-3.5"
                          style={{ color: "var(--warning)" }}
                        />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {rubric.categories.map((c) => (
                        <span
                          key={c.id}
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: "var(--surface-2)",
                            color: "var(--text-muted)",
                          }}
                        >
                          {c.name} ({c.weight}%)
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {userRubrics.length > 0 && (
              <div
                className="flex justify-end gap-2 pt-2 border-t"
                style={{ borderColor: "var(--border)" }}
              >
                <Button variant="outline" onClick={() => setView("choose")}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSelectPersonalRubric}
                  disabled={!selectedRubric || isPending}
                >
                  {isPending ? "Confirming..." : "Use This Rubric"}
                </Button>
              </div>
            )}
          </div>
        );

      case "create-new":
        return (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setView("choose")} className="gap-1">
              <CaretRight className="h-4 w-4 rotate-180" />
              Back
            </Button>

            {/* Preset Templates */}
            <div>
              <button
                onClick={() => setShowPresets(!showPresets)}
                className="flex items-center gap-2 text-sm transition-colors hover:text-[var(--primary)]"
                style={{ color: "var(--text-muted)" }}
              >
                <CaretRight
                  className={cn("h-4 w-4 transition-transform", showPresets && "rotate-90")}
                />
                Start from a template
              </button>

              {showPresets && (
                <div className="mt-2 grid gap-2 grid-cols-2">
                  {PRESET_RUBRICS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleLoadPreset(preset.id)}
                      className="h-full p-2 rounded-lg border text-left transition-colors hover:border-[var(--primary)] hover:bg-[var(--surface-1)]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <Text size="tiny" className="font-medium line-clamp-1">
                        {preset.name}
                      </Text>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="max-h-[350px] overflow-y-auto">
              <RubricEditor
                rubrics={newRubricCategories}
                rubricName={newRubricName}
                onChange={setNewRubricCategories}
                onNameChange={setNewRubricName}
                disabled={isPending}
              />
            </div>

            <div
              className="flex justify-end gap-2 pt-2 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <Button variant="outline" onClick={() => setView("choose")}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateAndUse}
                disabled={isPending || newRubricCategories.length === 0}
              >
                {isPending ? "Creating..." : "Create & Use Rubric"}
              </Button>
            </div>
          </div>
        );

      case "use-club":
        return (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setView("choose")} className="gap-1">
              <CaretRight className="h-4 w-4 rotate-180" />
              Back
            </Button>

            <div
              className="p-4 rounded-lg border"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-1)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Buildings className="h-5 w-5" style={{ color: "var(--primary)" }} />
                <Text className="font-medium">{clubRubricName || "Club Rubric"}</Text>
              </div>

              {clubRubricCategories && (
                <div className="space-y-1.5">
                  {clubRubricCategories.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2 rounded"
                      style={{ backgroundColor: "var(--surface-2)" }}
                    >
                      <Text size="sm">{c.name}</Text>
                      <Text size="sm" className="font-mono" muted>
                        {c.weight}%
                      </Text>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              className="flex justify-end gap-2 pt-2 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <Button variant="outline" onClick={() => setView("choose")}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleUseClubRubric} disabled={isPending}>
                {isPending ? "Confirming..." : "Use Club Rubric"}
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[90dvh] overflow-y-auto"
        contentAreaCentered
      >
        <DialogHeader>
          <DialogTitle>
            {view === "choose" && "Choose Your Rating Style"}
            {view === "select-personal" && "Select a Rubric"}
            {view === "create-new" && "Create New Rubric"}
            {view === "use-club" && "Club Rubric"}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2">{renderContent()}</div>
      </DialogContent>
    </Dialog>
  );
}

export default RubricSelectionModal;

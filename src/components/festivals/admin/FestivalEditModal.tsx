"use client";

import { useState, useTransition, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarBlank,
  Gear,
  Trash,
  FloppyDisk,
  CircleNotch,
  WarningCircle,
  Clock,
  Sparkle,
} from "@phosphor-icons/react";
import { DangerZoneSection } from "@/components/shared/DangerZoneSection";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Database } from "@/types/database";
import type { FestivalPhase } from "@/types/festival";
import toast from "react-hot-toast";

type Festival = Database["public"]["Tables"]["festivals"]["Row"] & {
  keywords?: string[] | null;
};

interface FestivalEditModalProps {
  festival: Festival;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (updates: Partial<Festival>) => Promise<{ error?: string }>;
  onDelete?: () => Promise<{ error?: string }>;
  onCancel?: () => Promise<{ error?: string }>;
}

const PHASE_LABELS: Record<FestivalPhase, string> = {
  theme_selection: "Theme Selection",
  nomination: "Nominations",
  watch_rate: "Watch & Rate",
  results: "Results",
};

export function FestivalEditModal({
  festival,
  open,
  onOpenChange,
  onSave,
  onDelete,
  onCancel,
}: FestivalEditModalProps) {
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Form state
  const [nominationDeadline, setNominationDeadline] = useState("");
  const [ratingDeadline, setRatingDeadline] = useState("");
  const [autoAdvance, setAutoAdvance] = useState(festival.auto_advance ?? true);

  // Initialize form state from festival
  useEffect(() => {
    if (festival) {
      setNominationDeadline(formatDateTimeForInput(festival.nomination_deadline));
      setRatingDeadline(formatDateTimeForInput(festival.rating_deadline));
      setAutoAdvance(festival.auto_advance ?? true);
    }
  }, [festival]);

  const formatDateTimeForInput = (date: string | null) => {
    if (!date) return "";
    try {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return "";
    }
  };

  const handleSave = async () => {
    if (!onSave) return;

    startTransition(async () => {
      const updates: Partial<Festival> = {
        nomination_deadline: nominationDeadline ? new Date(nominationDeadline).toISOString() : null,
        rating_deadline: ratingDeadline ? new Date(ratingDeadline).toISOString() : null,
        watch_deadline: ratingDeadline ? new Date(ratingDeadline).toISOString() : null,
        auto_advance: autoAdvance,
      };

      const result = await onSave(updates);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Festival updated!");
        onOpenChange(false);
      }
    });
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    startTransition(async () => {
      const result = await onDelete();
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Festival deleted");
        onOpenChange(false);
      }
      setShowDeleteDialog(false);
    });
  };

  const handleCancel = async () => {
    if (!onCancel) return;

    startTransition(async () => {
      const result = await onCancel();
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Festival cancelled");
        onOpenChange(false);
      }
      setShowCancelDialog(false);
    });
  };

  const isActive = festival.status !== "completed" && festival.status !== "cancelled";
  const phase = festival.phase as FestivalPhase;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl">Edit Festival</DialogTitle>
              <Badge variant={isActive ? "primary" : "secondary"}>{festival.status}</Badge>
            </div>
          </DialogHeader>

          {/* Festival Info Header */}
          <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: "var(--surface-2)" }}>
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: "var(--surface-1)" }}
              >
                <Sparkle className="w-6 h-6" style={{ color: "var(--primary)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>
                  {festival.theme || "Theme Selection"}
                </h3>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Current Phase: {PHASE_LABELS[phase]}
                </p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="timing" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="timing">
                <CalendarBlank className="w-4 h-4 mr-2" />
                Timing
              </TabsTrigger>
              <TabsTrigger value="danger">
                <WarningCircle className="w-4 h-4 mr-2" />
                Danger Zone
              </TabsTrigger>
            </TabsList>

            {/* Timing Tab */}
            <TabsContent value="timing" className="space-y-4 mt-4">
              <Card style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
                    <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      Deadlines
                    </h3>
                  </div>

                  <Input
                    id="nominationDeadline"
                    type="datetime-local"
                    label="Nominations Close"
                    value={nominationDeadline}
                    onChange={(e) => setNominationDeadline(e.target.value)}
                    disabled={isPending || phase === "watch_rate" || phase === "results"}
                  />

                  <Input
                    id="ratingDeadline"
                    type="datetime-local"
                    label="Ratings Close"
                    helperText="Results reveal after this deadline"
                    value={ratingDeadline}
                    onChange={(e) => setRatingDeadline(e.target.value)}
                    disabled={isPending || phase === "results"}
                  />
                </CardContent>
              </Card>

              <Card style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Gear className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
                    <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      Settings
                    </h3>
                  </div>

                  <label
                    htmlFor="festival-edit-auto-advance"
                    aria-label="Auto-advance phases"
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <input
                      id="festival-edit-auto-advance"
                      type="checkbox"
                      checked={autoAdvance}
                      onChange={(e) => setAutoAdvance(e.target.checked)}
                      disabled={isPending}
                      className="w-5 h-5 rounded"
                      style={{ accentColor: "var(--primary)" }}
                    />
                    <div>
                      <span
                        className="font-medium text-sm"
                        style={{ color: "var(--text-primary)" }}
                      >
                        Auto-advance phases
                      </span>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Automatically move to next phase when deadlines pass
                      </p>
                    </div>
                  </label>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <Button variant="primary" onClick={handleSave} disabled={isPending}>
                  {isPending ? (
                    <CircleNotch className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FloppyDisk className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </TabsContent>

            {/* Danger Zone Tab */}
            <TabsContent value="danger" className="mt-4">
              {onCancel || onDelete ? (
                <DangerZoneSection description="Destructive festival actions">
                  <div className="space-y-4 pt-4">
                    {isActive && onCancel && (
                      <Card
                        className="border"
                        style={{
                          backgroundColor: "var(--background)",
                          borderColor: "var(--border)",
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <WarningCircle
                              className="w-5 h-5 shrink-0 mt-0.5"
                              style={{ color: "var(--error)" }}
                            />
                            <div className="flex-1">
                              <h4
                                className="font-semibold"
                                style={{ color: "var(--text-primary)" }}
                              >
                                Cancel Festival
                              </h4>
                              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                                Cancel this festival. Members will be notified and the festival will
                                be marked as cancelled. This can be reversed by a producer.
                              </p>
                              <Button
                                variant="danger"
                                size="sm"
                                className="mt-3"
                                onClick={() => setShowCancelDialog(true)}
                                disabled={isPending}
                              >
                                Cancel Festival
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {onDelete && (
                      <Card
                        className="border"
                        style={{
                          backgroundColor: "var(--background)",
                          borderColor: "var(--border)",
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <Trash
                              className="w-5 h-5 shrink-0 mt-0.5"
                              style={{ color: "var(--error)" }}
                            />
                            <div className="flex-1">
                              <h4
                                className="font-semibold"
                                style={{ color: "var(--text-primary)" }}
                              >
                                Delete Festival
                              </h4>
                              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                                Permanently delete this festival and all associated data including
                                nominations, ratings, and results. This action cannot be undone.
                              </p>
                              <Button
                                variant="danger"
                                size="sm"
                                className="mt-3"
                                onClick={() => setShowDeleteDialog(true)}
                                disabled={isPending}
                              >
                                <Trash className="w-4 h-4 mr-2" />
                                Delete Festival
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </DangerZoneSection>
              ) : (
                <div
                  className="text-center py-8 rounded-lg"
                  style={{ backgroundColor: "var(--surface-2)" }}
                >
                  <p style={{ color: "var(--text-muted)" }}>No destructive actions available</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this festival?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the festival as cancelled. Members will be notified. You can restart a
              new festival after cancelling.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Festival</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-[var(--error)] hover:opacity-90"
            >
              {isPending ? "Cancelling..." : "Cancel Festival"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this festival?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the festival and all associated data including
              nominations, ratings, and results. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Festival</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-[var(--error)] hover:opacity-90"
            >
              {isPending ? "Deleting..." : "Delete Forever"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  PencilSimple,
  Trash,
  X,
  FloppyDisk,
  CircleNotch,
  Plus,
  PushPin,
  CaretDown,
} from "@phosphor-icons/react";
import { createPrivateNote, updatePrivateNote, deletePrivateNote } from "@/app/actions/notes";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { DateDisplay } from "@/components/ui/date-display";
import { motion, AnimatePresence } from "framer-motion";

// Dynamic import for heavy rich text editor
const SimpleRichTextEditor = dynamic(
  () => import("./SimpleRichTextEditor").then((mod) => mod.SimpleRichTextEditor),
  {
    loading: () => (
      <div className="h-[120px] rounded-lg border border-[var(--border)] bg-[var(--surface-1)]" />
    ),
    ssr: false,
  }
);
const SimpleRichTextPreview = dynamic(
  () => import("./SimpleRichTextEditor").then((mod) => mod.SimpleRichTextPreview),
  { ssr: false }
);
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface PrivateNote {
  id: string;
  note: string;
  created_at: string;
  updated_at: string | null;
}

interface PrivateNoteEditorProps {
  tmdbId: number;
  initialNotes: PrivateNote[];
  showHeader?: boolean;
}

// Helper to strip HTML and get preview text
function getPreviewText(html: string, maxLength: number = 80): string {
  const stripped = html.replace(/<[^>]*>/g, "").trim();
  if (stripped.length <= maxLength) return stripped;
  return stripped.slice(0, maxLength).trim() + "...";
}

// Note card styles - neutral/minimal
const noteCardStyles = {
  base: cn(
    "rounded-lg border border-[var(--border)]",
    "bg-[var(--surface-1)]",
    "shadow-sm",
    "transition-colors duration-150"
  ),
  hover: "hover:border-[var(--border-hover)] hover:bg-[var(--surface-2)]",
};

// Animation constants - matching CollapsibleMoviePool/CollapsibleClubResources
const EXPAND_EASE = [0.04, 0.62, 0.23, 0.98] as [number, number, number, number];
const expandTransition = {
  height: { duration: 0.3, ease: EXPAND_EASE },
  opacity: { duration: 0.25, delay: 0.05 },
};
const collapseTransition = {
  height: { duration: 0.25, ease: EXPAND_EASE },
  opacity: { duration: 0.15 },
};

// NoteCard sub-component
interface NoteCardProps {
  note: PrivateNote;
  isEditing: boolean;
  editingText: string;
  isUpdating: boolean;
  isDeleting: boolean;
  onEditStart: () => void;
  onEditChange: (text: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onDelete: () => void;
}

function NoteCard({
  note,
  isEditing,
  editingText,
  isUpdating,
  isDeleting,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
  onDelete,
}: NoteCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Strip HTML to check if content is empty
  const isContentEmpty = (html: string) => {
    const stripped = html.replace(/<[^>]*>/g, "").trim();
    return stripped.length === 0;
  };

  // If editing, always show expanded
  const effectiveOpen = isEditing || isOpen;

  return (
    <div className={cn(noteCardStyles.base, !isEditing && noteCardStyles.hover)}>
      {/* Trigger button */}
      <button
        className={cn(
          "w-full text-left p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-inset",
          effectiveOpen ? "rounded-t-lg" : "rounded-lg",
          !isEditing && "cursor-pointer"
        )}
        disabled={isEditing}
        onClick={() => {
          if (!isEditing) setIsOpen(!isOpen);
        }}
      >
        <div className="flex items-center gap-2">
          <PushPin className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" weight="fill" />
          <div className="flex-1 min-w-0">
            {!effectiveOpen && (
              <p className="text-sm text-[var(--text-primary)] line-clamp-1">
                {getPreviewText(note.note, 100)}
              </p>
            )}
            {effectiveOpen && !isEditing && (
              <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                Note
              </span>
            )}
            {isEditing && (
              <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                Editing
              </span>
            )}
          </div>
          {!isEditing && (
            <CaretDown
              className={cn(
                "w-4 h-4 text-[var(--text-muted)] flex-shrink-0 transition-transform duration-200",
                effectiveOpen ? "rotate-180" : "rotate-0"
              )}
              weight="bold"
            />
          )}
        </div>
      </button>

      {/* Animated expand/collapse */}
      <AnimatePresence initial={false}>
        {effectiveOpen && (
          <motion.div
            key="note-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, transition: expandTransition }}
            exit={{ height: 0, opacity: 0, transition: collapseTransition }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">
              {isEditing ? (
                // Edit mode
                <div className="space-y-3">
                  <SimpleRichTextEditor content={editingText} onChange={onEditChange} />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={onEditCancel}
                      disabled={isUpdating}
                    >
                      <X className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={onEditSave}
                      disabled={isUpdating || isContentEmpty(editingText)}
                    >
                      {isUpdating ? (
                        <CircleNotch className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <FloppyDisk className="w-3 h-3 mr-1" />
                      )}
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                // Display mode
                <>
                  <div className="pt-1">
                    <SimpleRichTextPreview content={note.note} className="text-sm" />
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--border)]">
                    <p className="text-xs text-[var(--text-muted)]">
                      {note.updated_at ? "Updated" : "Added"}{" "}
                      <DateDisplay date={note.updated_at || note.created_at} format="relative" />
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditStart();
                        }}
                      >
                        <PencilSimple className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-[var(--text-muted)] hover:text-[var(--error)]"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete();
                        }}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <CircleNotch className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PrivateNoteEditor({
  tmdbId,
  initialNotes,
  showHeader = false,
}: PrivateNoteEditorProps) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  // Strip HTML to check if content is empty
  const isContentEmpty = (html: string) => {
    const stripped = html.replace(/<[^>]*>/g, "").trim();
    return stripped.length === 0;
  };

  const handleCreate = async () => {
    if (isContentEmpty(newNote)) {
      toast.error("Note cannot be empty");
      return;
    }

    setIsSaving(true);
    const result = await createPrivateNote(tmdbId, newNote);
    setIsSaving(false);

    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Note added");
      setNewNote("");
      setIsAdding(false);
      router.refresh();
    }
  };

  const handleUpdate = async (noteId: string) => {
    if (isContentEmpty(editingNoteText)) {
      toast.error("Note cannot be empty");
      return;
    }

    setIsUpdating(true);
    const result = await updatePrivateNote(noteId, editingNoteText);
    setIsUpdating(false);

    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Note updated");
      setEditingNoteId(null);
      setEditingNoteText("");
      router.refresh();
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm("Delete this note?")) return;

    setDeletingNoteId(noteId);
    const result = await deletePrivateNote(noteId);
    setDeletingNoteId(null);

    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Note deleted");
      router.refresh();
    }
  };

  const startEditing = (note: PrivateNote) => {
    setEditingNoteId(note.id);
    setEditingNoteText(note.note);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditingNoteText("");
  };

  const cancelAdding = () => {
    setNewNote("");
    setIsAdding(false);
  };

  return (
    <div>
      {showHeader && (
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
            Private Notes
          </h2>
          {!isAdding && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              Add note
            </Button>
          )}
        </div>
      )}

      {/* Add new note form - paper styled */}
      <AnimatePresence initial={false}>
        {isAdding && (
          <motion.div
            key="add-note-form"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, transition: expandTransition }}
            exit={{ height: 0, opacity: 0, transition: collapseTransition }}
            className="overflow-hidden"
          >
            <div className={cn(noteCardStyles.base, "p-3 mb-4")}>
              <div className="flex items-center gap-2 mb-2">
                <PushPin className="w-4 h-4 text-[var(--text-muted)]" weight="fill" />
                <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                  New Note
                </span>
              </div>
              <div className="mb-3">
                <SimpleRichTextEditor
                  content={newNote}
                  onChange={setNewNote}
                  placeholder="Add your private notes about this movie..."
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={cancelAdding}
                  disabled={isSaving}
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleCreate}
                  disabled={isSaving || isContentEmpty(newNote)}
                >
                  {isSaving ? (
                    <CircleNotch className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <FloppyDisk className="w-3 h-3 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable list of existing notes */}
      {initialNotes.length > 0 ? (
        <ScrollArea className="max-h-[280px] -mr-2">
          <div className="space-y-3 pr-4">
            {initialNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                isEditing={editingNoteId === note.id}
                editingText={editingNoteText}
                isUpdating={isUpdating}
                isDeleting={deletingNoteId === note.id}
                onEditStart={() => startEditing(note)}
                onEditChange={setEditingNoteText}
                onEditSave={() => handleUpdate(note.id)}
                onEditCancel={cancelEditing}
                onDelete={() => handleDelete(note.id)}
              />
            ))}
          </div>
        </ScrollArea>
      ) : !isAdding ? (
        // Empty state - compact inline placeholder
        <button
          onClick={() => setIsAdding(true)}
          className={cn(
            noteCardStyles.base,
            noteCardStyles.hover,
            "w-full py-2 px-3 border-dashed cursor-pointer flex items-center gap-2"
          )}
        >
          <PushPin className="w-3.5 h-3.5 text-[var(--text-muted)]" weight="fill" />
          <p className="text-xs text-[var(--text-muted)]">Click to add a private note</p>
        </button>
      ) : null}
    </div>
  );
}

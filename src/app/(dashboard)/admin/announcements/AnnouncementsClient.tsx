"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Megaphone,
  Clock,
  Eye,
  EyeSlash,
  Trash,
  PencilSimple,
  FloppyDisk,
  X,
} from "@phosphor-icons/react";
import { DateDisplay } from "@/components/ui/date-display";
import { cn } from "@/lib/utils";
import {
  createSiteAnnouncement,
  updateSiteAnnouncement,
  deleteSiteAnnouncement,
} from "@/app/actions/admin";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "update";
  is_active: boolean;
  show_on_landing: boolean;
  show_on_dashboard: boolean;
  expires_at: string | null;
  created_at: string;
}

function getTypeDot(type: string) {
  switch (type) {
    case "info":
      return "bg-sky-400";
    case "warning":
      return "bg-amber-400";
    case "success":
      return "bg-emerald-400";
    case "update":
      return "bg-violet-400";
    default:
      return "bg-zinc-400";
  }
}

export function AnnouncementsClient({ announcements }: { announcements: Announcement[] }) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState<{
    title: string;
    message: string;
    type: "info" | "warning" | "success" | "update";
    showOnLanding: boolean;
    showOnDashboard: boolean;
    expiresAt: string;
  }>({
    title: "",
    message: "",
    type: "info",
    showOnLanding: true,
    showOnDashboard: true,
    expiresAt: "",
  });

  const activeCount = announcements.filter((a) => a.is_active).length;

  const handleCreate = () => {
    if (!newAnnouncement.title || !newAnnouncement.message) return;
    startTransition(async () => {
      const result = await createSiteAnnouncement(newAnnouncement);
      if (!("error" in result && result.error)) {
        setNewAnnouncement({
          title: "",
          message: "",
          type: "info",
          showOnLanding: true,
          showOnDashboard: true,
          expiresAt: "",
        });
        setShowCreate(false);
      }
    });
  };

  const handleToggle = (id: string, isActive: boolean) => {
    startTransition(async () => {
      await updateSiteAnnouncement(id, { isActive: !isActive });
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteSiteAnnouncement(id);
    });
  };

  const startEdit = (a: Announcement) => {
    setEditingId(a.id);
    setEditTitle(a.title);
    setEditMessage(a.message);
  };

  const handleSaveEdit = (id: string) => {
    startTransition(async () => {
      await updateSiteAnnouncement(id, { title: editTitle, message: editMessage });
      setEditingId(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Announcements</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            <span className="tabular-nums">{activeCount}</span> active ·{" "}
            <span className="tabular-nums">{announcements.length}</span> total
          </p>
        </div>
        <Button
          variant={showCreate ? "ghost" : "outline"}
          size="sm"
          className="h-7 text-xs border-[var(--border)]"
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? (
            <>
              <X className="w-3 h-3 mr-1" /> Cancel
            </>
          ) : (
            "New announcement"
          )}
        </Button>
      </div>

      {/* Create Form — appears on demand */}
      {showCreate && (
        <div className="p-4 rounded-lg border border-[var(--primary)]/20 bg-[var(--surface-1)] space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <Input
              placeholder="Title"
              value={newAnnouncement.title}
              onChange={(e) => setNewAnnouncement((p) => ({ ...p, title: e.target.value }))}
              className="h-8 text-sm"
            />
            <Select
              value={newAnnouncement.type}
              onChange={(e) =>
                setNewAnnouncement((p) => ({
                  ...p,
                  type: e.target.value as "info" | "warning" | "success" | "update",
                }))
              }
              className="h-8 text-xs"
            >
              <option value="info">Info</option>
              <option value="update">Update</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
            </Select>
          </div>
          <Textarea
            placeholder="Message"
            rows={2}
            value={newAnnouncement.message}
            onChange={(e) => setNewAnnouncement((p) => ({ ...p, message: e.target.value }))}
            className="resize-none text-sm"
          />
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={newAnnouncement.showOnLanding}
                onChange={(e) =>
                  setNewAnnouncement((p) => ({ ...p, showOnLanding: e.target.checked }))
                }
                className="w-3 h-3 rounded accent-[var(--primary)]"
              />
              Landing
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={newAnnouncement.showOnDashboard}
                onChange={(e) =>
                  setNewAnnouncement((p) => ({ ...p, showOnDashboard: e.target.checked }))
                }
                className="w-3 h-3 rounded accent-[var(--primary)]"
              />
              Dashboard
            </label>
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-[var(--text-muted)]">Expires</Label>
              <Input
                type="datetime-local"
                value={newAnnouncement.expiresAt}
                onChange={(e) => setNewAnnouncement((p) => ({ ...p, expiresAt: e.target.value }))}
                className="h-7 w-auto text-xs"
              />
            </div>
          </div>
          <Button
            onClick={handleCreate}
            disabled={isPending || !newAnnouncement.title || !newAnnouncement.message}
            size="sm"
            className="h-7 text-xs"
          >
            Post
          </Button>
        </div>
      )}

      {/* Announcement List — clean rows */}
      {announcements.length === 0 ? (
        <div className="text-center pt-16 pb-8 text-[var(--text-muted)]">
          <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-25" />
          <p className="text-sm">No announcements yet</p>
          <p className="text-xs mt-1">Click &ldquo;New announcement&rdquo; to create one.</p>
        </div>
      ) : (
        <div>
          {announcements.map((a) => (
            <div
              key={a.id}
              className={cn(
                "py-3 border-b border-[var(--border)]/40 last:border-0",
                !a.is_active && "opacity-40"
              )}
            >
              {editingId === a.id ? (
                <div className="space-y-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Textarea
                    value={editMessage}
                    onChange={(e) => setEditMessage(e.target.value)}
                    className="resize-none text-sm"
                    rows={2}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-6 text-[11px]"
                      onClick={() => handleSaveEdit(a.id)}
                      disabled={isPending}
                    >
                      <FloppyDisk className="w-3 h-3 mr-1" weight="fill" /> Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px]"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  {/* Type dot */}
                  <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", getTypeDot(a.type))} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {a.title}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        {a.type}
                      </span>
                      {a.show_on_landing && (
                        <span className="text-[9px] text-[var(--text-muted)] bg-[var(--surface-2)] px-1 py-0.5 rounded">
                          landing
                        </span>
                      )}
                      {a.show_on_dashboard && (
                        <span className="text-[9px] text-[var(--text-muted)] bg-[var(--surface-2)] px-1 py-0.5 rounded">
                          dashboard
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">
                      {a.message}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <DateDisplay date={a.created_at} format="date" />
                      </span>
                      {a.expires_at && (
                        <span>
                          expires <DateDisplay date={a.expires_at} format="date" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => startEdit(a)}
                      className="p-1.5 rounded hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <PencilSimple className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggle(a.id, a.is_active)}
                      disabled={isPending}
                      className="p-1.5 rounded hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {a.is_active ? (
                        <EyeSlash className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="p-1.5 rounded hover:bg-[var(--error)]/10 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors">
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
                          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(a.id)}
                            className="bg-[var(--error)] hover:opacity-90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

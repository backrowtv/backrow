"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import { Bug, Lightbulb, CaretUp, Trash, ChatCircleDots, FloppyDisk } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { DateDisplay } from "@/components/ui/date-display";
import { updateFeedbackStatus, deleteFeedbackItem } from "@/app/actions/feedback";
import type { FeedbackItemWithUser, FeedbackStatus } from "@/app/actions/feedback.types";

const STATUS_LABEL: Record<FeedbackStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
  wont_fix: "Won't Fix",
};
const STATUS_DOT: Record<FeedbackStatus, string> = {
  open: "bg-sky-400",
  in_progress: "bg-amber-400",
  resolved: "bg-emerald-400",
  closed: "bg-zinc-500",
  wont_fix: "bg-orange-400",
};
const STATUSES: FeedbackStatus[] = ["open", "in_progress", "resolved", "closed", "wont_fix"];

export function FeedbackClient({
  bugs,
  features,
}: {
  bugs: FeedbackItemWithUser[];
  features: FeedbackItemWithUser[];
}) {
  const [isPending, startTransition] = useTransition();
  const [typeFilter, setTypeFilter] = useState<"all" | "bug" | "feature">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | FeedbackStatus>("all");
  const [sortBy, setSortBy] = useState<"votes" | "date">("votes");
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");

  const allItems = [...bugs, ...features];
  const filtered = allItems
    .filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) =>
      sortBy === "votes"
        ? b.vote_count - a.vote_count
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  const openBugs = bugs.filter((b) => b.status === "open").length;
  const openFeatures = features.filter((f) => f.status === "open").length;

  const handleStatusChange = (id: string, status: FeedbackStatus) => {
    startTransition(async () => {
      await updateFeedbackStatus(id, status);
    });
  };
  const handleRespond = (id: string) => {
    if (!responseText.trim()) return;
    startTransition(async () => {
      await updateFeedbackStatus(id, "in_progress", responseText.trim());
      setRespondingTo(null);
      setResponseText("");
    });
  };
  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteFeedbackItem(id);
    });
  };

  return (
    <div className="space-y-5">
      {/* Page Title */}
      <div>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Feedback</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          {openBugs} bugs, {openFeatures} features open · {filtered.length} shown
        </p>
      </div>

      {/* Filters — single row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-md border border-[var(--border)] overflow-hidden">
          {(["all", "bug", "feature"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                "px-2.5 py-1 text-xs transition-colors",
                typeFilter === t
                  ? "bg-[var(--surface-2)] text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {t === "all" ? "All" : t === "bug" ? "Bugs" : "Features"}
            </button>
          ))}
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="h-7 text-xs w-28"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <Select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "votes" | "date")}
          className="h-7 text-xs w-24"
        >
          <option value="votes">Votes</option>
          <option value="date">Newest</option>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center pt-16 pb-8 text-[var(--text-muted)]">
          <ChatCircleDots className="w-10 h-10 mx-auto mb-2 opacity-25" />
          <p className="text-sm">No feedback matches your filters</p>
        </div>
      ) : (
        <div>
          {filtered.map((item) => {
            const user = Array.isArray(item.user) ? item.user[0] : item.user;
            return (
              <div key={item.id} className="py-3 border-b border-[var(--border)]/40 last:border-0">
                <div className="flex items-start gap-3">
                  {/* Votes */}
                  <div className="flex flex-col items-center pt-0.5 shrink-0 w-8">
                    <CaretUp className="w-3.5 h-3.5 text-[var(--text-muted)]" weight="bold" />
                    <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                      {item.vote_count}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.type === "bug" ? (
                        <Bug className="w-3 h-3 text-red-400 shrink-0" />
                      ) : (
                        <Lightbulb className="w-3 h-3 text-violet-400 shrink-0" />
                      )}
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {item.title}
                      </span>
                      <div
                        className={cn("w-1.5 h-1.5 rounded-full shrink-0", STATUS_DOT[item.status])}
                      />
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {STATUS_LABEL[item.status]}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1">
                        {item.description}
                      </p>
                    )}
                    {item.admin_response && (
                      <div className="mt-1.5 pl-3 border-l-2 border-[var(--primary)]/30">
                        <p className="text-xs text-[var(--text-secondary)]">
                          {item.admin_response}
                        </p>
                      </div>
                    )}
                    {respondingTo === item.id && (
                      <div className="mt-2 space-y-2">
                        <Textarea
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          placeholder="Admin response..."
                          rows={2}
                          className="text-xs resize-none"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="h-6 text-[11px]"
                            onClick={() => handleRespond(item.id)}
                            disabled={isPending}
                          >
                            <FloppyDisk className="w-3 h-3 mr-1" weight="fill" /> Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[11px]"
                            onClick={() => {
                              setRespondingTo(null);
                              setResponseText("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--text-muted)]">
                      {user && <span>{user.display_name || user.username}</span>}
                      <span>&middot;</span>
                      <DateDisplay date={item.created_at} format="relative" />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Select
                      value={item.status}
                      onChange={(e) =>
                        handleStatusChange(item.id, e.target.value as FeedbackStatus)
                      }
                      className="h-6 text-[10px] w-24"
                      disabled={isPending}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </Select>
                    <button
                      onClick={() => {
                        setRespondingTo(respondingTo === item.id ? null : item.id);
                        setResponseText(item.admin_response || "");
                      }}
                      className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      title="Respond"
                    >
                      <ChatCircleDots className="w-3.5 h-3.5" />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="p-1 rounded hover:bg-[var(--error)]/10 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors">
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete</AlertDialogTitle>
                          <AlertDialogDescription>
                            Delete &ldquo;{item.title}&rdquo;?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(item.id)}
                            className="bg-[var(--error)] hover:opacity-90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

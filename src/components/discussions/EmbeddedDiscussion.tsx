"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { ChatCircle, Plus } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DiscussionThread } from "./DiscussionThread";
import { CreateThreadModal } from "./CreateThreadModal";
import { getThreadsByClub, createThread } from "@/app/actions/discussions";
import type { DiscussionThread as ThreadType, DiscussionTagType } from "@/app/actions/discussions";

// Selected tag with display info (matching CreateThreadModal)
interface SelectedTag {
  tag_type: DiscussionTagType;
  tmdb_id?: number;
  person_tmdb_id?: number;
  festival_id?: string;
  display_name: string;
  image_url?: string | null;
}

interface EmbeddedDiscussionProps {
  clubId: string;
  clubSlug: string;
  currentUserId: string;
  // Optional: filter by festival or movie
  festivalId?: string;
  festivalTheme?: string;
  tmdbId?: number;
  movieTitle?: string;
  moviePosterUrl?: string | null;
  threadType?: "movie" | "festival" | "custom";
  isAdmin?: boolean;
  /** Hide the quick post / create form (e.g. when discussion already exists) */
  hideCreateForm?: boolean;
}

export function EmbeddedDiscussion({
  clubId,
  clubSlug,
  currentUserId,
  festivalId,
  festivalTheme,
  tmdbId,
  movieTitle,
  moviePosterUrl,
  threadType,
  isAdmin = false,
  hideCreateForm = false,
}: EmbeddedDiscussionProps) {
  const [threads, setThreads] = useState<ThreadType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [quickComment, setQuickComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Build initial tags for the modal based on context
  const initialTags: SelectedTag[] = React.useMemo(() => {
    const tags: SelectedTag[] = [];

    if (tmdbId && movieTitle) {
      tags.push({
        tag_type: "movie",
        tmdb_id: tmdbId,
        display_name: movieTitle,
        image_url: moviePosterUrl,
      });
    }

    if (festivalId && festivalTheme) {
      tags.push({
        tag_type: "festival",
        festival_id: festivalId,
        display_name: festivalTheme,
      });
    }

    return tags;
  }, [tmdbId, movieTitle, moviePosterUrl, festivalId, festivalTheme]);

  const loadIdRef = useRef(0);

  useEffect(() => {
    const currentLoadId = ++loadIdRef.current;
    setIsLoading(true);

    getThreadsByClub(clubId, { threadType }).then((result) => {
      // Guard against stale responses
      if (loadIdRef.current !== currentLoadId) return;

      if ("data" in result) {
        let filtered = result.data;
        if (festivalId) {
          filtered = filtered.filter(
            (t) =>
              t.festival_id === festivalId ||
              t.tags?.some((tag) => tag.tag_type === "festival" && tag.festival_id === festivalId)
          );
        }
        if (tmdbId) {
          filtered = filtered.filter(
            (t) =>
              t.tmdb_id === tmdbId ||
              t.tags?.some((tag) => tag.tag_type === "movie" && tag.tmdb_id === tmdbId)
          );
        }
        setThreads(filtered);
      }
      setIsLoading(false);
    });
  }, [clubId, festivalId, tmdbId, threadType]);

  // Manual reload (e.g. after creating a post)
  const reloadThreads = React.useCallback(() => {
    const currentLoadId = ++loadIdRef.current;
    setIsLoading(true);

    getThreadsByClub(clubId, { threadType }).then((result) => {
      if (loadIdRef.current !== currentLoadId) return;
      if ("data" in result) {
        let filtered = result.data;
        if (festivalId) {
          filtered = filtered.filter(
            (t) =>
              t.festival_id === festivalId ||
              t.tags?.some((tag) => tag.tag_type === "festival" && tag.festival_id === festivalId)
          );
        }
        if (tmdbId) {
          filtered = filtered.filter(
            (t) =>
              t.tmdb_id === tmdbId ||
              t.tags?.some((tag) => tag.tag_type === "movie" && tag.tmdb_id === tmdbId)
          );
        }
        setThreads(filtered);
      }
      setIsLoading(false);
    });
  }, [clubId, festivalId, tmdbId, threadType]);

  const handleQuickPost = async () => {
    if (!quickComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("clubId", clubId);
    formData.append("title", quickComment.substring(0, 100));
    formData.append("content", quickComment);

    // Build tags JSON for new system
    if (initialTags.length > 0) {
      const tags = initialTags.map((tag) => ({
        tag_type: tag.tag_type,
        tmdb_id: tag.tmdb_id,
        person_tmdb_id: tag.person_tmdb_id,
        festival_id: tag.festival_id,
      }));
      formData.append("tags", JSON.stringify(tags));
    }

    const result = await createThread(null, formData);

    if ("success" in result) {
      setQuickComment("");
      reloadThreads();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-4">
      {/* Quick post form */}
      {!hideCreateForm && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <Input
            type="textarea"
            placeholder="Start a discussion..."
            value={quickComment}
            onChange={(e) => setQuickComment(e.target.value)}
            rows={2}
            className="mb-3"
          />
          <div className="flex items-center justify-between">
            <Button size="sm" variant="outline" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Create Full Post
            </Button>
            <Button
              size="sm"
              onClick={handleQuickPost}
              isLoading={isSubmitting}
              disabled={!quickComment.trim()}
            >
              Post
            </Button>
          </div>
        </div>
      )}

      {/* Threads list */}
      {!isLoading && threads.length === 0 ? (
        <div className="py-8 text-center rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <ChatCircle className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">
            No discussions yet. Be the first to start one!
          </p>
        </div>
      ) : (
        <div
          className={`space-y-4 transition-opacity duration-300 will-change-[opacity] ${isLoading ? "opacity-40" : "opacity-100"}`}
        >
          {threads.map((thread) => (
            <DiscussionThread
              key={thread.id}
              thread={thread}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              embedded={true}
              showFullContent={true}
              clubSlug={clubSlug}
            />
          ))}
        </div>
      )}

      {/* Create thread modal */}
      <CreateThreadModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        clubId={clubId}
        clubSlug={clubSlug}
        initialTags={initialTags}
      />
    </div>
  );
}

"use client";

import { useState, useRef, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DateDisplay } from "@/components/ui/date-display";
import {
  Sparkle,
  ArrowRight,
  CaretUp,
  Bug,
  Lightbulb,
  Megaphone,
  Image as ImageIcon,
  Trash,
  CloudArrowUp,
} from "@phosphor-icons/react";
import { setFeaturedClub } from "@/app/actions/admin";
import {
  uploadBackgroundImage,
  upsertBackground,
  deleteBackground,
} from "@/app/actions/backgrounds";
import type { BackgroundImage } from "@/lib/backgrounds";

interface OverviewData {
  stats: {
    totalUsers: number;
    newUsersThisWeek: number;
    totalClubs: number;
    activeClubs: number;
    totalFestivals: number;
    runningFestivals: number;
    activeAnnouncements: number;
    openBugs: number;
    openFeatures: number;
    activeCollections: number;
  };
  featuredClub: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  } | null;
  allClubs: Array<{ id: string; name: string; slug: string }>;
  recentUsers: Array<{
    id: string;
    email: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    created_at: string;
  }>;
  topFeedback: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    created_at: string;
    vote_count: number;
  }>;
  staleAnnouncements: Array<{
    id: string;
    title: string;
    type: string;
    expires_at: string | null;
  }>;
}

export function OverviewClient({
  data,
  homepageBackground,
}: {
  data: OverviewData;
  homepageBackground: BackgroundImage | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedClubId, setSelectedClubId] = useState(data.featuredClub?.id || "");
  const [featuredSuccess, setFeaturedSuccess] = useState(false);

  // Homepage background state
  const [bgImageUrl, setBgImageUrl] = useState(homepageBackground?.image_url || "");
  const [bgId, setBgId] = useState(homepageBackground?.id || "");
  const [isUploading, setIsUploading] = useState(false);
  const [bgError, setBgError] = useState<string | null>(null);
  const [bgSuccess, setBgSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBgUpload = async (file: File) => {
    setIsUploading(true);
    setBgError(null);
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadBackgroundImage(formData);
    if (result.error || !result.url) {
      setBgError(result.error || "Upload failed");
      setIsUploading(false);
      return;
    }
    // Save immediately after upload
    const saveResult = await upsertBackground({
      entity_type: "site_page",
      entity_id: "/",
      image_url: result.url,
      height_preset: homepageBackground?.height_preset || "default",
      height_px: homepageBackground?.height_px ?? null,
      opacity: homepageBackground?.opacity ?? 0.6,
      object_position: homepageBackground?.object_position || "center center",
      scale: homepageBackground?.scale ?? 1,
    });
    setIsUploading(false);
    if (saveResult.error) {
      setBgError(saveResult.error);
    } else {
      setBgImageUrl(result.url);
      if (saveResult.data) setBgId(saveResult.data.id);
      setBgSuccess(true);
      setTimeout(() => setBgSuccess(false), 3000);
    }
  };

  const handleBgDelete = () => {
    if (!bgId) return;
    startTransition(async () => {
      await deleteBackground(bgId);
      setBgImageUrl("");
      setBgId("");
    });
  };

  const handleSetFeatured = () => {
    if (!selectedClubId) return;
    startTransition(async () => {
      const result = await setFeaturedClub(selectedClubId);
      if (!("error" in result)) {
        setFeaturedSuccess(true);
        setTimeout(() => setFeaturedSuccess(false), 3000);
      }
    });
  };

  const s = data.stats;
  const openFeedback = s.openBugs + s.openFeatures;
  const hasAttention = data.topFeedback.length > 0 || data.staleAnnouncements.length > 0;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Overview</h1>

      {/* Stats — inline, like a status bar */}
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm text-[var(--text-muted)] pb-4 border-b border-[var(--border)]/40">
        <span>
          <span className="text-lg font-semibold text-[var(--text-primary)] tabular-nums">
            {s.totalUsers}
          </span>{" "}
          users
          {s.newUsersThisWeek > 0 && (
            <span className="text-[var(--success)] ml-1">+{s.newUsersThisWeek}/wk</span>
          )}
        </span>
        <span>
          <span className="text-lg font-semibold text-[var(--text-primary)] tabular-nums">
            {s.activeClubs}
          </span>
          /{s.totalClubs} clubs active
        </span>
        <span>
          <span className="text-lg font-semibold text-[var(--text-primary)] tabular-nums">
            {s.totalFestivals}
          </span>{" "}
          festivals
          {s.runningFestivals > 0 && (
            <span className="text-[var(--warning)] ml-1">{s.runningFestivals} live</span>
          )}
        </span>
        <span>
          <span className="text-lg font-semibold text-[var(--text-primary)] tabular-nums">
            {s.activeAnnouncements}
          </span>{" "}
          announcements
        </span>
        <span>
          <span className="text-lg font-semibold text-[var(--text-primary)] tabular-nums">
            {openFeedback}
          </span>{" "}
          open feedback
        </span>
        <span>
          <span className="text-lg font-semibold text-[var(--text-primary)] tabular-nums">
            {s.activeCollections}
          </span>{" "}
          collections
        </span>
      </div>

      {/* Featured Club */}
      <section className="rounded-lg bg-[var(--surface-1)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Featured Club
          </h2>
        </div>
        {data.featuredClub && (
          <div className="flex items-center gap-3 mb-3">
            <Sparkle className="w-3.5 h-3.5 text-[var(--primary)]" weight="fill" />
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {data.featuredClub.name}
            </span>
            {data.featuredClub.description && (
              <span className="text-xs text-[var(--text-muted)] hidden sm:inline">
                — {data.featuredClub.description.slice(0, 80)}
                {data.featuredClub.description.length > 80 ? "..." : ""}
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Select
            value={selectedClubId}
            onChange={(e) => {
              setSelectedClubId(e.target.value);
              setFeaturedSuccess(false);
            }}
            className="h-8 text-xs max-w-xs"
          >
            <option value="">Change featured club...</option>
            {data.allClubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </Select>
          <Button
            onClick={handleSetFeatured}
            disabled={isPending || !selectedClubId}
            size="sm"
            className="h-8 text-xs"
          >
            Set
          </Button>
          {featuredSuccess && <span className="text-xs text-[var(--success)]">Done.</span>}
        </div>
      </section>

      {/* Homepage Background */}
      <section className="rounded-lg bg-[var(--surface-1)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Homepage Background
          </h2>
          {bgSuccess && <span className="text-xs text-[var(--success)]">Saved.</span>}
        </div>
        <div className="flex items-center gap-3">
          {/* Preview */}
          {bgImageUrl ? (
            <div className="w-20 h-14 rounded overflow-hidden shrink-0 relative border border-[var(--border)]/50">
              <Image
                src={bgImageUrl}
                alt="Homepage background"
                fill
                className="object-cover"
                sizes="80px"
              />
            </div>
          ) : (
            <div className="w-20 h-14 rounded flex items-center justify-center shrink-0 bg-[var(--surface-2)] border border-dashed border-[var(--border)]">
              <ImageIcon className="w-5 h-5 text-[var(--text-muted)]/50" />
            </div>
          )}
          {/* Actions */}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleBgUpload(file);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <CloudArrowUp className="w-3 h-3 mr-1" />
              {isUploading ? "Uploading..." : bgImageUrl ? "Replace" : "Upload"}
            </Button>
            {bgImageUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-[var(--error)]"
                onClick={handleBgDelete}
                disabled={isPending}
              >
                <Trash className="w-3 h-3" />
              </Button>
            )}
          </div>
          {bgError && <span className="text-xs text-[var(--error)]">{bgError}</span>}
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Recent Signups */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Recent Signups
            </h2>
            <Link
              href="/admin/users"
              className="text-xs text-[var(--primary)] hover:underline flex items-center gap-0.5"
            >
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {data.recentUsers.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">No users yet.</p>
          ) : (
            <div className="space-y-0">
              {data.recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between py-2 border-b border-[var(--border)]/40 last:border-0"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-[var(--surface-3)] flex items-center justify-center shrink-0 text-[10px] font-medium text-[var(--text-secondary)]">
                      {user.display_name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <span className="text-sm text-[var(--text-primary)] truncate">
                      {user.display_name}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] hidden sm:inline">
                      @{user.username}
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)] tabular-nums shrink-0 ml-2">
                    <DateDisplay date={user.created_at} format="relative" />
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Needs Attention */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Needs Attention
            </h2>
          </div>
          {!hasAttention ? (
            <p className="text-xs text-[var(--text-muted)]">Nothing urgent.</p>
          ) : (
            <div className="space-y-0">
              {data.staleAnnouncements.map((a) => (
                <Link
                  key={a.id}
                  href="/admin/announcements"
                  className="flex items-center justify-between py-2 border-b border-[var(--border)]/40 last:border-0 hover:bg-[var(--surface-1)]/50 -mx-2 px-2 rounded transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Megaphone className="w-3.5 h-3.5 text-[var(--warning)] shrink-0" />
                    <span className="text-sm text-[var(--text-secondary)] truncate">{a.title}</span>
                  </div>
                  <Badge className="text-[9px] bg-[var(--warning)] text-white border-[var(--warning)] shrink-0">
                    expired
                  </Badge>
                </Link>
              ))}
              {data.topFeedback.map((item) => (
                <Link
                  key={item.id}
                  href="/admin/feedback"
                  className="flex items-center justify-between py-2 border-b border-[var(--border)]/40 last:border-0 hover:bg-[var(--surface-1)]/50 -mx-2 px-2 rounded transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {item.type === "bug" ? (
                      <Bug className="w-3.5 h-3.5 text-[var(--error)] shrink-0" />
                    ) : (
                      <Lightbulb className="w-3.5 h-3.5 text-[var(--info)] shrink-0" />
                    )}
                    <span className="text-sm text-[var(--text-secondary)] truncate">
                      {item.title}
                    </span>
                  </div>
                  {item.vote_count > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-muted)] tabular-nums shrink-0">
                      <CaretUp className="w-2.5 h-2.5" weight="bold" />
                      {item.vote_count}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

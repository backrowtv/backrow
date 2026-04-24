"use client";

import { useState } from "react";
import Image from "next/image";
import { MotionProvider, m, AnimatePresence } from "@/lib/motion";
import { Select } from "@/components/ui/select";
import { ClickableUserAvatar } from "@/components/ui/clickable-user-avatar";
import { Star, FilmReel, User, TrendUp } from "@phosphor-icons/react";
import { formatRatingDisplay } from "@/lib/ratings/normalize";
import { EmptyState } from "@/components/shared/EmptyState";
import { ScrollFade } from "./ScrollFade";
import type {
  NominationWithRelations,
  RatingWithRelations,
  MemberForResults,
} from "@/types/results";
import NumberFlow from "@/components/ui/number-flow";

interface RatingsTabProps {
  nominations: NominationWithRelations[];
  ratings: RatingWithRelations[];
  members: MemberForResults[];
}

interface MemberRatingsSummary {
  userId: string;
  userName: string;
  userEmail: string;
  avatarUrl?: string | null;
  ratingsCount: number;
  averageRating: number;
}

// Calculate member summaries for the overview
function calculateMemberSummaries(
  ratings: RatingWithRelations[],
  members: MemberForResults[]
): MemberRatingsSummary[] {
  const summaries: MemberRatingsSummary[] = [];

  members.forEach((member) => {
    const user = member.users;
    if (!user) return;

    const memberRatings = ratings.filter((r) => r.user_id === user.id && r.rating !== null);

    if (memberRatings.length > 0) {
      const avgRating =
        memberRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / memberRatings.length;

      summaries.push({
        userId: user.id,
        userName: user.display_name || user.email || "Unknown",
        userEmail: user.email,
        avatarUrl: null, // Could add avatar_url to user type if needed
        ratingsCount: memberRatings.length,
        averageRating: Math.round(avgRating * 10) / 10,
      });
    }
  });

  // Sort by average rating descending
  return summaries.sort((a, b) => b.averageRating - a.averageRating);
}

// Member summary card component
function MemberSummaryCard({
  summary,
  index,
  onClick,
}: {
  summary: MemberRatingsSummary;
  index: number;
  onClick: () => void;
}) {
  return (
    <m.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3 px-2 transition-all hover:bg-[var(--surface-2)] text-left"
    >
      <ClickableUserAvatar
        entity={{ name: summary.userName, avatar_url: summary.avatarUrl }}
        userId={summary.userId}
        alt={summary.userName}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>
          {summary.userName}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          <NumberFlow value={summary.ratingsCount} />{" "}
          {summary.ratingsCount === 1 ? "rating" : "ratings"}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Star className="w-4 h-4 fill-current" style={{ color: "var(--primary)" }} />
        <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
          <NumberFlow
            value={summary.averageRating}
            format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
          />
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          avg
        </span>
      </div>
    </m.button>
  );
}

// Individual member's ratings view
function MemberRatingsView({
  selectedUserId,
  nominations,
  ratings,
  members,
}: {
  selectedUserId: string;
  nominations: NominationWithRelations[];
  ratings: RatingWithRelations[];
  members: MemberForResults[];
}) {
  // Get selected member info
  const selectedMember = members.find((m) => m.users?.id === selectedUserId);
  const userName = selectedMember?.users?.display_name || selectedMember?.users?.email || "Unknown";

  // Filter ratings for selected member
  const memberRatings = ratings.filter((r) => r.user_id === selectedUserId && r.rating !== null);

  // Calculate average
  const averageRating =
    memberRatings.length > 0
      ? memberRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / memberRatings.length
      : 0;

  // Sort by rating descending
  const sortedRatings = [...memberRatings].sort((a, b) => (b.rating || 0) - (a.rating || 0));

  return (
    <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Member header — flat, separated by border-bottom */}
      <div
        className="flex items-center justify-between pb-4 mb-2 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <ClickableUserAvatar
            entity={{ name: userName }}
            userId={selectedUserId}
            alt={userName}
            size="md"
          />
          <div>
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {userName}
            </h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              <NumberFlow value={memberRatings.length} />{" "}
              {memberRatings.length === 1 ? "movie" : "movies"} rated
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1">
            <Star className="w-5 h-5 fill-current" style={{ color: "var(--primary)" }} />
            <span
              className="text-lg sm:text-2xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              <NumberFlow
                value={averageRating}
                format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
              />
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            average rating
          </p>
        </div>
      </div>

      {/* Ratings list */}
      <ScrollFade maxHeight="400px">
        <div className="divide-y divide-[var(--border)]">
          {sortedRatings.map((rating, index) => {
            // Find the nomination for this rating
            const nomination = nominations.find((n) => n.id === rating.nomination_id);
            const movie = nomination?.movies;
            const posterUrl = movie?.poster_url || null;

            return (
              <m.div
                key={rating.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center gap-3 py-3"
              >
                {/* Poster */}
                <div className="relative w-10 h-[60px] rounded overflow-hidden shrink-0">
                  {posterUrl ? (
                    <Image
                      src={posterUrl}
                      alt={movie?.title || "Movie"}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ backgroundColor: "var(--surface-2)" }}
                    >
                      <FilmReel className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                    </div>
                  )}
                </div>

                {/* Movie info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-medium text-sm truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {movie?.title || "Unknown Movie"}
                  </p>
                  {movie?.year && (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {movie.year}
                    </p>
                  )}
                </div>

                {/* Rating — inline star + number */}
                <div className="flex items-center gap-1 shrink-0">
                  <Star
                    className={`w-4 h-4 ${(rating.rating || 0) >= 8 ? "fill-current" : ""}`}
                    style={{
                      color: (rating.rating || 0) >= 8 ? "var(--primary)" : "var(--text-muted)",
                    }}
                  />
                  <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                    <NumberFlow
                      value={rating.rating || 0}
                      format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
                    />
                  </span>
                </div>
              </m.div>
            );
          })}
        </div>
      </ScrollFade>
    </m.div>
  );
}

export function RatingsTab({ nominations, ratings, members }: RatingsTabProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");

  // Calculate member summaries
  const memberSummaries = calculateMemberSummaries(ratings, members);

  // Handle member selection
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMemberId(e.target.value);
  };

  if (!nominations || nominations.length === 0) {
    return (
      <EmptyState
        icon={FilmReel}
        title="No nominations found"
        message="No nominations found for this festival."
        variant="inline"
      />
    );
  }

  if (ratings.length === 0) {
    return <EmptyState icon={Star} title="No ratings submitted yet" variant="inline" />;
  }

  return (
    <MotionProvider>
      <div className="space-y-4">
        {/* Member selector dropdown */}
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 shrink-0" style={{ color: "var(--text-muted)" }} />
          <Select value={selectedMemberId} onChange={handleSelectChange} className="flex-1">
            <option value="">Select a member to view their ratings</option>
            {memberSummaries.map((summary) => (
              <option key={summary.userId} value={summary.userId}>
                {summary.userName} - {formatRatingDisplay(summary.averageRating)} avg (
                {summary.ratingsCount} ratings)
              </option>
            ))}
          </Select>
        </div>

        {/* Content based on selection */}
        <AnimatePresence mode="wait">
          {selectedMemberId ? (
            <MemberRatingsView
              key={selectedMemberId}
              selectedUserId={selectedMemberId}
              nominations={nominations}
              ratings={ratings}
              members={members}
            />
          ) : (
            <m.div
              key="overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Overview header */}
              <div
                className="flex items-center gap-2 text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                <TrendUp className="w-4 h-4" />
                <span>All members&apos; average ratings</span>
              </div>

              {/* Member cards grid */}
              <ScrollFade maxHeight="400px">
                <div className="divide-y divide-[var(--border)]">
                  {memberSummaries.map((summary, index) => (
                    <MemberSummaryCard
                      key={summary.userId}
                      summary={summary}
                      index={index}
                      onClick={() => setSelectedMemberId(summary.userId)}
                    />
                  ))}
                </div>
              </ScrollFade>

              {/* Summary stats */}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  <NumberFlow value={memberSummaries.length} />{" "}
                  {memberSummaries.length === 1 ? "member" : "members"} rated
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  <NumberFlow value={ratings.length} /> total{" "}
                  {ratings.length === 1 ? "rating" : "ratings"}
                </span>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </MotionProvider>
  );
}

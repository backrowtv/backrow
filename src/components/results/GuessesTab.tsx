"use client";

import { useState } from "react";
import Image from "next/image";
import { MotionProvider, m, AnimatePresence } from "@/lib/motion";
import { Select } from "@/components/ui/select";
import { ClickableUserAvatar } from "@/components/ui/clickable-user-avatar";
import { Check, X, FilmReel, User, Target, Question } from "@phosphor-icons/react";
import { ScrollFade } from "./ScrollFade";
import type {
  NominationWithRelations,
  GuessWithRelations,
  MemberForResults,
} from "@/types/results";

interface GuessesTabProps {
  nominations: NominationWithRelations[];
  guesses: GuessWithRelations[];
  members: MemberForResults[];
}

interface GuesserSummary {
  userId: string;
  userName: string;
  correctCount: number;
  totalGuesses: number;
  accuracy: number; // percentage
}

// Calculate guesser summaries for the overview
function calculateGuesserSummaries(
  nominations: NominationWithRelations[],
  guesses: GuessWithRelations[],
  members: MemberForResults[]
): GuesserSummary[] {
  // Create map of actual nominators
  const actualNominators = new Map<string, string | null>();
  nominations.forEach((nom) => {
    actualNominators.set(nom.id, nom.user_id);
  });

  // Create member name lookup
  const memberNames = new Map<string, string>();
  members.forEach((member) => {
    const user = member.users;
    if (user) {
      memberNames.set(user.id, user.display_name || user.email || "Unknown");
    }
  });

  const summaries: GuesserSummary[] = [];

  guesses.forEach((guess) => {
    if (!guess.user_id || !guess.guesses) return;

    const guessesObj = guess.guesses as Record<string, string>;
    let correctCount = 0;
    let totalGuesses = 0;

    Object.entries(guessesObj).forEach(([nominationId, guessedUserId]) => {
      if (actualNominators.has(nominationId)) {
        totalGuesses++;
        if (actualNominators.get(nominationId) === guessedUserId) {
          correctCount++;
        }
      }
    });

    if (totalGuesses > 0) {
      const guesserName = guess.users?.display_name || guess.users?.email || "Unknown";

      summaries.push({
        userId: guess.user_id,
        userName: guesserName,
        correctCount,
        totalGuesses,
        accuracy: (correctCount / totalGuesses) * 100,
      });
    }
  });

  // Sort by accuracy descending, then by total guesses
  return summaries.sort((a, b) => {
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    return b.correctCount - a.correctCount;
  });
}

// Guesser summary card with fraction display
function GuesserSummaryCard({
  summary,
  index,
  onClick,
}: {
  summary: GuesserSummary;
  index: number;
  onClick: () => void;
}) {
  const isPerfect = summary.correctCount === summary.totalGuesses;
  const isGood = summary.accuracy >= 50;

  return (
    <m.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3 px-2 transition-all hover:bg-[var(--surface-2)] text-left"
    >
      <ClickableUserAvatar
        entity={{ name: summary.userName }}
        userId={summary.userId}
        alt={summary.userName}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>
          {summary.userName}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {Math.round(summary.accuracy)}% accuracy
        </p>
      </div>

      {/* Fraction display - e.g., "3/7" or "11/12" */}
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg shrink-0"
        style={{
          backgroundColor: isPerfect
            ? "rgba(var(--primary-rgb), 0.2)"
            : isGood
              ? "var(--surface-2)"
              : "rgba(239, 68, 68, 0.1)",
        }}
      >
        {isPerfect ? (
          <Check className="w-4 h-4" style={{ color: "var(--primary)" }} />
        ) : (
          <Target
            className="w-4 h-4"
            style={{ color: isGood ? "var(--text-muted)" : "var(--error)" }}
          />
        )}
        <span
          className="font-bold text-lg"
          style={{
            color: isPerfect ? "var(--primary)" : isGood ? "var(--text-primary)" : "var(--error)",
          }}
        >
          {summary.correctCount}/{summary.totalGuesses}
        </span>
      </div>
    </m.button>
  );
}

// Individual member's guesses view
function MemberGuessesView({
  selectedUserId,
  nominations,
  guesses,
  members,
}: {
  selectedUserId: string;
  nominations: NominationWithRelations[];
  guesses: GuessWithRelations[];
  members: MemberForResults[];
}) {
  // Find the selected user's guesses
  const userGuess = guesses.find((g) => g.user_id === selectedUserId);
  const guessesObj = (userGuess?.guesses as Record<string, string>) || {};

  // Create member name and avatar lookup
  const memberInfo = new Map<string, { name: string; avatar?: string | null }>();
  members.forEach((member) => {
    const user = member.users;
    if (user) {
      memberInfo.set(user.id, {
        name: user.display_name || user.email || "Unknown",
        avatar: null,
      });
    }
  });

  // Get user name
  const userName = userGuess?.users?.display_name || userGuess?.users?.email || "Unknown";

  // Calculate stats
  let correctCount = 0;
  let totalGuesses = 0;

  const guessResults = nominations
    .filter((nom) => nom.tmdb_id !== null && nom.user_id !== selectedUserId)
    .map((nom) => {
      const actualNominatorId = nom.user_id;
      const guessedUserId = guessesObj[nom.id];
      const isCorrect = actualNominatorId === guessedUserId;
      const hasGuess = !!guessedUserId;

      if (hasGuess) {
        totalGuesses++;
        if (isCorrect) correctCount++;
      }

      return {
        nomination: nom,
        actualNominatorId,
        actualNominatorName: actualNominatorId
          ? memberInfo.get(actualNominatorId)?.name || "Unknown"
          : "Unknown",
        guessedUserId,
        guessedName: guessedUserId ? memberInfo.get(guessedUserId)?.name || "Unknown" : null,
        isCorrect,
        hasGuess,
      };
    });

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
              {totalGuesses} {totalGuesses === 1 ? "guess" : "guesses"} submitted
            </p>
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-2xl sm:text-3xl font-bold"
            style={{
              color:
                correctCount === totalGuesses && totalGuesses > 0
                  ? "var(--primary)"
                  : "var(--text-primary)",
            }}
          >
            {correctCount}/{totalGuesses}
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            correct guesses
          </p>
        </div>
      </div>

      {/* Guesses list */}
      <ScrollFade maxHeight="400px">
        <div className="divide-y divide-[var(--border)]">
          {guessResults.map((result, index) => {
            const movie = result.nomination.movies;
            const posterUrl = movie?.poster_url || null;

            return (
              <m.div
                key={result.nomination.id}
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

                {/* Movie and guess info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                    {movie?.title || "Unknown Movie"}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span style={{ color: "var(--text-muted)" }}>Guessed:</span>
                    <span
                      className="font-medium"
                      style={{
                        color: result.hasGuess
                          ? result.isCorrect
                            ? "var(--primary)"
                            : "var(--error)"
                          : "var(--text-muted)",
                      }}
                    >
                      {result.guessedName || "No guess"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span style={{ color: "var(--text-muted)" }}>Actual:</span>
                    <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                      {result.actualNominatorName}
                    </span>
                  </div>
                </div>

                {/* Correct/Incorrect indicator */}
                <div className="shrink-0">
                  {result.hasGuess ? (
                    result.isCorrect ? (
                      <Check className="w-5 h-5" style={{ color: "var(--primary)" }} />
                    ) : (
                      <X className="w-5 h-5" style={{ color: "var(--error)" }} />
                    )
                  ) : (
                    <Question className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                  )}
                </div>
              </m.div>
            );
          })}
        </div>
      </ScrollFade>
    </m.div>
  );
}

export function GuessesTab({ nominations, guesses, members }: GuessesTabProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");

  // Filter nominations with valid tmdb_id
  const validNominations = nominations.filter(
    (n): n is NominationWithRelations & { tmdb_id: number } => n.tmdb_id !== null
  );

  // Calculate guesser summaries
  const guesserSummaries = calculateGuesserSummaries(validNominations, guesses, members);

  // Handle member selection
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMemberId(e.target.value);
  };

  if (validNominations.length === 0) {
    return (
      <div className="text-center py-12">
        <FilmReel className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
        <p style={{ color: "var(--text-secondary)" }}>No nominations found.</p>
      </div>
    );
  }

  if (guesses.length === 0 || guesserSummaries.length === 0) {
    return (
      <div className="text-center py-12">
        <Target className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
        <p style={{ color: "var(--text-secondary)" }}>No guesses submitted yet.</p>
      </div>
    );
  }

  return (
    <MotionProvider>
      <div className="space-y-4">
        {/* Member selector dropdown */}
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 shrink-0" style={{ color: "var(--text-muted)" }} />
          <Select value={selectedMemberId} onChange={handleSelectChange} className="flex-1">
            <option value="">Select a member to view their guesses</option>
            {guesserSummaries.map((summary) => (
              <option key={summary.userId} value={summary.userId}>
                {summary.userName} - {summary.correctCount}/{summary.totalGuesses} correct
              </option>
            ))}
          </Select>
        </div>

        {/* Content based on selection */}
        <AnimatePresence mode="wait">
          {selectedMemberId ? (
            <MemberGuessesView
              key={selectedMemberId}
              selectedUserId={selectedMemberId}
              nominations={validNominations}
              guesses={guesses}
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
                <Target className="w-4 h-4" />
                <span>All guessers ranked by accuracy</span>
              </div>

              {/* Guesser cards */}
              <ScrollFade maxHeight="400px">
                <div className="divide-y divide-[var(--border)]">
                  {guesserSummaries.map((summary, index) => (
                    <GuesserSummaryCard
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
                  {guesserSummaries.length} {guesserSummaries.length === 1 ? "member" : "members"}{" "}
                  guessed
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {guesserSummaries.reduce((sum, g) => sum + g.correctCount, 0)} /{" "}
                  {guesserSummaries.reduce((sum, g) => sum + g.totalGuesses, 0)} total correct
                </span>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </MotionProvider>
  );
}

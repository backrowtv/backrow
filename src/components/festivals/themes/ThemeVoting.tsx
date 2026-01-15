"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import { voteForTheme, getThemeVotes } from "@/app/actions/themes";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/typography";
import toast from "react-hot-toast";
import { Database } from "@/types/database";

type Theme = Database["public"]["Tables"]["theme_pool"]["Row"];

interface ThemeVotingProps {
  festivalId: string;
  themes: Theme[];
  clubId: string;
}

export function ThemeVoting({ festivalId, themes, clubId: _clubId }: ThemeVotingProps) {
  const [userVote, setUserVote] = useState<string | null>(null);
  const [voteCounts, setVoteCounts] = useState<
    Array<{
      theme_id: string;
      theme_name: string;
      vote_count: number;
    }>
  >([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);

  const availableThemes = themes.filter((t) => !t.is_used);

  const [errorShown, setErrorShown] = useState(false);

  const loadVotes = useCallback(async () => {
    setIsLoading(true);
    const result = await getThemeVotes(festivalId);
    if ("error" in result && result.error) {
      // Only show error once, not on every refresh
      if (!errorShown) {
        toast.error(result.error);
        setErrorShown(true);
      }
      setIsLoading(false);
      return;
    }

    // Reset error flag on success
    setErrorShown(false);

    if (result.data && !Array.isArray(result.data)) {
      const voteData = result.data;
      startTransition(() => {
        setVoteCounts(voteData.votes || []);
        setUserVote(voteData.user_vote);
        setTotalVotes(voteData.total_votes || 0);
      });
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [festivalId, errorShown]);

  useEffect(() => {
    loadVotes();
  }, [festivalId, loadVotes]);

  async function handleVote(themeId: string) {
    if (isVoting) return;

    setIsVoting(true);
    const result = await voteForTheme(festivalId, themeId);

    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Vote recorded!");
      setUserVote(themeId);
      // Reload votes to get updated counts
      await loadVotes();
    }

    setIsVoting(false);
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Text size="sm" muted>
          Loading votes...
        </Text>
      </div>
    );
  }

  if (availableThemes.length === 0) {
    return (
      <div className="text-center py-8">
        <Text size="sm" muted>
          No themes available. Add themes to the theme pool first.
        </Text>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Subtle instruction */}
      <p className="text-center text-xs opacity-50" style={{ color: "var(--text-muted)" }}>
        Vote for your favorite theme
      </p>

      {/* Vote count */}
      {totalVotes > 0 && (
        <p className="text-center text-xs opacity-40" style={{ color: "var(--text-muted)" }}>
          {totalVotes} {totalVotes === 1 ? "vote" : "votes"} cast
        </p>
      )}

      {/* Theme list - clean rows */}
      <div className="space-y-1">
        {availableThemes.map((theme) => {
          const voteCount = voteCounts.find((v) => v.theme_id === theme.id)?.vote_count || 0;
          const isSelected = userVote === theme.id;

          return (
            <div
              key={theme.id}
              className="flex items-center justify-between p-3 rounded-lg transition-colors"
              style={{
                backgroundColor: isSelected ? "var(--surface-1)" : "transparent",
                border: isSelected ? "1px solid var(--border)" : "1px solid transparent",
              }}
            >
              <div className="flex items-center gap-3 flex-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVote(theme.id)}
                  disabled={isVoting}
                  isLoading={isVoting && isSelected}
                  className="h-7 px-3 text-xs"
                >
                  {isSelected ? "✓ Voted" : "Vote"}
                </Button>
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                  {theme.theme_name}
                </span>
              </div>
              {voteCount > 0 && (
                <span className="text-xs opacity-50" style={{ color: "var(--text-muted)" }}>
                  {voteCount}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import { useRouter } from "next/navigation";
import { getThemeVotes, selectFestivalTheme } from "@/app/actions/themes";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/typography";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import toast from "react-hot-toast";
import { Database } from "@/types/database";

type Theme = Database["public"]["Tables"]["theme_pool"]["Row"];

interface ThemeSelectionResultsProps {
  festivalId: string;
  themes: Theme[];
  clubId: string;
}

export function ThemeSelectionResults({
  festivalId,
  themes,
  clubId: _clubId,
}: ThemeSelectionResultsProps) {
  const router = useRouter();
  const [voteCounts, setVoteCounts] = useState<
    Array<{
      theme_id: string;
      theme_name: string;
      vote_count: number;
    }>
  >([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelecting, setIsSelecting] = useState<string | null>(null);
  const [themeToSelect, setThemeToSelect] = useState<{ id: string; name: string } | null>(null);

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
        setTotalVotes(voteData.total_votes || 0);
      });
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [festivalId, errorShown]);

  useEffect(() => {
    loadVotes();
    // Refresh votes every 5 seconds
    const interval = setInterval(loadVotes, 5000);
    return () => clearInterval(interval);
  }, [festivalId, loadVotes]);

  function handleSelectThemeClick(theme: Theme) {
    setThemeToSelect({ id: theme.id, name: theme.theme_name });
  }

  async function handleConfirmSelectTheme() {
    if (!themeToSelect) return;

    setIsSelecting(themeToSelect.id);
    const result = await selectFestivalTheme(festivalId, themeToSelect.id);

    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Theme selected! Nominations are now open.");
      // Refresh server data to show updated festival state
      router.refresh();
    }

    setIsSelecting(null);
    setThemeToSelect(null);
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
        Select a theme to begin nominations
      </p>

      {/* Vote count */}
      {totalVotes > 0 ? (
        <p className="text-center text-xs opacity-40" style={{ color: "var(--text-muted)" }}>
          {totalVotes} {totalVotes === 1 ? "vote" : "votes"} cast
        </p>
      ) : (
        <p className="text-center text-xs opacity-40" style={{ color: "var(--text-muted)" }}>
          Waiting for votes...
        </p>
      )}

      {/* Theme list - clean rows */}
      <div className="space-y-1">
        {availableThemes.map((theme) => {
          const voteCount = voteCounts.find((v) => v.theme_id === theme.id)?.vote_count || 0;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isTopVote =
            voteCounts.length > 0 && voteCounts[0]?.theme_id === theme.id && voteCount > 0;

          return (
            <div
              key={theme.id}
              className="flex items-center justify-between p-3 rounded-lg transition-colors"
              style={{
                backgroundColor: isTopVote ? "var(--surface-1)" : "transparent",
                border: isTopVote ? "1px solid var(--border)" : "1px solid transparent",
              }}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-primary)", fontWeight: isTopVote ? 500 : 400 }}
                    >
                      {theme.theme_name}
                    </span>
                    {isTopVote && (
                      <span
                        className="text-[10px] px-1 py-0.5 rounded opacity-60"
                        style={{ backgroundColor: "var(--surface-2)", color: "var(--text-muted)" }}
                      >
                        leading
                      </span>
                    )}
                  </div>
                  {totalVotes > 0 && (
                    <div
                      className="w-full rounded-full h-1 mt-1.5"
                      style={{ backgroundColor: "var(--surface-2)" }}
                    >
                      <div
                        className="h-1 rounded-full transition-all"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: "var(--text-muted)",
                          opacity: 0.4,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {voteCount > 0 && (
                  <span className="text-xs opacity-50" style={{ color: "var(--text-muted)" }}>
                    {voteCount}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectThemeClick(theme)}
                  disabled={isSelecting !== null}
                  isLoading={isSelecting === theme.id}
                  className="h-7 px-3 text-xs"
                >
                  Select
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmationDialog
        open={themeToSelect !== null}
        onOpenChange={(open) => !open && setThemeToSelect(null)}
        title="Select This Theme?"
        description={
          <span>
            Are you sure you want to select <strong>{themeToSelect?.name}</strong> as the festival
            theme? This will start the nomination phase and members will be notified.
          </span>
        }
        confirmText="Select Theme"
        onConfirm={handleConfirmSelectTheme}
        variant="default"
        isLoading={isSelecting !== null}
      />
    </div>
  );
}

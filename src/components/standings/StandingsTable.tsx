"use client";

import { useState, useMemo } from "react";
import { ClickableUserAvatar } from "@/components/ui/clickable-user-avatar";
import { userToAvatarData } from "@/lib/avatar-helpers";
import type { StandingsEntry } from "@/app/actions/standings.types";
import { CaretUp, CaretDown, CaretUpDown } from "@phosphor-icons/react";
import NumberFlow from "@/components/ui/number-flow";

interface StandingsTableProps {
  entries: StandingsEntry[];
  currentUserId?: string;
}

type SortField =
  | "rank"
  | "points"
  | "avg_points"
  | "movies_rated"
  | "festivals_attended"
  | "wins"
  | "win_rate"
  | "avg_nomination_rating"
  | "nomination_guesses";

type SortDirection = "asc" | "desc";

function SortIcon({
  field,
  sortField,
  sortDirection,
}: {
  field: SortField;
  sortField: SortField;
  sortDirection: SortDirection;
}) {
  if (sortField !== field) {
    return <CaretUpDown className="w-3.5 h-3.5 ml-1 text-[var(--text-muted)]" />;
  }

  return sortDirection === "asc" ? (
    <CaretUp className="w-3.5 h-3.5 ml-1 text-[var(--primary)]" />
  ) : (
    <CaretDown className="w-3.5 h-3.5 ml-1 text-[var(--primary)]" />
  );
}

// Get podium color for top 3 ranks
function getRankStyle(rank: number): { borderColor: string; bgColor: string } | null {
  switch (rank) {
    case 1:
      return { borderColor: "#FFD700", bgColor: "rgba(255, 215, 0, 0.08)" }; // Gold
    case 2:
      return { borderColor: "#C0C0C0", bgColor: "rgba(192, 192, 192, 0.08)" }; // Silver
    case 3:
      return { borderColor: "#CD7F32", bgColor: "rgba(205, 127, 50, 0.08)" }; // Bronze
    default:
      return null;
  }
}

export function StandingsTable({ entries, currentUserId }: StandingsTableProps) {
  const [sortField, setSortField] = useState<SortField>("points");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedEntries = useMemo(() => {
    const sorted = [...entries].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortField) {
        case "rank":
          aValue = a.rank;
          bValue = b.rank;
          break;
        case "points":
          aValue = a.points;
          bValue = b.points;
          break;
        case "avg_points":
          aValue = a.avg_points;
          bValue = b.avg_points;
          break;
        case "movies_rated":
          aValue = a.movies_rated;
          bValue = b.movies_rated;
          break;
        case "festivals_attended":
          aValue = a.festivals_attended;
          bValue = b.festivals_attended;
          break;
        case "wins":
          aValue = a.wins;
          bValue = b.wins;
          break;
        case "win_rate":
          aValue = a.win_rate;
          bValue = b.win_rate;
          break;
        case "avg_nomination_rating":
          aValue = a.avg_nomination_rating;
          bValue = b.avg_nomination_rating;
          break;
        case "nomination_guesses":
          aValue = a.nomination_guesses;
          bValue = b.nomination_guesses;
          break;
        default:
          return 0;
      }

      if (sortDirection === "asc") {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    return sorted;
  }, [entries, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      // Default to descending for most fields, ascending for rank
      setSortDirection(field === "rank" ? "asc" : "desc");
    }
  };

  if (entries.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)] text-center py-4">
        No standings data available yet
      </p>
    );
  }

  const hdr =
    "px-1.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wider cursor-pointer transition-colors hover:text-[var(--primary)] text-[var(--text-muted)] whitespace-nowrap";
  const hdrR =
    "px-1.5 py-2 text-right text-[10px] font-semibold uppercase tracking-wider cursor-pointer transition-colors hover:text-[var(--primary)] text-[var(--text-muted)] whitespace-nowrap";
  const cell = "px-1.5 py-2 text-xs";

  return (
    <div className="max-h-[520px] overflow-y-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10 bg-[var(--card)]">
          <tr className="border-b border-[var(--border)]">
            <th className={`${hdr} w-10`} onClick={() => handleSort("rank")}>
              <div className="flex items-center">
                #
                <SortIcon field="rank" sortField={sortField} sortDirection={sortDirection} />
              </div>
            </th>
            <th className="px-1.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Member
            </th>
            <th className={hdrR} onClick={() => handleSort("points")}>
              <div className="flex items-center justify-end">
                Pts
                <SortIcon field="points" sortField={sortField} sortDirection={sortDirection} />
              </div>
            </th>
            <th className={hdrR} onClick={() => handleSort("avg_points")}>
              <div className="flex items-center justify-end">
                Avg
                <SortIcon field="avg_points" sortField={sortField} sortDirection={sortDirection} />
              </div>
            </th>
            <th className={hdrR} onClick={() => handleSort("movies_rated")}>
              <div className="flex items-center justify-end">
                Rated
                <SortIcon
                  field="movies_rated"
                  sortField={sortField}
                  sortDirection={sortDirection}
                />
              </div>
            </th>
            <th className={hdrR} onClick={() => handleSort("festivals_attended")}>
              <div className="flex items-center justify-end">
                Fests
                <SortIcon
                  field="festivals_attended"
                  sortField={sortField}
                  sortDirection={sortDirection}
                />
              </div>
            </th>
            <th className={hdrR} onClick={() => handleSort("wins")}>
              <div className="flex items-center justify-end">
                Wins
                <SortIcon field="wins" sortField={sortField} sortDirection={sortDirection} />
              </div>
            </th>
            <th className={hdrR} onClick={() => handleSort("win_rate")}>
              <div className="flex items-center justify-end">
                Win%
                <SortIcon field="win_rate" sortField={sortField} sortDirection={sortDirection} />
              </div>
            </th>
            <th className={hdrR} onClick={() => handleSort("avg_nomination_rating")}>
              <div className="flex items-center justify-end">
                Nom Rtg
                <SortIcon
                  field="avg_nomination_rating"
                  sortField={sortField}
                  sortDirection={sortDirection}
                />
              </div>
            </th>
            <th className={hdrR} onClick={() => handleSort("nomination_guesses")}>
              <div className="flex items-center justify-end">
                Guess
                <SortIcon
                  field="nomination_guesses"
                  sortField={sortField}
                  sortDirection={sortDirection}
                />
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {sortedEntries.map((entry) => {
            const isCurrentUser = currentUserId === entry.user_id;
            const rankStyle = getRankStyle(entry.rank);

            // Determine row styling
            let rowBg = "transparent";
            let leftBorder = "transparent";

            if (isCurrentUser) {
              rowBg = "rgba(var(--primary-rgb), 0.12)";
              leftBorder = "var(--primary)";
            } else if (rankStyle) {
              rowBg = rankStyle.bgColor;
              leftBorder = rankStyle.borderColor;
            }

            return (
              <tr
                key={entry.user_id}
                className="transition-colors hover:bg-[var(--surface-2)]"
                style={{
                  backgroundColor: rowBg,
                  borderLeft: `3px solid ${leftBorder}`,
                }}
              >
                <td className={`${cell} font-medium text-[var(--text-primary)] w-10`}>
                  <NumberFlow value={entry.rank} prefix="#" />
                </td>
                <td className={cell}>
                  <div className="flex items-center gap-2">
                    <ClickableUserAvatar
                      entity={userToAvatarData({
                        avatar_url: entry.avatar_url,
                        display_name: entry.user_name,
                        email: entry.email,
                        avatar_icon: entry.avatar_icon,
                        avatar_color_index: entry.avatar_color_index,
                        avatar_border_color_index: entry.avatar_border_color_index,
                      })}
                      userId={entry.user_id}
                      size="tiny"
                    />
                    <span
                      className="font-medium truncate max-w-[120px]"
                      style={{ color: isCurrentUser ? "var(--primary)" : "var(--text-primary)" }}
                    >
                      {entry.user_name}
                      {isCurrentUser && (
                        <span className="text-[var(--text-muted)] ml-1 text-[10px]">(You)</span>
                      )}
                    </span>
                  </div>
                </td>
                <td className={`${cell} text-right font-medium text-[var(--text-primary)]`}>
                  <NumberFlow value={entry.points} />
                </td>
                <td className={`${cell} text-right text-[var(--text-secondary)]`}>
                  <NumberFlow
                    value={entry.avg_points}
                    format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
                  />
                </td>
                <td className={`${cell} text-right text-[var(--text-secondary)]`}>
                  <NumberFlow value={entry.movies_rated} />
                </td>
                <td className={`${cell} text-right text-[var(--text-secondary)]`}>
                  <NumberFlow value={entry.festivals_attended} />
                </td>
                <td className={`${cell} text-right text-[var(--text-secondary)]`}>
                  <NumberFlow value={entry.wins} />
                </td>
                <td className={`${cell} text-right text-[var(--text-secondary)]`}>
                  <NumberFlow
                    value={entry.win_rate}
                    suffix="%"
                    format={{ maximumFractionDigits: 0 }}
                  />
                </td>
                <td className={`${cell} text-right text-[var(--text-secondary)]`}>
                  {entry.avg_nomination_rating > 0 ? (
                    <NumberFlow
                      value={entry.avg_nomination_rating}
                      format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                    />
                  ) : (
                    "-"
                  )}
                </td>
                <td className={`${cell} text-right text-[var(--text-secondary)]`}>
                  <NumberFlow value={entry.nomination_guesses} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

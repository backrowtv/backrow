"use client";

import { useState, useTransition, useMemo, useCallback } from "react";
import { updateMemberRole, removeMember } from "@/app/actions/members";
import { refreshMembersData, type MemberWithStats } from "@/app/actions/members/queries";
import type { JoinRequest } from "@/app/actions/clubs";
import type { ClubSettings } from "@/types/club-settings";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { MemberListItem } from "@/components/clubs/MemberListItem";
import { InviteMembersModal } from "@/components/clubs/InviteMembersModal";
import { JoinRequestsList } from "@/components/clubs/JoinRequestsList";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { UserPlus, MagnifyingGlass, CaretDown, CaretUp, Queue } from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MembersPageClientProps {
  clubId: string;
  clubSlug: string;
  clubName: string;
  clubPrivacy: string;
  clubSettings: ClubSettings;
  initialMembers: MemberWithStats[];
  currentUserId: string | null;
  currentUserRole: string | null;
  isAdmin: boolean;
  joinRequests: JoinRequest[];
  requestsCount: number;
}

const roleFilterOptions = [
  { value: "all", label: "All Roles" },
  { value: "producer", label: "Producers" },
  { value: "director", label: "Directors" },
  { value: "critic", label: "Critics" },
] as const;

const sortOptions = [
  { value: "name", label: "Name", defaultDir: "asc" as const },
  { value: "joined", label: "Join Date", defaultDir: "asc" as const },
  { value: "lastActive", label: "Last Active", defaultDir: "desc" as const },
] as const;

type SortDirection = "asc" | "desc";

export function MembersPageClient({
  clubId,
  clubSlug,
  clubName,
  clubPrivacy,
  clubSettings,
  initialMembers,
  currentUserId,
  currentUserRole,
  isAdmin,
  joinRequests: initialJoinRequests,
  requestsCount: initialRequestsCount,
}: MembersPageClientProps) {
  const [members, setMembers] = useState<MemberWithStats[]>(initialMembers);
  const [joinRequests] = useState<JoinRequest[]>(initialJoinRequests);
  const [requestsCount] = useState(initialRequestsCount);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Modal state
  const [showJoinRequestsModal, setShowJoinRequestsModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "producer" | "director" | "critic">("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [visibleCount, setVisibleCount] = useState(20);

  // Confirmation dialog state for removing members
  const [memberToRemove, setMemberToRemove] = useState<{
    userId: string;
    displayName: string;
  } | null>(null);

  // Handle sort option click - toggle direction if same option
  const handleSortChange = (value: string) => {
    if (sortBy === value) {
      // Toggle direction
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      // New sort field - use its default direction
      const option = sortOptions.find((o) => o.value === value);
      setSortBy(value);
      setSortDirection(option?.defaultDir || "asc");
    }
  };

  // Filter and sort members
  const filteredAndSortedMembers = useMemo(() => {
    const filtered = members.filter((member) => {
      // Role filter
      if (roleFilter !== "all" && member.role !== roleFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const displayName =
          member.club_display_name || member.users?.display_name || member.users?.email || "";
        const username = member.users?.username || "";
        if (!displayName.toLowerCase().includes(query) && !username.toLowerCase().includes(query)) {
          return false;
        }
      }

      return true;
    });

    // Sort with direction
    const dirMultiplier = sortDirection === "asc" ? 1 : -1;

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name": {
          const nameA = a.club_display_name || a.users?.display_name || a.users?.email || "";
          const nameB = b.club_display_name || b.users?.display_name || b.users?.email || "";
          comparison = nameA.localeCompare(nameB);
          break;
        }
        case "joined": {
          const dateA = new Date(a.joined_at || 0).getTime();
          const dateB = new Date(b.joined_at || 0).getTime();
          comparison = dateA - dateB;
          break;
        }
        case "lastActive": {
          const dateA = new Date(a.stats?.lastActive || 0).getTime();
          const dateB = new Date(b.stats?.lastActive || 0).getTime();
          comparison = dateA - dateB;
          break;
        }
        default:
          comparison = 0;
      }
      return comparison * dirMultiplier;
    });

    return filtered;
  }, [members, roleFilter, searchQuery, sortBy, sortDirection]);

  // Reset visible count when filters change
  const visibleMembers = filteredAndSortedMembers.slice(0, visibleCount);
  const hasMore = filteredAndSortedMembers.length > visibleCount;

  const handleShowMore = useCallback(() => {
    setVisibleCount((prev) => prev + 20);
  }, []);

  async function handleUpdateRole(userId: string, newRole: "critic" | "director") {
    startTransition(async () => {
      const result = await updateMemberRole(clubId, userId, newRole);
      if (result && "error" in result && result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setError(null);
        toast.success(`Member role updated successfully`);
        // Refresh members data
        const refreshResult = await refreshMembersData(clubId);
        if (refreshResult.error) {
          toast.error(refreshResult.error);
        } else {
          setMembers(refreshResult.members);
        }
      }
    });
  }

  function handleRemoveMemberClick(userId: string) {
    // Find member info for the dialog
    const member = members.find((m) => m.user_id === userId);
    const displayName =
      member?.club_display_name ||
      member?.users?.display_name ||
      member?.users?.email ||
      "this member";

    setMemberToRemove({ userId, displayName });
  }

  async function handleConfirmRemoveMember() {
    if (!memberToRemove) return;

    startTransition(async () => {
      const result = await removeMember(clubId, memberToRemove.userId);
      if (result && "error" in result && result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setError(null);
        toast.success("Member removed successfully");
        // Refresh members data
        const refreshResult = await refreshMembersData(clubId);
        if (refreshResult.error) {
          toast.error(refreshResult.error);
        } else {
          setMembers(refreshResult.members);
        }
      }
      setMemberToRemove(null);
    });
  }

  return (
    <>
      <div className="">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
          {/* Header - Desktop only */}
          <div className="hidden md:flex items-center justify-between mb-6">
            <div>
              <h1 className="text-lg font-semibold text-[var(--club-accent,var(--text-primary))]">
                Members
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                {filteredAndSortedMembers.length} members
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Join Requests button - only for admins on public_moderated clubs */}
              {isAdmin && clubPrivacy === "public_moderated" && requestsCount > 0 && (
                <Button variant="secondary" onClick={() => setShowJoinRequestsModal(true)}>
                  <Queue className="mr-2 h-4 w-4" />
                  Join Requests
                  <Badge variant="primary" size="sm" className="ml-2">
                    {requestsCount}
                  </Badge>
                </Button>
              )}
              {/* Invite button */}
              {(isAdmin || clubSettings.allow_critics_to_invite) && (
                <Button variant="club-accent" onClick={() => setShowInviteModal(true)}>
                  <UserPlus className="mr-2 h-4 w-4" /> Invite Members
                </Button>
              )}
            </div>
          </div>

          {error && (
            <Card variant="outlined" className="mb-4 border-red-500/30 bg-red-900/10">
              <CardContent className="p-4">
                <Text size="sm" className="text-red-400">
                  {error}
                </Text>
              </CardContent>
            </Card>
          )}

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <Input
                placeholder="Search members..."
                className="pl-10 h-9 search-input-debossed"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(20);
                }}
              />
            </div>

            {/* Role Filter Pills */}
            <div className="flex gap-1.5">
              {roleFilterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setRoleFilter(option.value as typeof roleFilter);
                    setVisibleCount(20);
                  }}
                  className={cn(
                    "h-8 px-3 rounded-full text-xs font-medium transition-colors",
                    roleFilter === option.value
                      ? "bg-[var(--club-accent,var(--primary))] text-white"
                      : "bg-[var(--surface-1)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Sort Dropdown with direction toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  Sort: {sortOptions.find((o) => o.value === sortBy)?.label}
                  {sortDirection === "asc" ? (
                    <CaretUp className="w-3 h-3 opacity-50" />
                  ) : (
                    <CaretDown className="w-3 h-3 opacity-50" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {sortOptions.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={sortBy === option.value}
                    onCheckedChange={() => handleSortChange(option.value)}
                  >
                    {option.label}
                    {sortBy === option.value && (
                      <span className="ml-auto text-[var(--text-muted)]">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile buttons */}
            <div className="flex items-center gap-2 ml-auto md:hidden">
              {/* Mobile Join Requests button */}
              {isAdmin && clubPrivacy === "public_moderated" && requestsCount > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setShowJoinRequestsModal(true)}
                >
                  <Queue className="mr-1.5 h-3.5 w-3.5" />
                  Requests
                  <Badge variant="primary" size="sm" className="ml-1.5">
                    {requestsCount}
                  </Badge>
                </Button>
              )}
              {/* Mobile invite button */}
              {(isAdmin || clubSettings.allow_critics_to_invite) && (
                <Button
                  variant="club-accent"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setShowInviteModal(true)}
                >
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Invite
                </Button>
              )}
            </div>
          </div>

          {/* Members List */}
          {filteredAndSortedMembers.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Text muted>No members found</Text>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-[var(--surface-1)] rounded-lg border border-[var(--border)]">
              <div className="px-3">
                {visibleMembers.map((member) => (
                  <MemberListItem
                    key={member.user_id}
                    member={member}
                    currentUserRole={currentUserRole ?? undefined}
                    currentUserId={currentUserId ?? undefined}
                    onUpdateRole={handleUpdateRole}
                    onRemoveMember={handleRemoveMemberClick}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="px-3 py-3 border-t border-[var(--border)]">
                  <Button
                    variant="ghost"
                    className="w-full text-sm text-muted-foreground"
                    onClick={handleShowMore}
                  >
                    Show More ({filteredAndSortedMembers.length - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmationDialog
        open={memberToRemove !== null}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
        title="Remove Member?"
        description={
          <span>
            Are you sure you want to remove <strong>{memberToRemove?.displayName}</strong> from this
            club? They will lose access to all club content and their incomplete festival ratings
            will be removed.
          </span>
        }
        confirmText="Remove Member"
        onConfirm={handleConfirmRemoveMember}
        variant="danger"
      />

      {/* Join Requests Modal */}
      <Modal
        open={showJoinRequestsModal}
        onOpenChange={setShowJoinRequestsModal}
        title="Join Requests"
        size="lg"
      >
        <JoinRequestsList requests={joinRequests} clubId={clubId} />
      </Modal>

      {/* Invite Members Modal */}
      <InviteMembersModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        clubSlug={clubSlug}
        clubId={clubId}
        clubName={clubName}
        clubPrivacy={clubPrivacy}
      />
    </>
  );
}

"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { userToAvatarData } from "@/lib/avatar-helpers";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/typography";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DotsThree, Flag, Prohibit, EyeSlash, CircleNotch } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, useTransition } from "react";
import { getTargetUserPrivacySettings, checkUserBlocked, blockUser } from "@/app/actions/profile";
import { getUserIDCardStats, getUserFeaturedBadges } from "@/app/actions/id-card";
import { getFeaturedFavorites } from "@/app/actions/profile/favorites";
import { UserIDCard, type UserIDCardUser } from "@/components/id-cards/UserIDCard";
import toast from "react-hot-toast";
import { ReportUserModal } from "./ReportUserModal";
import type { FeaturedBadge, UserIDCardStats } from "@/types/id-card";
import type { UserFavorite } from "@/types/favorites";

interface UserPopupModalProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserPopupModal({ userId, open, onOpenChange }: UserPopupModalProps) {
  const [idCardData, setIdCardData] = useState<{
    user: UserIDCardUser;
    favorites: { featured: UserFavorite[]; club?: { id: string; name: string; slug: string } };
    stats: UserIDCardStats;
    featuredBadges: FeaturedBadge[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfilePopup, setShowProfilePopup] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [minimalUser, setMinimalUser] = useState<{
    display_name: string;
    username: string | null;
    avatar_url: string | null;
    id: string;
  } | null>(null);

  useEffect(() => {
    if (!open || !userId) return;

    async function loadUserData() {
      setLoading(true);
      const supabase = createClient();

      try {
        // Get current user
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        setCurrentUserId(currentUser?.id || null);

        // Don't show popup for own profile
        if (currentUser?.id === userId) {
          setLoading(false);
          return;
        }

        // Check if blocked
        const blocked = await checkUserBlocked(userId);
        setIsBlocked(blocked);

        // Check target user's privacy settings
        const privacySettings = await getTargetUserPrivacySettings(userId);
        setShowProfilePopup(privacySettings.showProfilePopup);

        // Fetch basic user data (needed for both full and minimal views)
        const { data: userData } = await supabase
          .from("users")
          .select(
            "id, display_name, username, avatar_url, email, bio, social_links, avatar_icon, avatar_color_index, avatar_border_color_index, id_card_settings"
          )
          .eq("id", userId)
          .maybeSingle();

        if (!userData) {
          setLoading(false);
          return;
        }

        setMinimalUser({
          id: userData.id,
          display_name: userData.display_name,
          username: userData.username,
          avatar_url: userData.avatar_url,
        });

        // Only load full ID card data if popup is enabled and not blocked
        if (privacySettings.showProfilePopup && !blocked) {
          // Fetch all ID card data in parallel
          const [
            featuredFavoritesResult,
            favoriteClubResult,
            winsResult,
            statsResult,
            featuredBadgesResult,
          ] = await Promise.all([
            getFeaturedFavorites(userId),
            supabase
              .from("favorite_clubs")
              .select("club_id, clubs:club_id!inner(id, name, slug)")
              .eq("user_id", userId)
              .eq("clubs.archived", false)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from("festival_standings")
              .select("rank")
              .eq("user_id", userId)
              .in("rank", [1, 2, 3]),
            getUserIDCardStats(userId),
            getUserFeaturedBadges(userId),
          ]);

          // Count trophy placements
          const festivalWins = { first: 0, second: 0, third: 0 };
          if (winsResult.data) {
            winsResult.data.forEach((s) => {
              if (s.rank === 1) festivalWins.first++;
              else if (s.rank === 2) festivalWins.second++;
              else if (s.rank === 3) festivalWins.third++;
            });
          }

          // Extract favorite club
          const favoriteClubData = favoriteClubResult.data?.clubs;
          const favoriteClub = Array.isArray(favoriteClubData)
            ? (favoriteClubData[0] as { id: string; name: string; slug: string } | undefined)
            : (favoriteClubData as { id: string; name: string; slug: string } | null | undefined);

          const displayName = userData.display_name || userData.email?.split("@")[0] || "User";

          setIdCardData({
            user: {
              id: userData.id,
              name: displayName,
              display_name: displayName,
              username: userData.username,
              avatar_url: userData.avatar_url,
              bio: userData.bio,
              email: userData.email,
              avatar_icon: userData.avatar_icon,
              avatar_color_index: userData.avatar_color_index,
              avatar_border_color_index: userData.avatar_border_color_index,
              social_links: userData.social_links as UserIDCardUser["social_links"],
              id_card_settings: userData.id_card_settings as UserIDCardUser["id_card_settings"],
            },
            favorites: {
              featured: featuredFavoritesResult.data || [],
              club: favoriteClub || undefined,
            },
            stats:
              "data" in statsResult ? statsResult.data : { clubsCount: 0, moviesWatchedCount: 0 },
            featuredBadges: "data" in featuredBadgesResult ? featuredBadgesResult.data : [],
          });
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, [open, userId]);

  const handleBlock = () => {
    startTransition(async () => {
      const result = await blockUser(userId);
      if (result.success) {
        toast.success("User blocked");
        setIsBlocked(true);
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  };

  // Don't show for own profile
  if (currentUserId === userId) {
    return null;
  }

  if (!minimalUser && !loading) return null;

  const displayName = minimalUser?.display_name || "User";

  // Blocked view
  if (isBlocked && !loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User Blocked</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-4">
              <Prohibit className="h-8 w-8 text-[var(--text-muted)]" />
            </div>
            <Text size="sm" muted>
              You have blocked this user or they have blocked you.
            </Text>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Minimal view when profile popup is disabled
  if (!showProfilePopup && !loading && minimalUser) {
    return (
      <>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>User Profile</DialogTitle>
            </DialogHeader>
            <div className="py-6 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <EntityAvatar entity={userToAvatarData(minimalUser)} emojiSet="user" size="lg" />
                <div className="text-left">
                  <Text size="md" className="font-semibold">
                    {displayName}
                  </Text>
                  {minimalUser.username && (
                    <Text size="tiny" muted>
                      @{minimalUser.username}
                    </Text>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-3">
                <EyeSlash className="h-6 w-6 text-[var(--text-muted)]" />
              </div>
              <Text size="sm" muted>
                This user has disabled profile previews
              </Text>
              <div className="flex gap-2 justify-center mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBlock}
                  disabled={isPending}
                  className="text-[var(--error)] hover:opacity-80 hover:bg-[var(--error)]/10"
                >
                  {isPending ? (
                    <CircleNotch className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Prohibit className="h-4 w-4 mr-2" />
                  )}
                  Block
                </Button>
                <Button variant="outline" size="sm" onClick={() => setReportModalOpen(true)}>
                  <Flag className="h-4 w-4 mr-2" />
                  Report
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <ReportUserModal
          userId={userId}
          userName={displayName}
          open={reportModalOpen}
          onOpenChange={setReportModalOpen}
        />
      </>
    );
  }

  // Full profile view — renders the UserIDCard
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg p-0 overflow-hidden bg-transparent border-none shadow-none">
          {loading ? (
            <div className="py-12 text-center bg-[var(--card)] rounded-2xl">
              <CircleNotch className="h-6 w-6 animate-spin mx-auto text-[var(--text-muted)]" />
            </div>
          ) : idCardData ? (
            <div className="space-y-3">
              {/* The ID Card */}
              <UserIDCard
                user={idCardData.user}
                favorites={idCardData.favorites}
                stats={idCardData.stats}
                featuredBadges={idCardData.featuredBadges}
                variant="full"
              />

              {/* Action bar below the card */}
              <div className="flex items-center justify-end px-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-[var(--text-muted)]"
                    >
                      <DotsThree className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={handleBlock}
                      disabled={isPending}
                      className="text-red-500 focus:text-red-600"
                    >
                      <Prohibit className="h-4 w-4 mr-2" />
                      Block User
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setReportModalOpen(true)}>
                      <Flag className="h-4 w-4 mr-2" />
                      Report User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <ReportUserModal
        userId={userId}
        userName={displayName}
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
      />
    </>
  );
}

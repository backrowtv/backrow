"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  House,
  Sparkle,
  User,
  Lightning,
  X,
  Gear,
  SignOut,
  CaretRight,
  Star,
} from "@phosphor-icons/react";
import { useMobileSidebar } from "./MobileSidebarContext";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { BrandText } from "@/components/ui/brand-text";
import { Avatar } from "@/components/ui/avatar";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { clubToAvatarData } from "@/lib/avatar-helpers";
import { signOut } from "@/app/actions/auth";
import { useUserProfile } from "@/components/auth/UserProfileProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { getAvatarIconSrc, getAvatarColor, getAvatarBorderColor } from "@/lib/avatar-constants";
import Image from "next/image";

interface Club {
  id: string;
  name: string;
  slug: string | null;
  picture_url?: string | null;
  logo_url?: string | null;
  settings?: unknown;
}

export function MobileSidebar() {
  const { isOpen, close } = useMobileSidebar();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [favoriteClub, setFavoriteClub] = useState<Club | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const supabase = createClient();
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Get user profile from shared provider - automatically updates when profile changes
  const { user: authUser } = useAuth();
  const { profile: sharedProfile } = useUserProfile();

  // Map shared profile to local format
  const user = sharedProfile
    ? {
        id: sharedProfile.id,
        email: sharedProfile.email || "",
        display_name: sharedProfile.display_name ?? undefined,
        avatar_url: sharedProfile.avatar_url ?? undefined,
        avatar_icon: sharedProfile.avatar_icon,
        avatar_color_index: sharedProfile.avatar_color_index,
        avatar_border_color_index: sharedProfile.avatar_border_color_index,
      }
    : null;

  // Get avatar icon, color, and border color from proper columns
  const avatarIcon = user?.avatar_icon;
  const avatarColorIndex = user?.avatar_color_index;
  const avatarBorderColorIndex = user?.avatar_border_color_index;
  const avatarIconSrc = avatarIcon ? getAvatarIconSrc(avatarIcon, "user") : null;
  const defaultAvatarIcon = avatarIconSrc ? (
    <Image
      src={avatarIconSrc}
      alt=""
      width={64}
      height={64}
      className="w-[65%] h-[65%] object-contain"
      draggable={false}
    />
  ) : avatarIcon && avatarIcon !== "letter" && avatarIcon !== "photo" ? (
    (user?.display_name || "?").charAt(0).toUpperCase()
  ) : undefined;
  const defaultAvatarColor =
    avatarColorIndex != null ? getAvatarColor(avatarColorIndex) : undefined;
  const defaultAvatarBorderColor = getAvatarBorderColor(avatarBorderColorIndex ?? undefined);

  // Founder accounts get branded primary border on uploaded photos
  const isFounder = user?.email === "stephen@backrow.tv";

  // Load clubs data when auth user changes
  useEffect(() => {
    async function loadClubs() {
      if (!authUser) {
        setClubs([]);
        setFavoriteClub(null);
        return;
      }

      // Fetch user preferences for absolute favorite
      const { data: userData } = await supabase
        .from("users")
        .select("mobile_nav_preferences")
        .eq("id", authUser.id)
        .single();

      const mobileNavPrefs = userData?.mobile_nav_preferences as { favoriteClubId?: string } | null;
      const absoluteFavoriteId = mobileNavPrefs?.favoriteClubId || null;

      // Fetch all favorite clubs from favorite_clubs table (starred clubs)
      // Ordered by created_at ascending so longest-favorited is first
      const { data: favoriteClubsData } = await supabase
        .from("favorite_clubs")
        .select("club_id")
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: true });

      const favoriteClubIds = new Set((favoriteClubsData || []).map((f) => f.club_id));

      const { data: memberships } = await supabase
        .from("club_members")
        .select("club_id")
        .eq("user_id", authUser.id);

      if (!memberships || memberships.length === 0) {
        setClubs([]);
        setFavoriteClub(null);
        return;
      }

      const clubIds = memberships.map((m) => m.club_id);

      // Fetch the absolute favorite club separately to ensure it's always included
      let absoluteFavoriteClub: Club | null = null;
      if (absoluteFavoriteId && clubIds.includes(absoluteFavoriteId)) {
        const { data } = await supabase
          .from("clubs")
          .select(
            "id, name, slug, picture_url, settings, avatar_icon, avatar_color_index, avatar_border_color_index"
          )
          .eq("id", absoluteFavoriteId)
          .eq("archived", false)
          .single();
        absoluteFavoriteClub = data;
      }

      // Fetch other clubs (excluding absolute favorite)
      const otherClubIds = absoluteFavoriteId
        ? clubIds.filter((id) => id !== absoluteFavoriteId)
        : clubIds;

      let otherClubs: Club[] = [];
      if (otherClubIds.length > 0) {
        const { data: clubsData } = await supabase
          .from("clubs")
          .select(
            "id, name, slug, picture_url, settings, avatar_icon, avatar_color_index, avatar_border_color_index"
          )
          .in("id", otherClubIds)
          .eq("archived", false)
          .order("created_at", { ascending: false });

        // Sort: favorited clubs first, then by created_at
        otherClubs = (clubsData || []).sort((a, b) => {
          const aIsFavorite = favoriteClubIds.has(a.id);
          const bIsFavorite = favoriteClubIds.has(b.id);

          if (aIsFavorite && !bIsFavorite) return -1;
          if (!aIsFavorite && bIsFavorite) return 1;
          return 0; // Keep original order (by created_at desc) within each group
        });
      }

      setFavoriteClub(absoluteFavoriteClub);
      setClubs(otherClubs);
    }

    loadClubs();
  }, [supabase, authUser]);

  // Close sidebar on route change
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Focus trap when sidebar is open
  useEffect(() => {
    if (isOpen && sidebarRef.current) {
      const focusableElements = sidebarRef.current.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== "Tab") return;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      };

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") close();
      };

      window.addEventListener("keydown", handleTab);
      window.addEventListener("keydown", handleEscape);
      return () => {
        window.removeEventListener("keydown", handleTab);
        window.removeEventListener("keydown", handleEscape);
      };
    }
  }, [isOpen, close]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
  };

  if (!user) {
    return null;
  }

  const navItems = [
    { icon: House, label: "Home", href: "/" },
    { icon: Sparkle, label: "Discover", href: "/discover" },
    { icon: Lightning, label: "Activity", href: "/activity" },
    { icon: User, label: "Profile", href: "/profile" },
    { icon: Gear, label: "Settings", href: "/profile/settings" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 md:hidden",
          "bg-black/60 backdrop-blur-sm",
          "transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={close}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50",
          "w-[300px] max-w-[85vw]",
          "bg-[var(--background)] border-r border-[var(--border)]",
          "flex flex-col",
          "md:hidden",
          "transform transition-transform duration-300 ease-out",
          "will-change-transform",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Mobile navigation"
        aria-hidden={!isOpen}
      >
        {/* Header with user info */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <Link href="/profile" className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar
              src={user.avatar_url}
              alt={user.display_name || user.email}
              size="lg"
              defaultAvatarIcon={defaultAvatarIcon}
              defaultAvatarColor={defaultAvatarColor}
              defaultAvatarBorderColor={defaultAvatarBorderColor}
              useBrandedBorder={isFounder}
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[var(--text-primary)] truncate">
                {user.display_name || "User"}
              </p>
              <p className="text-sm text-[var(--text-muted)] truncate">{user.email}</p>
            </div>
          </Link>
          <button
            onClick={close}
            className={cn(
              "flex items-center justify-center",
              "w-10 h-10 -mr-2",
              "rounded-xl",
              "text-[var(--text-muted)]",
              "transition-all duration-200",
              "hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]",
              "active:scale-95"
            )}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {/* Main nav items */}
          <div className="px-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3",
                    "h-12 px-3 rounded-xl",
                    "transition-all duration-200",
                    isActive
                      ? "text-[var(--text-primary)] font-semibold bg-[var(--surface-2)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Clubs section */}
          {(favoriteClub || clubs.length > 0) && (
            <div className="mt-6 pt-6 border-t border-[var(--border)]">
              <div className="px-4 mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Your Clubs
                </h3>
                <Link href="/clubs" className="text-xs text-[var(--primary)]">
                  View all
                </Link>
              </div>
              <div className="px-3 space-y-1">
                {/* Favorite club first */}
                {favoriteClub && favoriteClub.slug && (
                  <Link
                    href={`/club/${favoriteClub.slug}`}
                    className={cn(
                      "flex items-center gap-3",
                      "h-12 px-3 rounded-xl",
                      "transition-all duration-200",
                      pathname.startsWith(`/club/${favoriteClub.slug}`)
                        ? "text-[var(--text-primary)] font-semibold bg-[var(--surface-2)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <EntityAvatar
                        entity={clubToAvatarData(favoriteClub)}
                        emojiSet="club"
                        size="sm"
                      />
                      <Star
                        className="absolute -top-1 -right-1 h-3 w-3 text-[var(--warning)]"
                        weight="fill"
                      />
                    </div>
                    <span className="font-medium truncate">{favoriteClub.name}</span>
                    <CaretRight className="h-4 w-4 ml-auto flex-shrink-0 text-[var(--text-muted)]" />
                  </Link>
                )}
                {/* Other clubs */}
                {clubs.map((club) => {
                  if (!club.slug) return null;
                  return (
                    <Link
                      key={club.id}
                      href={`/club/${club.slug}`}
                      className={cn(
                        "flex items-center gap-3",
                        "h-12 px-3 rounded-xl",
                        "transition-all duration-200",
                        pathname.startsWith(`/club/${club.slug}`)
                          ? "text-[var(--text-primary)] font-semibold bg-[var(--surface-2)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      <EntityAvatar
                        entity={clubToAvatarData(club)}
                        emojiSet="club"
                        size="sm"
                        className="flex-shrink-0"
                      />
                      <span className="font-medium truncate">
                        <BrandText>{club.name}</BrandText>
                      </span>
                      <CaretRight className="h-4 w-4 ml-auto flex-shrink-0 text-[var(--text-muted)]" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        {/* Footer with sign out */}
        <div className="p-3 border-t border-[var(--border)]">
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className={cn(
              "flex items-center gap-3 w-full",
              "h-12 px-3 rounded-xl",
              "text-[var(--error)]",
              "transition-all duration-200",
              "hover:bg-[var(--error)]/10",
              "disabled:opacity-50"
            )}
          >
            <SignOut className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">{isSigningOut ? "Signing out..." : "Sign out"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}

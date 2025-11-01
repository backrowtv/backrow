"use client";

import { Logo } from "@/components/shared/Logo";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle, ThemeMenuItem } from "@/components/ui/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useTransition, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UserCircle,
  ShieldCheck,
  Gear,
  SignOut,
  MagnifyingGlass,
  Question,
} from "@phosphor-icons/react";
import { useSidebar } from "./SidebarContext";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUserProfile } from "@/components/auth/UserProfileProvider";
import { getAvatarIconSrc, getAvatarColor, getAvatarBorderColor } from "@/lib/avatar-constants";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { BrandText } from "@/components/ui/brand-text";

// MarqueeText component for overflowing text with ticker effect
interface MarqueeTextProps {
  children: React.ReactNode;
  className?: string;
  maxWidthPx: number;
  href?: string;
  title?: string;
}

function MarqueeText({ children, className = "", maxWidthPx, href, title }: MarqueeTextProps) {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Estimate if text will overflow based on character count
  // Average character width ~9px for this font size (semibold), so maxWidthPx / 9 = approx char limit
  const text = typeof children === "string" ? children : "";
  const estimatedCharLimit = Math.floor(maxWidthPx / 9);
  const likelyOverflows = text.length > estimatedCharLimit;

  // Start animation after delay if text is likely to overflow
  useEffect(() => {
    if (!likelyOverflows) {
      setShouldAnimate(false);
      return;
    }

    const timer = setTimeout(() => {
      setShouldAnimate(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [likelyOverflows, children]);

  // Calculate animation duration based on text length
  const animationDuration = Math.max(8, text.length * 0.4);

  const marqueeContent = (
    <div
      className="overflow-hidden"
      // Only use fixed width when animating (needs consistent width for marquee)
      // Otherwise use max-width to allow natural shrinking for short names
      style={
        likelyOverflows ? { width: maxWidthPx, maxWidth: maxWidthPx } : { maxWidth: maxWidthPx }
      }
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div
        className="inline-flex whitespace-nowrap items-center"
        style={
          shouldAnimate
            ? {
                animation: `marquee ${animationDuration}s linear infinite`,
                animationPlayState: isPaused ? "paused" : "running",
              }
            : undefined
        }
      >
        <span className={className}>
          <BrandText>{children}</BrandText>
        </span>
        {shouldAnimate && (
          <>
            <span className={cn("mx-4 opacity-40", className)}>•</span>
            <span className={className}>
              <BrandText>{children}</BrandText>
            </span>
            <span className={cn("mx-4 opacity-40", className)}>•</span>
          </>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} title={title} className="no-underline" style={{ color: "inherit" }}>
        {marqueeContent}
      </Link>
    );
  }

  return <div>{marqueeContent}</div>;
}

// Smooth easing for header transitions
const headerTransition = {
  duration: 0.6,
  ease: [0.25, 0.1, 0.25, 1] as const,
};

// Page title mapping for header
const getPageTitle = (pathname: string): string | null => {
  if (pathname === "/") return null; // Show logo on home
  if (pathname === "/clubs") return "Clubs";
  if (pathname === "/discover") return "Discover";
  if (pathname === "/profile") return "Profile";
  if (pathname.startsWith("/profile/")) return "Profile";
  if (pathname === "/search") return "Search";
  if (pathname === "/activity") return "Activity";
  if (pathname === "/timeline") return "Timeline";
  if (pathname === "/create-club") return "New Club";
  if (pathname === "/admin") return "Admin";
  if (pathname === "/faq") return "FAQ";
  if (pathname === "/contact") return "Contact";
  if (pathname === "/feedback") return "Feedback";
  if (pathname === "/privacy-policy") return "Privacy Policy";
  if (pathname === "/terms-of-use") return "Terms of Use";
  if (pathname === "/user-agreement") return "User Agreement";
  if (pathname === "/blog") return "Blog";
  if (pathname.startsWith("/blog/")) return "Blog";
  if (pathname.startsWith("/club/")) return null; // Club name loaded dynamically
  return null;
};

const ADMIN_EMAIL = "stephen@backrow.tv";

export function TopNav() {
  // Get auth state from provider - this is set from server, no waiting needed
  const { user: authUser } = useAuth();
  // Get user profile from shared provider - automatically updates when profile changes
  const { profile: sharedProfile } = useUserProfile();
  // Map shared profile to local format for compatibility
  const userProfile = sharedProfile
    ? {
        email: sharedProfile.email,
        avatar_url: sharedProfile.avatar_url ?? undefined,
        display_name: sharedProfile.display_name ?? undefined,
        avatar_icon: sharedProfile.avatar_icon,
        avatar_color_index: sharedProfile.avatar_color_index,
        avatar_border_color_index: sharedProfile.avatar_border_color_index,
      }
    : null;

  // Get avatar icon, color, and border color from proper columns
  const avatarIcon = userProfile?.avatar_icon;
  const avatarColorIndex = userProfile?.avatar_color_index;
  const avatarBorderColorIndex = userProfile?.avatar_border_color_index;
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
    (userProfile?.display_name || "?").charAt(0).toUpperCase()
  ) : undefined;
  const defaultAvatarColor =
    avatarColorIndex != null ? getAvatarColor(avatarColorIndex as number) : undefined;
  const defaultAvatarBorderColor = getAvatarBorderColor(avatarBorderColorIndex ?? undefined);
  const isAdmin = authUser?.email === ADMIN_EMAIL;
  // Founder accounts get branded primary border on uploaded photos
  const isFounder = userProfile?.email === "stephen@backrow.tv";
  const [clubInfo, setClubInfo] = useState<{ name: string; slug: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Check if we're on the marketing landing page (unauthenticated home)
  const isMarketingPage = pathname === "/" && !authUser;

  // Check if we're on a club page
  const isClubPage = pathname.startsWith("/club/");

  // Get total sidebar offset for header positioning (main sidebar + secondary sidebar)
  const { totalLeftOffset } = useSidebar();

  // Get page title for mobile
  const pageTitle = getPageTitle(pathname);

  // Calculate the raw display title
  const rawDisplayTitle = isClubPage ? clubInfo?.name : pageTitle;

  // Track the stable display title to prevent flashing during transitions
  // Only update when we have a definitive value (not loading club info)
  const lastStableTitleRef = useRef<string | null>(null);
  const isLoadingClubInfo = isClubPage && !clubInfo;

  // Determine the display title: use stable value during loading states
  const displayTitle = isLoadingClubInfo
    ? lastStableTitleRef.current // Keep showing previous during club load
    : rawDisplayTitle;

  // Update the stable title ref when we have a real value
  useEffect(() => {
    if (!isLoadingClubInfo) {
      lastStableTitleRef.current = rawDisplayTitle ?? null;
    }
  }, [rawDisplayTitle, isLoadingClubInfo]);

  // Load club name when on a club page
  useEffect(() => {
    if (!isClubPage) {
      setClubInfo(null);
      return;
    }

    async function loadClubInfo() {
      try {
        // Extract club identifier from pathname (e.g., /club/my-club-slug or /club/uuid)
        const pathParts = pathname.split("/").filter(Boolean);
        if (pathParts.length < 2 || pathParts[0] !== "club") {
          setClubInfo(null);
          return;
        }

        const clubIdentifier = pathParts[1];

        // Check if identifier is a UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          clubIdentifier
        );

        let clubQuery = supabase.from("clubs").select("name, slug");

        if (isUUID) {
          clubQuery = clubQuery.eq("id", clubIdentifier);
        } else {
          clubQuery = clubQuery.eq("slug", clubIdentifier);
        }

        const { data: club, error } = await clubQuery.maybeSingle();

        if (error) {
          console.error("TopNav: Club error", error);
          setClubInfo(null);
          return;
        }

        if (club) {
          setClubInfo({ name: club.name, slug: club.slug || clubIdentifier });
        } else {
          setClubInfo(null);
        }
      } catch (error) {
        console.error("TopNav: Error loading club", error);
        setClubInfo(null);
      }
    }

    loadClubInfo();
  }, [pathname, isClubPage, supabase]);

  // Keyboard shortcut: Cmd/Ctrl + K to navigate to search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        router.push("/search");
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [router]);

  // Hide TopNav entirely on marketing page
  if (isMarketingPage) return null;

  return (
    <>
      {/* Mobile Header - Full width bar (hidden on lg+) */}
      <header
        className={cn(
          "lg:hidden",
          "fixed top-0 left-0 right-0 z-50",
          "h-14",
          isMarketingPage
            ? "bg-transparent"
            : "border-b border-[var(--border)]/50 bg-[var(--background)]"
        )}
      >
        <div className="flex items-center justify-between h-full px-4">
          {/* Left section - Logo + Page title with smooth slide animations */}
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            {/* Icon is always visible and fixed */}
            <Link
              href="/"
              className="flex items-center no-underline transition-transform duration-200 hover:scale-105 flex-shrink-0"
            >
              <Logo variant="icon" size="sm" />
            </Link>

            {/* Animated text content - slides in/out from logo */}
            <AnimatePresence mode="wait" initial={false}>
              {!displayTitle ? (
                <motion.div
                  key="text-logo"
                  initial={{ x: -12, opacity: 0 }}
                  animate={{ x: 0, opacity: 1, transition: headerTransition }}
                  exit={{ x: -12, opacity: 0, transition: headerTransition }}
                >
                  <Link href="/" className="no-underline">
                    <Logo variant="text" size="sm" />
                  </Link>
                </motion.div>
              ) : (
                <motion.div
                  key="page-title"
                  className="flex items-center gap-2"
                  initial={{ x: -12, opacity: 0 }}
                  animate={{ x: 0, opacity: 1, transition: headerTransition }}
                  exit={{ x: -12, opacity: 0, transition: headerTransition }}
                >
                  {isClubPage && clubInfo ? (
                    <MarqueeText
                      href={`/club/${clubInfo.slug}`}
                      title={`Go to ${clubInfo.name} dashboard`}
                      maxWidthPx={160}
                      className="text-sm font-semibold text-[var(--primary)]"
                    >
                      {clubInfo.name}
                    </MarqueeText>
                  ) : (
                    <span className="text-sm font-semibold text-[var(--primary)] truncate max-w-[160px]">
                      {displayTitle}
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right section - Controls */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {userProfile && (
              <>
                <Link
                  href="/search"
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] active:scale-95 transition-all"
                  aria-label="Search"
                >
                  <MagnifyingGlass className="h-5 w-5" />
                </Link>

                <NotificationBell />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center rounded-full hover:scale-105 active:scale-95 transition-transform ml-1">
                      <Avatar
                        src={userProfile.avatar_url}
                        alt={userProfile.display_name || userProfile.email || "User"}
                        size="sm"
                        defaultAvatarIcon={defaultAvatarIcon}
                        defaultAvatarColor={defaultAvatarColor}
                        defaultAvatarBorderColor={defaultAvatarBorderColor}
                        useBrandedBorder={isFounder}
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56" variant="rollDown">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium">{userProfile.display_name || "User"}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate">
                        {userProfile.email}
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center gap-2">
                        <UserCircle className="h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile/settings" className="flex items-center gap-2">
                        <Gear className="h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/faq" className="flex items-center gap-2">
                        <Question className="h-4 w-4" />
                        FAQ
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 text-[var(--text-muted)]"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Admin Dashboard
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <ThemeMenuItem />
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() =>
                        startTransition(async () => {
                          await signOut();
                        })
                      }
                      disabled={isPending}
                      className="text-[var(--error)] focus:text-[var(--error)]"
                    >
                      <SignOut className="h-4 w-4 mr-2" />
                      {isPending ? "Signing out..." : "Sign out"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            {!userProfile && !isMarketingPage && <ThemeToggle />}
          </div>
        </div>
      </header>

      {/* Desktop Header - Floating pills (hidden below lg) */}
      <header
        className={cn(
          "hidden lg:block",
          "fixed top-3 right-0 z-50 pointer-events-none",
          "transition-[left] duration-300 ease-in-out"
        )}
        style={{ left: `${totalLeftOffset}px` }}
      >
        {/* Inner container - centered within content area */}
        <div className="mx-auto px-8 flex items-center justify-between gap-3">
          {/* Left floating pill - Logo & Navigation */}
          <div
            className={cn(
              "pointer-events-auto",
              "flex items-center gap-3",
              "h-11 px-3.5",
              "rounded-full",
              "border border-[var(--border)]/40",
              "bg-[var(--surface-1)]/80 backdrop-blur-2xl",
              "shadow-lg shadow-black/5",
              "transition-all duration-300"
            )}
          >
            <Link
              href="/"
              className="flex items-center gap-2 no-underline transition-transform duration-200 hover:scale-105"
            >
              <Logo variant="icon" size="sm" />
              <Logo variant="text" size="sm" />
            </Link>

            {/* Page title or club breadcrumb */}
            {clubInfo ? (
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="text-[var(--text-muted)] select-none">
                  —
                </span>
                <MarqueeText
                  href={`/club/${clubInfo.slug}`}
                  title={`Go to ${clubInfo.name} dashboard`}
                  maxWidthPx={300}
                  className="text-[17px] font-semibold text-[var(--text-primary)] hover:text-[var(--primary)] transition-colors"
                >
                  {clubInfo.name}
                </MarqueeText>
              </div>
            ) : (
              pageTitle && (
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="text-[var(--text-muted)] select-none">
                    —
                  </span>
                  <span className="text-[17px] font-semibold text-[var(--text-primary)]">
                    {pageTitle}
                  </span>
                </div>
              )
            )}
          </div>

          {/* Right floating pill - Controls (hidden on marketing page when empty) */}
          {(userProfile || !isMarketingPage) && (
            <div
              className={cn(
                "pointer-events-auto",
                "flex items-center gap-1.5",
                "h-11 px-2.5",
                "rounded-full",
                "border border-[var(--border)]/40",
                "bg-[var(--surface-1)]/80 backdrop-blur-2xl",
                "shadow-lg shadow-black/5",
                "transition-all duration-300"
              )}
            >
              {userProfile && (
                <>
                  {/* Search - Desktop only */}
                  <Link
                    href="/search"
                    className="flex items-center justify-center w-9 h-9 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-all"
                    aria-label="Search"
                  >
                    <MagnifyingGlass className="h-4 w-4" />
                  </Link>

                  <NotificationBell />

                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center rounded-full hover:scale-105 active:scale-95 transition-transform">
                        <Avatar
                          src={userProfile.avatar_url}
                          alt={userProfile.display_name || userProfile.email || "User"}
                          size="sm"
                          defaultAvatarIcon={defaultAvatarIcon}
                          defaultAvatarColor={defaultAvatarColor}
                          defaultAvatarBorderColor={defaultAvatarBorderColor}
                          useBrandedBorder={isFounder}
                        />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56" variant="rollDown">
                      <div className="px-3 py-2">
                        <p className="text-sm font-medium">{userProfile.display_name || "User"}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          {userProfile.email}
                        </p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="flex items-center gap-2">
                          <UserCircle className="h-4 w-4" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/profile/settings" className="flex items-center gap-2">
                          <Gear className="h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/faq" className="flex items-center gap-2">
                          <Question className="h-4 w-4" />
                          FAQ
                        </Link>
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem asChild>
                          <Link
                            href="/admin"
                            className="flex items-center gap-2 text-[var(--text-muted)]"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            Admin Dashboard
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <ThemeMenuItem />
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          startTransition(async () => {
                            await signOut();
                          })
                        }
                        disabled={isPending}
                        className="text-[var(--error)] focus:text-[var(--error)]"
                      >
                        <SignOut className="h-4 w-4 mr-2" />
                        {isPending ? "Signing out..." : "Sign out"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
              {!userProfile && !isMarketingPage && <ThemeToggle />}
            </div>
          )}
        </div>
      </header>
    </>
  );
}

/**
 * @deprecated This component is deprecated. Use TopNav + Sidebar + MobileNav from @/components/layout instead.
 *
 * DEPRECATED: Use TopNav + Sidebar + MobileNav from @/components/layout instead.
 * This component is kept for backward compatibility temporarily and will be removed in a future version.
 */
"use client";

import { signOut } from "@/app/actions/auth";
import { useTransition, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

// Custom cinema-themed decorative elements
function FilmStripDecoration() {
  return (
    <svg
      className="absolute left-0 top-0 h-full w-32 opacity-5 pointer-events-none"
      viewBox="0 0 128 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      {/* Film strip holes */}
      <circle cx="16" cy="16" r="3" fill="currentColor" />
      <circle cx="16" cy="48" r="3" fill="currentColor" />
      <circle cx="48" cy="16" r="3" fill="currentColor" />
      <circle cx="48" cy="48" r="3" fill="currentColor" />
      <circle cx="80" cy="16" r="3" fill="currentColor" />
      <circle cx="80" cy="48" r="3" fill="currentColor" />
      <circle cx="112" cy="16" r="3" fill="currentColor" />
      <circle cx="112" cy="48" r="3" fill="currentColor" />
      {/* Film strip edges */}
      <rect x="0" y="0" width="128" height="64" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect
        x="0"
        y="12"
        width="128"
        height="40"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
      />
    </svg>
  );
}

function ProjectorLight() {
  return (
    <div className="absolute right-0 top-0 h-full w-48 opacity-10 pointer-events-none overflow-hidden">
      <svg
        className="h-full w-full"
        viewBox="0 0 192 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        {/* Projector light beam */}
        <defs>
          <linearGradient id="projectorGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="50%" stopColor="currentColor" stopOpacity="0.1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 32 L192 0 L192 64 Z"
          fill="url(#projectorGradient)"
          className="text-[var(--text-muted)]"
        />
        {/* Projector lens */}
        <circle
          cx="16"
          cy="32"
          r="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.2"
        />
        <circle cx="16" cy="32" r="4" fill="currentColor" opacity="0.1" />
      </svg>
    </div>
  );
}

function NavLinkIcon({ path }: { path: string }) {
  const icons: Record<string, React.ReactElement> = {
    "/": (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-4 h-4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Film reel grid */}
        <rect x="2" y="2" width="8" height="8" rx="1" fill="currentColor" fillOpacity="0.1" />
        <rect x="14" y="2" width="8" height="8" rx="1" fill="currentColor" fillOpacity="0.1" />
        <rect x="2" y="14" width="8" height="8" rx="1" fill="currentColor" fillOpacity="0.1" />
        <rect x="14" y="14" width="8" height="8" rx="1" fill="currentColor" fillOpacity="0.1" />
        {/* Center dots like film reel holes */}
        <circle cx="6" cy="6" r="1" fill="currentColor" />
        <circle cx="18" cy="6" r="1" fill="currentColor" />
        <circle cx="6" cy="18" r="1" fill="currentColor" />
        <circle cx="18" cy="18" r="1" fill="currentColor" />
      </svg>
    ),
    "/clubs": (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-4 h-4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Cinema seats/club icon */}
        <rect x="3" y="6" width="4" height="6" rx="1" fill="currentColor" fillOpacity="0.1" />
        <rect x="3" y="6" width="4" height="6" rx="1" stroke="currentColor" />
        <rect x="10" y="6" width="4" height="6" rx="1" fill="currentColor" fillOpacity="0.1" />
        <rect x="10" y="6" width="4" height="6" rx="1" stroke="currentColor" />
        <rect x="17" y="6" width="4" height="6" rx="1" fill="currentColor" fillOpacity="0.1" />
        <rect x="17" y="6" width="4" height="6" rx="1" stroke="currentColor" />
        {/* Seat backs */}
        <path d="M3 6 L3 4 L7 4 L7 6" stroke="currentColor" />
        <path d="M10 6 L10 4 L14 4 L14 6" stroke="currentColor" />
        <path d="M17 6 L17 4 L21 4 L21 6" stroke="currentColor" />
      </svg>
    ),
    "/discover": (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-4 h-4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Movie spotlight/search */}
        <circle cx="11" cy="11" r="8" fill="currentColor" fillOpacity="0.1" />
        <circle cx="11" cy="11" r="8" stroke="currentColor" />
        {/* Search handle styled like a film strip */}
        <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" />
        <rect x="19" y="19" width="2" height="2" rx="0.5" fill="currentColor" />
      </svg>
    ),
    "/faq": (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-4 h-4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Film reel with question mark */}
        <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.1" />
        <circle cx="12" cy="12" r="10" stroke="currentColor" />
        {/* Question mark */}
        <circle cx="12" cy="9" r="1.5" fill="currentColor" />
        <path d="M12 12v3" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="16.5" r="0.5" fill="currentColor" />
        {/* Film reel center */}
        <circle cx="12" cy="12" r="2" fill="currentColor" fillOpacity="0.2" />
      </svg>
    ),
  };

  return icons[path] || null;
}

function MobileMenuButton({ onClick, isOpen }: { onClick: () => void; isOpen: boolean }) {
  return (
    <button
      onClick={onClick}
      className="md:hidden relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-[var(--surface-1)] border border-[var(--border)] hover:border-[var(--primary)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2"
      aria-label="Toggle menu"
    >
      <div className="relative w-5 h-5">
        <span
          className={`absolute top-0 left-0 w-5 h-0.5 bg-current transition-all duration-300 ${
            isOpen ? "rotate-45 translate-y-2" : ""
          }`}
        />
        <span
          className={`absolute top-2 left-0 w-5 h-0.5 bg-current transition-all duration-300 ${
            isOpen ? "opacity-0" : ""
          }`}
        />
        <span
          className={`absolute top-4 left-0 w-5 h-0.5 bg-current transition-all duration-300 ${
            isOpen ? "-rotate-45 -translate-y-2" : ""
          }`}
        />
      </div>
    </button>
  );
}

function MobileMenu({
  isOpen,
  user,
  pathname,
  onSignOut,
  isPending,
}: {
  isOpen: boolean;
  user: { email?: string; id?: string } | null;
  pathname: string;
  onSignOut: () => void;
  isPending: boolean;
}) {
  const isActive = (path: string) => pathname === path;

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/clubs", label: "Clubs" },
    { href: "/discover", label: "Discover" },
    { href: "/faq", label: "FAQ" },
  ];

  if (!isOpen) return null;

  return (
    <div className="md:hidden absolute top-full left-0 right-0 bg-[var(--surface-4)]/95 backdrop-blur-xl border-b border-[var(--border)] shadow-[var(--shadow-xl)]">
      <div className="px-[var(--spacing-4)] py-[var(--spacing-6)] space-y-[var(--spacing-4)]">
        {user && (
          <>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                data-tour={link.href === "/discover" ? "discover" : undefined}
                className={cn(
                  "flex items-center gap-[var(--spacing-3)]",
                  "px-[var(--spacing-4)] py-[var(--spacing-3)]",
                  "rounded-lg transition-all",
                  "min-h-[44px]", // WCAG minimum
                  isActive(link.href)
                    ? "text-[var(--text-primary)] font-semibold bg-[var(--surface-2)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
                )}
              >
                <NavLinkIcon path={link.href} />
                <span className="font-medium text-[var(--font-body-sm-size)]">{link.label}</span>
              </Link>
            ))}
            <div className="pt-[var(--spacing-4)] border-t border-[var(--border)]">
              <Link
                href="/profile"
                data-tour="profile"
                className="flex items-center gap-[var(--spacing-3)] px-[var(--spacing-4)] py-[var(--spacing-3)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)] transition-all min-h-[44px]"
              >
                <Avatar src={undefined} alt={user.email} size="sm" />
                <span className="font-medium">{user.email}</span>
              </Link>
            </div>
            <Button
              variant="ghost"
              size="md"
              onClick={onSignOut}
              disabled={isPending}
              className="w-full justify-start"
            >
              {isPending ? "Signing out..." : "Sign Out"}
            </Button>
          </>
        )}
        {!user && (
          <div className="flex flex-col gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" size="md" className="w-full">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="md" className="w-full">
                Sign Up
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export function Navigation() {
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const supabase = createClient();
  const pathname = usePathname();

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    }
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      getUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Close mobile menu when route changes
  useEffect(() => {
    startTransition(() => {
      setMobileMenuOpen(false);
    });
  }, [pathname]);

  async function handleSignOut() {
    startTransition(async () => {
      await signOut();
    });
  }

  const isActive = (path: string) => pathname === path;

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/clubs", label: "Clubs" },
    { href: "/discover", label: "Discover" },
    { href: "/faq", label: "FAQ" },
  ];

  return (
    <nav className="relative border-b border-[var(--border)] bg-[var(--surface-4)] backdrop-blur-xl sticky top-0 z-50">
      {/* Decorative elements */}
      <FilmStripDecoration />
      <ProjectorLight />

      <div className="relative mx-auto max-w-7xl px-[var(--spacing-4)] sm:px-[var(--spacing-6)] lg:px-[var(--spacing-8)]">
        <div className="flex h-20 items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center gap-[var(--spacing-6)]">
            <Link
              href="/"
              className="group flex items-center gap-[var(--spacing-3)] text-[var(--text-primary)] transition-all hover:opacity-90"
            >
              <div className="relative">
                <Logo
                  variant="full"
                  size="md"
                  className="text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors"
                />
                {/* Subtle glow effect on hover */}
                <div className="absolute inset-0 blur-xl opacity-0 group-hover:opacity-20 bg-[var(--primary)] transition-opacity -z-10" />
              </div>
            </Link>
          </div>

          {/* Center Navigation - Desktop */}
          {user && (
            <div className="hidden md:flex items-center gap-[var(--spacing-1)]">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  data-tour={link.href === "/discover" ? "discover" : undefined}
                  className={cn(
                    "group relative flex items-center gap-[var(--spacing-2)]",
                    "px-[var(--spacing-5)] py-[var(--spacing-2)]",
                    "rounded-lg font-medium",
                    "text-[var(--font-body-sm-size)]",
                    "transition-all",
                    "min-h-[44px]", // WCAG minimum
                    isActive(link.href)
                      ? "text-[var(--primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {/* Active indicator */}
                  {isActive(link.href) && (
                    <div className="absolute inset-0 bg-[var(--primary)]/10 rounded-lg border border-[var(--primary)]/30" />
                  )}
                  {/* Icon */}
                  <span
                    className={cn(
                      "relative z-10",
                      isActive(link.href)
                        ? "text-[var(--primary)]"
                        : "text-[var(--text-muted)] group-hover:text-[var(--primary)]"
                    )}
                  >
                    <NavLinkIcon path={link.href} />
                  </span>
                  {/* Label */}
                  <span className="relative z-10">{link.label}</span>
                  {/* Hover glow */}
                  {!isActive(link.href) && (
                    <div className="absolute inset-0 rounded-lg bg-[var(--primary)]/0 group-hover:bg-[var(--primary)]/5 transition-colors" />
                  )}
                </Link>
              ))}
            </div>
          )}

          {/* Right Side Actions */}
          <div className="flex items-center gap-[var(--spacing-3)]">
            <ThemeToggle />

            {user ? (
              <>
                {/* Profile - Desktop */}
                <Link
                  href="/profile"
                  data-tour="profile"
                  className="hidden sm:flex items-center gap-[var(--spacing-3)] px-[var(--spacing-4)] py-[var(--spacing-2)] rounded-lg bg-[var(--surface-1)] border border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--surface-2)] transition-all group min-h-[44px]"
                >
                  <Avatar src={undefined} alt={user.email} size="sm" />
                  <span className="text-[var(--font-body-sm-size)] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                    {user.email}
                  </span>
                </Link>

                {/* Sign Out - Desktop */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  disabled={isPending}
                  className="hidden sm:flex"
                >
                  {isPending ? "Signing out..." : "Sign Out"}
                </Button>

                {/* Mobile Menu Button */}
                <MobileMenuButton
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  isOpen={mobileMenuOpen}
                />
              </>
            ) : (
              <>
                <Link href="/sign-in" className="hidden sm:block">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-up" className="hidden sm:block">
                  <Button size="sm">Sign Up</Button>
                </Link>
                <MobileMenuButton
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  isOpen={mobileMenuOpen}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        user={user}
        pathname={pathname}
        onSignOut={handleSignOut}
        isPending={isPending}
      />
    </nav>
  );
}

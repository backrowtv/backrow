/**
 * TestAuthWidget - Development Testing Helper
 *
 * ⚠️ DEVELOPMENT ONLY - DO NOT USE IN PRODUCTION
 *
 * This component provides quick sign-in/sign-out functionality for testing multi-user scenarios.
 * It is completely isolated and only appears when:
 * 1. NODE_ENV !== 'production' AND
 * 2. NEXT_PUBLIC_ENABLE_TEST_AUTH === 'true'
 *
 * To enable:
 *   Add NEXT_PUBLIC_ENABLE_TEST_AUTH=true to your .env.local file
 *
 * To disable:
 *   Remove NEXT_PUBLIC_ENABLE_TEST_AUTH or set it to 'false'
 *
 * Features:
 * - Quick sign-in as test users (Producer, Director, Critic)
 * - Sign-out button
 * - Current user display
 * - Quick navigation links to test pages
 *
 * Test Users: Configure in TEST_USERS array below or via environment variables.
 *
 * Security:
 * - Only available in development environment
 * - Requires explicit feature flag to enable
 * - All test actions are server-side validated
 * - Will not appear in production builds
 */

"use client";

import { useState, useEffect } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { signInTestUser, signOutTest } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  User,
  SignOut,
  CaretDown,
  CaretUp,
  TestTube,
  ArrowSquareOut,
  Shield,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { TEST_USERS, TEST_ROUTES } from "@/lib/test/test-users";

interface TestAuthWidgetProps {
  collapsed?: boolean;
}

// Festival Test Lab club ID for role display
const TEST_CLUB_ID = "e5f389a4-946e-4a4c-bc77-a35c96b8e56a";

export function TestAuthWidget({ collapsed = false }: TestAuthWidgetProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [clubMemberships, setClubMemberships] = useState<
    Array<{ club_id: string; role: string; club_name?: string }>
  >([]);
  const [signInState, signInAction] = useActionState(signInTestUser, null);
  const [signOutState, signOutAction] = useActionState(signOutTest, null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (user) {
        // Get user's role in Test Movie Club
        const { data: membership } = await supabase
          .from("club_members")
          .select("role")
          .eq("club_id", TEST_CLUB_ID)
          .eq("user_id", user.id)
          .maybeSingle();

        setUserRole(membership?.role || null);

        // Get all club memberships with club names
        const { data: memberships } = await supabase
          .from("club_members")
          .select("club_id, role, clubs:club_id(name)")
          .eq("user_id", user.id)
          .limit(5);

        if (memberships) {
          setClubMemberships(
            memberships.map((m) => {
              // Handle Supabase join which may return object or array
              const rawClubs = m.clubs as { name: string } | Array<{ name: string }> | null;
              const club = Array.isArray(rawClubs) ? rawClubs[0] : rawClubs;
              return {
                club_id: m.club_id,
                role: m.role,
                club_name: club?.name || "Unknown Club",
              };
            })
          );
        }
      } else {
        setUserRole(null);
        setClubMemberships([]);
      }
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Refresh after sign in/out using router refresh for better state sync
  useEffect(() => {
    if (signInState?.success || signOutState?.success) {
      // Use router.refresh() to refresh server components and re-fetch data
      // This is better than window.location.reload() as it preserves client state
      router.refresh();
      // Also reload user state
      setTimeout(async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setCurrentUser(user);
      }, 300);
    }
  }, [signInState, signOutState, router, supabase]);

  if (collapsed) {
    return (
      <div className="px-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                  "w-full flex items-center justify-center h-8 rounded transition-all",
                  "hover:bg-[var(--hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                  "border border-[var(--border)] border-dashed"
                )}
                aria-label="Test Auth Helper"
              >
                <TestTube className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs max-w-[200px]">
              <div className="font-semibold mb-1">🧪 Test Auth Helper</div>
              <div className="text-xs">Development only - Quick user switching for testing</div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className="px-1 space-y-2">
      <Card className="border-dashed border-2 border-amber-500/30 bg-amber-500/5">
        <CardHeader className="p-3 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <TestTube className="h-3.5 w-3.5" />
              Test Auth Helper
            </CardTitle>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              aria-label={isOpen ? "Collapse" : "Expand"}
            >
              {isOpen ? <CaretUp className="h-3.5 w-3.5" /> : <CaretDown className="h-3.5 w-3.5" />}
            </button>
          </div>
          <CardDescription className="text-[10px] text-amber-600/80 dark:text-amber-400/80">
            Development only - Quick user switching
          </CardDescription>
        </CardHeader>
        {isOpen && (
          <CardContent className="p-3 pt-0 space-y-3">
            {/* Current User */}
            <div className="p-2 bg-[var(--surface)] rounded text-xs space-y-1.5">
              <div className="font-medium mb-1">Current User:</div>
              {currentUser ? (
                <>
                  <div className="text-[var(--text-muted)] truncate text-[10px]">
                    {currentUser.email || "No email"}
                  </div>
                  {userRole && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Shield className="h-2.5 w-2.5 text-amber-500" />
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">in Test Club</span>
                    </div>
                  )}
                  {clubMemberships.length > 0 && (
                    <div className="mt-1.5 pt-1.5 border-t border-[var(--border)]">
                      <div className="text-[10px] text-[var(--text-muted)] mb-1">
                        Clubs ({clubMemberships.length}):
                      </div>
                      <div className="space-y-0.5">
                        {clubMemberships.slice(0, 3).map((membership) => (
                          <div
                            key={membership.club_id}
                            className="text-[10px] text-[var(--text-muted)] truncate"
                          >
                            {membership.club_name} ({membership.role})
                          </div>
                        ))}
                        {clubMemberships.length > 3 && (
                          <div className="text-[10px] text-[var(--text-muted)]">
                            +{clubMemberships.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-[var(--text-muted)] text-[10px]">Not signed in</div>
              )}
            </div>

            {/* Sign Out */}
            {currentUser && (
              <form action={signOutAction}>
                <Button type="submit" variant="danger" size="sm" className="w-full h-7 text-xs">
                  <SignOut className="h-3 w-3 mr-1.5" />
                  Sign Out
                </Button>
              </form>
            )}

            {/* Test Users */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-medium text-[var(--text-muted)]">Sign in as:</div>
              {TEST_USERS.map((user) => (
                <form key={user.email} action={signInAction}>
                  <input type="hidden" name="email" value={user.email} />
                  <input type="hidden" name="password" value={user.password} />
                  <Button
                    type="submit"
                    variant={currentUser?.email === user.email ? "primary" : "outline"}
                    size="sm"
                    className={cn(
                      "w-full h-7 text-xs justify-start",
                      currentUser?.email === user.email && "opacity-75 cursor-not-allowed"
                    )}
                    disabled={currentUser?.email === user.email}
                  >
                    <User className="h-3 w-3 mr-1.5" />
                    <span className="truncate">{user.name}</span>
                    {currentUser?.email === user.email && (
                      <span className="ml-auto text-[10px]">✓</span>
                    )}
                  </Button>
                </form>
              ))}
            </div>

            {/* Quick Links */}
            <div className="pt-2 border-t border-[var(--border)]">
              <div className="text-[10px] font-medium text-[var(--text-muted)] mb-1.5">
                Quick Links:
              </div>
              <div className="space-y-1">
                {TEST_ROUTES.map((route) => (
                  <Link
                    key={route.path}
                    href={route.path}
                    className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors truncate"
                  >
                    <ArrowSquareOut className="h-2.5 w-2.5" />
                    {route.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Status Messages */}
            {signInState?.error && (
              <div className="p-2 bg-destructive text-white text-[10px] rounded">
                {signInState.error}
              </div>
            )}
            {signInState?.success && (
              <div className="p-2 bg-green-600 text-white text-[10px] rounded">Signed in!</div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInTestUser, signOutTest } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  User,
  SignOut,
  Shield,
  ArrowSquareOut,
  Gear,
  FilmReel,
  Users,
  MusicNote,
  Camera,
  Copy,
  Check,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  TEST_MOVIES,
  TEST_DIRECTORS,
  TEST_ACTORS,
  TEST_COMPOSERS,
  TEST_THEMES,
  PLACEHOLDER_IMAGES,
  getRandomTestMovie,
  getRandomTestDirector,
  getRandomTestActor,
  getRandomTestTheme,
} from "@/lib/test-resources";

interface TestAuthClientProps {
  currentUser: { id: string; email?: string } | null;
}

// Configure test users via environment variables or update this array for local development
const TEST_USERS: Array<{ email: string; password: string; role: string; name: string }> = [
  { email: "test1@backrow.test", password: "TestPass123!", role: "producer", name: "Test User 1" },
  { email: "test2@backrow.test", password: "TestPass123!", role: "director", name: "Test User 2" },
  { email: "test3@backrow.test", password: "TestPass123!", role: "critic", name: "Test User 3" },
  { email: "test4@backrow.test", password: "TestPass123!", role: "critic", name: "Test User 4" },
  { email: "test5@backrow.test", password: "TestPass123!", role: "critic", name: "Test User 5" },
  { email: "test6@backrow.test", password: "TestPass123!", role: "critic", name: "Test User 6" },
];

const TEST_CLUB_ID = "db59cb27-aa7f-4517-a8e9-b87bff9710ec";
const _TEST_CLUB_SLUG = "test-movie-club";

export function TestAuthClient({ currentUser }: TestAuthClientProps) {
  const router = useRouter();
  const [signInState, signInAction] = useActionState(signInTestUser, null);
  const [signOutState, signOutAction] = useActionState(signOutTest, null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [clubMemberships, setClubMemberships] = useState<
    Array<{ club_id: string; role: string; club_name?: string }>
  >([]);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadUserData() {
      if (currentUser) {
        // Get user's role in Test Movie Club
        const { data: membership } = await supabase
          .from("club_members")
          .select("role")
          .eq("club_id", TEST_CLUB_ID)
          .eq("user_id", currentUser.id)
          .maybeSingle();

        setUserRole(membership?.role || null);

        // Get all club memberships with club names
        const { data: memberships } = await supabase
          .from("club_members")
          .select("club_id, role, clubs:club_id(name)")
          .eq("user_id", currentUser.id)
          .limit(5);

        if (memberships) {
          setClubMemberships(
            memberships.map((m) => {
              // Handle clubs relation - can be array or object depending on PostgREST shape
              const clubsData = m.clubs as { name: string } | { name: string }[] | null;
              const clubName = Array.isArray(clubsData) ? clubsData[0]?.name : clubsData?.name;
              return {
                club_id: m.club_id,
                role: m.role,
                club_name: clubName || "Unknown Club",
              };
            })
          );
        }
      } else {
        setUserRole(null);
        setClubMemberships([]);
      }
    }

    loadUserData();
  }, [currentUser, supabase]);

  // Refresh page after successful sign in/out
  useEffect(() => {
    if (signInState?.success || signOutState?.success) {
      router.refresh();
      setTimeout(() => {
        window.location.reload();
      }, 300);
    }
  }, [signInState, signOutState, router]);

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="container mx-auto py-12 max-w-4xl space-y-6">
      {/* Authentication Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Test Authentication Helper
          </CardTitle>
          <CardDescription>
            Quick sign-in/sign-out for testing. Only available in development.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current User */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <p className="text-sm font-medium">Current User:</p>
            {currentUser ? (
              <>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">
                    {currentUser.email || "No email"}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    ID: {currentUser.id.slice(0, 8)}...
                  </p>
                </div>
                {userRole && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Shield className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">in Test Club</span>
                  </div>
                )}
                {clubMemberships.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-[var(--text-muted)] mb-1">
                      Club Memberships ({clubMemberships.length}):
                    </p>
                    <div className="space-y-1">
                      {clubMemberships.slice(0, 3).map((membership) => (
                        <p key={membership.club_id} className="text-xs text-[var(--text-muted)]">
                          {membership.club_name} ({membership.role})
                        </p>
                      ))}
                      {clubMemberships.length > 3 && (
                        <p className="text-xs text-[var(--text-muted)]">
                          +{clubMemberships.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">Not signed in</p>
            )}
          </div>

          {/* Sign Out Button */}
          {currentUser && (
            <form action={signOutAction}>
              <Button type="submit" variant="danger" className="w-full">
                <SignOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </form>
          )}

          {/* Test User Sign-In Buttons */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Sign in as Test User:</p>
            {TEST_USERS.map((user) => (
              <form key={user.email} action={signInAction}>
                <input type="hidden" name="email" value={user.email} />
                <input type="hidden" name="password" value={user.password} />
                <Button
                  type="submit"
                  variant={currentUser?.email === user.email ? "primary" : "outline"}
                  className="w-full justify-start"
                  disabled={currentUser?.email === user.email}
                >
                  <User className="h-4 w-4 mr-2" />
                  {user.name} ({user.role})
                  {currentUser?.email === user.email && (
                    <span className="ml-auto text-xs">(Current)</span>
                  )}
                </Button>
              </form>
            ))}
          </div>

          {/* Status Messages */}
          {signInState?.error && (
            <div className="p-3 bg-destructive text-white text-sm rounded-lg">
              {signInState.error}
            </div>
          )}
          {signInState?.success && (
            <div className="p-3 bg-green-600 text-white text-sm rounded-lg">
              Signed in successfully!
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowSquareOut className="h-5 w-5" />
            Quick Test Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Link
              href="/club/test-movie-club"
              className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg text-sm"
            >
              <ArrowSquareOut className="h-4 w-4" />
              Test Club Overview
            </Link>
            <Link
              href="/club/test-movie-club/producer"
              className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg text-sm"
            >
              <ArrowSquareOut className="h-4 w-4" />
              Producer Page
            </Link>
            <Link
              href="/club/test-movie-club/director"
              className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg text-sm"
            >
              <ArrowSquareOut className="h-4 w-4" />
              Director Page
            </Link>
            <Link
              href="/club/test-movie-club/settings"
              className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg text-sm"
            >
              <Gear className="h-4 w-4" />
              Settings Page
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Test Resources Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FilmReel className="h-5 w-5" />
            Test Resources
          </CardTitle>
          <CardDescription>
            Default test data for movies, actors, directors, composers, and more
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Test Movies */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <FilmReel className="h-4 w-4" />
              Test Movies (TMDB IDs)
            </h3>
            <div className="space-y-2">
              {TEST_MOVIES.map((movie) => (
                <div key={movie.id} className="p-3 bg-muted rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {movie.title} ({movie.release_date?.split("-")[0]})
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">TMDB ID: {movie.tmdb_id}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        Director: {movie.director}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(movie.tmdb_id.toString(), `movie-${movie.id}`)}
                      className="h-7"
                    >
                      {copiedText === `movie-${movie.id}` ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Test Directors */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Test Directors
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {TEST_DIRECTORS.map((director) => (
                <div
                  key={director.id}
                  className="p-2 bg-muted rounded-lg flex items-center justify-between"
                >
                  <span className="text-xs">{director.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(director.tmdb_id.toString(), `director-${director.id}`)
                    }
                    className="h-6 w-6 p-0"
                  >
                    {copiedText === `director-${director.id}` ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Test Actors */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Test Actors
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {TEST_ACTORS.map((actor) => (
                <div
                  key={actor.id}
                  className="p-2 bg-muted rounded-lg flex items-center justify-between"
                >
                  <span className="text-xs">{actor.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(actor.tmdb_id.toString(), `actor-${actor.id}`)}
                    className="h-6 w-6 p-0"
                  >
                    {copiedText === `actor-${actor.id}` ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Test Composers */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <MusicNote className="h-4 w-4" />
              Test Composers
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {TEST_COMPOSERS.map((composer) => (
                <div
                  key={composer.id}
                  className="p-2 bg-muted rounded-lg flex items-center justify-between"
                >
                  <span className="text-xs">{composer.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(composer.tmdb_id.toString(), `composer-${composer.id}`)
                    }
                    className="h-6 w-6 p-0"
                  >
                    {copiedText === `composer-${composer.id}` ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Test Themes */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Test Festival Themes</h3>
            <div className="flex flex-wrap gap-2">
              {TEST_THEMES.map((theme) => (
                <Button
                  key={theme}
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(theme, `theme-${theme}`)}
                  className="text-xs"
                >
                  {copiedText === `theme-${theme}` ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Copied!
                    </>
                  ) : (
                    theme
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Placeholder Images */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Placeholder Images</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(PLACEHOLDER_IMAGES).map(([key, url]) => (
                <div key={key} className="p-2 bg-muted rounded-lg">
                  <p className="text-xs font-medium mb-1">{key.replace("_", " ")}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(url, `image-${key}`)}
                    className="h-6 w-full text-xs"
                  >
                    {copiedText === `image-${key}` ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const movie = getRandomTestMovie();
                  copyToClipboard(movie.tmdb_id.toString(), "random-movie");
                }}
              >
                Random Movie ID
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const director = getRandomTestDirector();
                  copyToClipboard(director.tmdb_id.toString(), "random-director");
                }}
              >
                Random Director ID
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const actor = getRandomTestActor();
                  copyToClipboard(actor.tmdb_id.toString(), "random-actor");
                }}
              >
                Random Actor ID
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const theme = getRandomTestTheme();
                  copyToClipboard(theme, "random-theme");
                }}
              >
                Random Theme
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

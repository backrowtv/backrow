import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileForSeo } from "@/lib/seo/fetchers";
import { absoluteUrl } from "@/lib/seo/absolute-url";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { clubToAvatarData } from "@/lib/avatar-helpers";
import { Heading, Text } from "@/components/ui/typography";
import { Section, Container } from "@/components/ui/section";
import { DateDisplay } from "@/components/ui/date-display";
import { CalendarBlank, User, EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";

// Admin email that can view all profiles
const ADMIN_EMAIL = "stephen@backrow.tv";

interface ProfilePageProps {
  params: Promise<{ userId: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { userId } = await params;
  const profile = await getProfileForSeo(userId);
  const displayName = profile?.display_name ?? profile?.username ?? "Member";
  const url = absoluteUrl(`/profile/${userId}`);
  const description = profile?.bio?.slice(0, 160) ?? `${displayName} on BackRow.`;
  return {
    title: `${displayName} · BackRow`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: displayName,
      description,
      url,
      type: "profile",
      siteName: "BackRow",
    },
    twitter: { card: "summary", title: displayName, description },
    robots: { index: false, follow: false },
  };
}

export default async function UserProfilePage({ params }: ProfilePageProps) {
  const { userId } = await params;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    redirect("/login");
  }

  // Check if current user is admin
  const isAdmin = currentUser.email === ADMIN_EMAIL;

  // If trying to view own profile, redirect to /profile
  if (currentUser.id === userId) {
    redirect("/profile");
  }

  // If not admin, block access
  if (!isAdmin) {
    notFound();
  }

  // Admin viewing another user's profile - fetch the target user's data
  const { data: targetUser, error } = await supabase
    .from("users")
    .select(
      `
      id,
      email,
      display_name,
      username,
      avatar_url,
      bio,
      created_at,
      favorite_movie_tmdb_id,
      favorite_director_tmdb_id,
      favorite_composer_tmdb_id,
      favorite_actor_tmdb_id,
      social_links
    `
    )
    .eq("id", userId)
    .maybeSingle();

  if (error || !targetUser) {
    notFound();
  }

  // Get user's club memberships
  const { data: memberships } = await supabase
    .from("club_members")
    .select(
      `
      role,
      joined_at,
      clubs (
        id,
        name,
        slug,
        picture_url
      )
    `
    )
    .eq("user_id", userId);

  const initials =
    targetUser.display_name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  return (
    <Section>
      <Container>
        <div className="space-y-6">
          {/* Admin Notice */}
          <Card className="border-yellow-500/50 bg-yellow-500/10">
            <CardContent className="p-4">
              <Text size="sm" className="text-yellow-400">
                🔐 Admin View: You are viewing this user&apos;s profile as an administrator.
              </Text>
            </CardContent>
          </Card>

          {/* Profile Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <Avatar
                  size="xl"
                  src={targetUser.avatar_url || undefined}
                  alt={targetUser.display_name || "User"}
                  fallback={initials}
                />
                <div className="flex-1">
                  <Heading level={1} className="mb-1">
                    {targetUser.display_name || "Unknown User"}
                  </Heading>
                  {targetUser.username && (
                    <Text muted className="mb-2">
                      @{targetUser.username}
                    </Text>
                  )}
                  {targetUser.bio && <Text className="mt-3">{targetUser.bio}</Text>}
                  <div className="flex flex-wrap gap-4 mt-4 text-sm text-[var(--text-muted)]">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>ID: {targetUser.id}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <EnvelopeSimple className="w-4 h-4" />
                      <span>{targetUser.email}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarBlank className="w-4 h-4" />
                      <span>
                        Joined <DateDisplay date={targetUser.created_at} format="date" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Club Memberships */}
          {memberships && memberships.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Club Memberships ({memberships.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {memberships.map((membership) => {
                    const club = Array.isArray(membership.clubs)
                      ? membership.clubs[0]
                      : membership.clubs;
                    return (
                      <div
                        key={club?.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-1)]"
                      >
                        <div className="flex items-center gap-3">
                          <EntityAvatar entity={clubToAvatarData(club)} emojiSet="club" size="sm" />
                          <div>
                            <Text className="font-medium">{club?.name}</Text>
                            <Text size="sm" muted>
                              {membership.role} • Joined{" "}
                              <DateDisplay date={membership.joined_at} format="date" />
                            </Text>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Favorites */}
          <Card>
            <CardHeader>
              <CardTitle>Favorites (TMDB IDs)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Text muted>Favorite Movie</Text>
                  <Text>{targetUser.favorite_movie_tmdb_id || "Not set"}</Text>
                </div>
                <div>
                  <Text muted>Favorite Person 1</Text>
                  <Text>{targetUser.favorite_director_tmdb_id || "Not set"}</Text>
                </div>
                <div>
                  <Text muted>Favorite Person 2</Text>
                  <Text>{targetUser.favorite_composer_tmdb_id || "Not set"}</Text>
                </div>
                <div>
                  <Text muted>Favorite Person 3</Text>
                  <Text>{targetUser.favorite_actor_tmdb_id || "Not set"}</Text>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Links */}
          {targetUser.social_links && (
            <Card>
              <CardHeader>
                <CardTitle>Social Links</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-[var(--surface-1)] p-3 rounded overflow-auto">
                  {JSON.stringify(targetUser.social_links, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </Container>
    </Section>
  );
}

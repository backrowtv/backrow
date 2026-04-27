import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logDualActivity } from "@/lib/activity/logger";
import { ensureUser } from "@/lib/users/ensureUser";
import { invalidateMember } from "@/lib/cache/invalidate";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { JoinRequestButton } from "@/components/clubs/JoinRequestButton";
import { validateInviteToken, markInviteTokenUsed } from "@/app/actions/clubs/invites";
import { checkAndAwardClubBadges } from "@/app/actions/club-badges";

interface JoinPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}

function InviteFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[var(--background)]">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link
            href="/"
            aria-label="BackRow home"
            className="inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-md"
          >
            <span
              className="text-3xl sm:text-4xl tracking-wide"
              style={{ fontFamily: "var(--font-brand)", color: "var(--primary)" }}
            >
              BackRow
            </span>
          </Link>
        </div>
        <Card>{children}</Card>
      </div>
    </div>
  );
}

function StateIcon({ emoji }: { emoji: string }) {
  return (
    <div
      className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
      style={{ backgroundColor: "var(--surface-2)" }}
    >
      <span className="text-3xl" aria-hidden>
        {emoji}
      </span>
    </div>
  );
}

function ClubAvatarLarge({ pictureUrl, name }: { pictureUrl: string | null; name: string }) {
  if (pictureUrl) {
    return (
      <div
        className="relative w-20 h-20 mx-auto rounded-full overflow-hidden border-2"
        style={{ borderColor: "var(--border)" }}
      >
        <Image src={pictureUrl} alt={name} fill className="object-cover" sizes="80px" />
      </div>
    );
  }
  return (
    <div
      className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-2xl font-bold"
      style={{ backgroundColor: "var(--primary)", color: "white" }}
    >
      {name[0]?.toUpperCase() || "?"}
    </div>
  );
}

export default function JoinPage(props: JoinPageProps) {
  return (
    <Suspense fallback={null}>
      <JoinPageContent {...props} />
    </Suspense>
  );
}

async function JoinPageContent({ params, searchParams }: JoinPageProps) {
  await connection();
  const { slug } = await params;
  const { token } = await searchParams;
  const supabase = await createClient();

  // Look up club by slug. Private clubs are hidden by RLS from non-members, so
  // a legitimate invitee who clicks /join/<slug>?token=<t> would otherwise see
  // "Club Not Found" before ever reaching the auto-join path. If the normal
  // SELECT returns nothing and the caller presented a token, fall back to the
  // SECURITY DEFINER RPC which returns the preview iff the token is valid.
  const { data: directClub, error: clubError } = await supabase
    .from("clubs")
    .select(
      "id, name, slug, privacy, archived, picture_url, description, settings, avatar_icon, avatar_color_index, avatar_border_color_index"
    )
    .eq("slug", slug)
    .maybeSingle();

  let club = directClub;
  if (!club && token) {
    const { data: previewRows } = await supabase.rpc("fetch_invite_club_preview", {
      p_slug: slug,
      p_token: token,
    });
    club = previewRows?.[0] ?? null;
  }

  if (clubError || !club) {
    return (
      <InviteFrame>
        <CardContent className="p-6 sm:p-10 text-center space-y-5">
          <StateIcon emoji="😕" />
          <div className="space-y-2">
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Club Not Found
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              This club doesn&rsquo;t exist or the link is invalid.
            </p>
          </div>
          <Link href="/discover" className="inline-block">
            <Button variant="primary" className="sm:min-w-[200px]">
              Browse Clubs
            </Button>
          </Link>
        </CardContent>
      </InviteFrame>
    );
  }

  // Check if club is archived
  if (club.archived) {
    return (
      <InviteFrame>
        <CardContent className="p-6 sm:p-10 text-center space-y-5">
          <StateIcon emoji="📦" />
          <div className="space-y-2">
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Club Archived
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              This club has been archived and is no longer accepting new members.
            </p>
          </div>
          <Link href="/discover" className="inline-block">
            <Button variant="primary" className="sm:min-w-[200px]">
              Browse Clubs
            </Button>
          </Link>
        </CardContent>
      </InviteFrame>
    );
  }

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not authenticated, show club preview with sign-in prompt
  if (!user) {
    return (
      <InviteFrame>
        <CardContent className="p-6 sm:p-10 text-center space-y-6 sm:space-y-7">
          <ClubAvatarLarge pictureUrl={club.picture_url} name={club.name} />

          <div className="space-y-2">
            <p
              className="text-xs uppercase tracking-wide font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              You&rsquo;re invited to join
            </p>
            <h1
              className="text-2xl font-semibold leading-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {club.name}
            </h1>
            {club.description && (
              <p className="text-sm line-clamp-3 pt-1" style={{ color: "var(--text-muted)" }}>
                {club.description}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
            <Link
              href={`/sign-in?redirectTo=${encodeURIComponent(token ? `/join/${slug}?token=${token}` : `/join/${slug}`)}`}
              className="inline-block"
            >
              <Button variant="primary" className="w-full sm:w-auto sm:min-w-[160px]">
                Sign In to Join
              </Button>
            </Link>
            <Link
              href={`/sign-up?redirectTo=${encodeURIComponent(token ? `/join/${slug}?token=${token}` : `/join/${slug}`)}`}
              className="inline-block"
            >
              <Button variant="secondary" className="w-full sm:w-auto sm:min-w-[160px]">
                Create Account
              </Button>
            </Link>
          </div>
        </CardContent>
      </InviteFrame>
    );
  }

  // User is authenticated - ensure they exist in public.users
  try {
    await ensureUser(supabase, user.id, user.email || "");
  } catch (error) {
    return (
      <InviteFrame>
        <CardContent className="p-6 sm:p-10 text-center space-y-5">
          <StateIcon emoji="⚠️" />
          <div className="space-y-2">
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Error Loading Profile
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {error instanceof Error ? error.message : "Failed to load user profile"}
            </p>
          </div>
        </CardContent>
      </InviteFrame>
    );
  }

  // Check if already a member
  const { data: existingMembership } = await supabase
    .from("club_members")
    .select("user_id")
    .eq("club_id", club.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMembership) {
    // Already a member - redirect to club page
    redirect(`/club/${club.slug || club.id}`);
  }

  // Handle based on privacy type
  if (club.privacy === "public_moderated") {
    // Check if user already has a pending request
    const { data: existingRequest } = await supabase
      .from("club_join_requests")
      .select("id, status")
      .eq("club_id", club.id)
      .eq("user_id", user.id)
      .maybeSingle();

    // Show moderated club join page with request button
    return (
      <InviteFrame>
        <CardContent className="p-6 sm:p-10 text-center space-y-6 sm:space-y-7">
          <ClubAvatarLarge pictureUrl={club.picture_url} name={club.name} />

          <div className="space-y-2">
            <h1
              className="text-2xl font-semibold leading-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {club.name}
            </h1>
            {club.description && (
              <p className="text-sm line-clamp-3" style={{ color: "var(--text-muted)" }}>
                {club.description}
              </p>
            )}
            <p className="text-xs pt-1" style={{ color: "var(--text-muted)" }}>
              This is a moderated club. Your request will be reviewed by an admin.
            </p>
          </div>

          {existingRequest ? (
            <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--surface-2)" }}>
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                {existingRequest.status === "pending"
                  ? "Your join request is pending approval."
                  : existingRequest.status === "denied"
                    ? "Your join request was denied."
                    : "Request status: " + existingRequest.status}
              </p>
            </div>
          ) : (
            <div className="flex justify-center">
              <JoinRequestButton
                clubId={club.id}
                clubName={club.name}
                clubSlug={club.slug || club.id}
              />
            </div>
          )}

          <Link href="/discover" className="inline-block">
            <Button variant="ghost" size="sm">
              Browse Other Clubs
            </Button>
          </Link>
        </CardContent>
      </InviteFrame>
    );
  }

  // For private clubs, require a valid invite token
  if (club.privacy === "private") {
    if (!token) {
      return (
        <InviteFrame>
          <CardContent className="p-6 sm:p-10 text-center space-y-5">
            <StateIcon emoji="🔒" />
            <div className="space-y-2">
              <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                Private Club
              </h1>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                This is a private club. You need an invite link from a club member to join.
              </p>
            </div>
            <Link href="/discover" className="inline-block">
              <Button variant="primary" className="sm:min-w-[200px]">
                Browse Clubs
              </Button>
            </Link>
          </CardContent>
        </InviteFrame>
      );
    }

    // Validate the token
    const tokenValidation = await validateInviteToken(token);
    if (!tokenValidation.valid) {
      return (
        <InviteFrame>
          <CardContent className="p-6 sm:p-10 text-center space-y-5">
            <StateIcon emoji="⏰" />
            <div className="space-y-2">
              <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                Invalid Invite Link
              </h1>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {tokenValidation.error || "This invite link is invalid or has expired."}
              </p>
              <p className="text-xs pt-1" style={{ color: "var(--text-muted)" }}>
                Ask a club member for a new invite link.
              </p>
            </div>
            <Link href="/discover" className="inline-block">
              <Button variant="primary" className="sm:min-w-[200px]">
                Browse Clubs
              </Button>
            </Link>
          </CardContent>
        </InviteFrame>
      );
    }

    // Ensure the token is for this club
    if (tokenValidation.clubId !== club.id) {
      return (
        <InviteFrame>
          <CardContent className="p-6 sm:p-10 text-center space-y-5">
            <StateIcon emoji="🔗" />
            <div className="space-y-2">
              <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                Wrong Club
              </h1>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                This invite link is for a different club.
              </p>
            </div>
            <Link href="/discover" className="inline-block">
              <Button variant="primary" className="sm:min-w-[200px]">
                Browse Clubs
              </Button>
            </Link>
          </CardContent>
        </InviteFrame>
      );
    }
  }

  // For public_open clubs or private clubs with valid token: auto-join
  const { error: memberError } = await supabase.from("club_members").insert({
    club_id: club.id,
    user_id: user.id,
    role: "critic",
  });

  if (memberError) {
    return (
      <InviteFrame>
        <CardContent className="p-6 sm:p-10 text-center space-y-5">
          <StateIcon emoji="⚠️" />
          <div className="space-y-2">
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Error Joining Club
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {memberError.message}
            </p>
          </div>
          <Link href="/discover" className="inline-block">
            <Button variant="primary" className="sm:min-w-[200px]">
              Browse Clubs
            </Button>
          </Link>
        </CardContent>
      </InviteFrame>
    );
  }

  // Log activity
  await logDualActivity(club.id, user.id, "member_joined", "user_joined_club", {
    club_name: club.name,
    club_slug: club.slug || club.id,
    method: club.privacy === "private" ? "invite_token" : "join_link",
  });

  // Mark the invite token as used (for private clubs)
  if (club.privacy === "private" && token) {
    await markInviteTokenUsed(token, user.id);
  }

  // Check and award club badges for member count milestone
  try {
    await checkAndAwardClubBadges(club.id);
  } catch (error) {
    // Don't fail join if badge check fails
    console.error("Failed to check club badges:", error);
  }

  // Invalidate cache: member joined a club
  invalidateMember(club.id, user.id);

  // Redirect to club page
  redirect(`/club/${club.slug || club.id}`);
}

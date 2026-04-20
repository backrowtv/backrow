"use server";

/**
 * Club Invite Token Actions
 *
 * Server actions for creating and validating invite tokens for private clubs.
 * Tokens expire after 7 days and are reusable.
 */

import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";
import { sendEmail } from "@/lib/email/resend";
import { inviteEmailHtml } from "@/lib/email/templates/render";
import { actionRateLimit, actionRateLimitByUser } from "@/lib/security/action-rate-limit";
import { requireVerifiedEmail } from "@/lib/security/require-verified-email";

const TOKEN_EXPIRY_DAYS = 7;

/**
 * Generate a new invite token for a club
 * Only authorized members (admins or critics with invite permission) can create tokens
 */
export async function createInviteToken(
  clubId: string
): Promise<{ token: string; expiresAt: string } | { error: string }> {
  const rateCheck = await actionRateLimit("createInviteToken", {
    limit: 10,
    windowMs: 60_000,
  });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to create invite links" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  const dailyCheck = await actionRateLimitByUser("createInviteToken:daily", user.id, {
    limit: 50,
    windowMs: 24 * 60 * 60 * 1000,
  });
  if (!dailyCheck.success) {
    return { error: "You've hit today's invite-link generation limit. Try again tomorrow." };
  }

  // Check if club exists and is private
  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id, privacy")
    .eq("id", clubId)
    .maybeSingle();

  if (clubError || !club) {
    return { error: "Club not found" };
  }

  // Generate random token (32 hex characters = 16 bytes)
  const token = randomBytes(16).toString("hex");

  // Calculate expiration date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS);

  // Insert the invite (RLS will check permissions)
  const { error: insertError } = await supabase.from("club_invites").insert({
    club_id: clubId,
    token,
    created_by: user.id,
    expires_at: expiresAt.toISOString(),
  });

  if (insertError) {
    // RLS violation means user doesn't have permission
    if (insertError.code === "42501") {
      return { error: "You do not have permission to create invite links for this club" };
    }
    return { error: insertError.message };
  }

  return { token, expiresAt: expiresAt.toISOString() };
}

/**
 * Validate an invite token
 * Returns the club ID if valid, or an error message
 */
export async function validateInviteToken(
  token: string
): Promise<{ valid: true; clubId: string; clubSlug: string } | { valid: false; error: string }> {
  const supabase = await createClient();

  // Look up the token
  const { data: invite, error: inviteError } = await supabase
    .from("club_invites")
    .select("id, club_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (inviteError) {
    return { valid: false, error: "Failed to validate invite link" };
  }

  if (!invite) {
    return { valid: false, error: "Invalid invite link" };
  }

  // Check if expired
  const expiresAt = new Date(invite.expires_at);
  if (expiresAt < new Date()) {
    return { valid: false, error: "This invite link has expired" };
  }

  // Get the club slug
  const { data: club } = await supabase
    .from("clubs")
    .select("slug")
    .eq("id", invite.club_id)
    .maybeSingle();

  const clubSlug = club?.slug || invite.club_id;

  return { valid: true, clubId: invite.club_id, clubSlug };
}

/**
 * Mark a token as used (called after successful join)
 * This is informational - tokens remain valid for reuse
 */
export async function markInviteTokenUsed(token: string, userId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from("club_invites")
    .update({
      used_at: new Date().toISOString(),
      used_by: userId,
    })
    .eq("token", token);
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_INVITE_EMAILS = 20;

/**
 * Send invite emails to a list of email addresses.
 * For private clubs, includes a token-based invite link.
 * For public/moderated clubs, includes a simple join link.
 */
export async function sendInviteEmails(
  clubId: string,
  emails: string[],
  token?: string
): Promise<{
  results: Array<{ email: string; success: boolean; error?: string }>;
  error?: string;
}> {
  const rateCheck = await actionRateLimit("sendInviteEmails", {
    limit: 5,
    windowMs: 60_000,
  });
  if (!rateCheck.success) return { results: [], error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { results: [], error: "You must be signed in to send invites" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { results: [], error: verified.error };

  // Validate email count
  if (emails.length === 0) {
    return { results: [], error: "No email addresses provided" };
  }
  if (emails.length > MAX_INVITE_EMAILS) {
    return { results: [], error: `Maximum ${MAX_INVITE_EMAILS} emails per batch` };
  }

  // Validate email formats
  const invalidEmails = emails.filter((e) => !EMAIL_REGEX.test(e));
  if (invalidEmails.length > 0) {
    return { results: [], error: `Invalid email addresses: ${invalidEmails.join(", ")}` };
  }

  // Fetch club data
  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id, name, slug, privacy, description")
    .eq("id", clubId)
    .maybeSingle();

  if (clubError || !club) {
    return { results: [], error: "Club not found" };
  }

  // Verify invite permissions: must be admin or critic with allow_critics_to_invite
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { results: [], error: "You are not a member of this club" };
  }

  const isAdmin = membership.role === "producer" || membership.role === "director";
  if (!isAdmin) {
    // Check if critics are allowed to invite
    const { data: clubSettings } = await supabase
      .from("clubs")
      .select("settings")
      .eq("id", clubId)
      .maybeSingle();

    const settings = (clubSettings?.settings as Record<string, unknown>) || {};
    if (!settings.allow_critics_to_invite) {
      return { results: [], error: "You do not have permission to send invites" };
    }
  }

  // Get inviter's display name
  const { data: inviterProfile } = await supabase
    .from("users")
    .select("display_name, username")
    .eq("id", user.id)
    .maybeSingle();

  const inviterName = inviterProfile?.display_name || inviterProfile?.username || undefined;

  // Build invite URL
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://backrow.tv";
  const isPrivate = club.privacy === "private";
  let inviteUrl: string;

  if (isPrivate) {
    // Use provided token or generate a new one
    let inviteToken = token;
    if (!inviteToken) {
      const tokenResult = await createInviteToken(clubId);
      if ("error" in tokenResult) {
        return { results: [], error: tokenResult.error };
      }
      inviteToken = tokenResult.token;
    }
    inviteUrl = `${siteUrl}/join/${club.slug}?token=${inviteToken}`;
  } else {
    inviteUrl = `${siteUrl}/join/${club.slug}`;
  }

  // Render the email template
  const html = await inviteEmailHtml({
    clubName: club.name,
    clubDescription: club.description || undefined,
    inviterName,
    inviteUrl,
    isPrivate,
  });

  // Send emails
  const sendResults = await Promise.allSettled(
    emails.map(async (email) => {
      await sendEmail({
        to: email,
        subject: `You're invited to join ${club.name} on BackRow`,
        html,
      });
      return email;
    })
  );

  const results = sendResults.map((result, i) => ({
    email: emails[i],
    success: result.status === "fulfilled",
    error: result.status === "rejected" ? result.reason?.message || "Failed to send" : undefined,
  }));

  return { results };
}

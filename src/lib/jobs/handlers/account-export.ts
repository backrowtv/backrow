/**
 * Worker body for the `account-export` topic.
 *
 * Collects every row the user authored or owns, packages it as a ZIP in the
 * private `account-exports` bucket, and emails the user a 7-day signed URL.
 *
 * Scrub rule: when emitting discussion_comments the user wrote on threads
 * authored by other users, only the user's own comment body + timestamp +
 * parent thread id are included — not other commenters or the thread body.
 */

import JSZip from "jszip";
import { claimJob } from "../dedup";
import type { AccountExportPayload } from "../types";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";

const SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60;

// Tables where we can safely select * filtered by user_id with no PII leakage.
const OWNED_TABLES = [
  "generic_ratings",
  "ratings",
  "nominations",
  "notifications",
  "watch_history",
  "future_nomination_list",
  "user_favorites",
  "private_notes",
  "user_badges",
  "club_members",
  "club_poll_votes",
  "club_polls",
  "favorite_clubs",
  "push_subscriptions",
  "user_stats",
  "user_rubrics",
  "nomination_guesses",
] as const;

export async function handleAccountExport(payload: AccountExportPayload): Promise<void> {
  const claim = await claimJob(payload.dedupId, "account-export");
  if (!claim.claimed) {
    console.info(`[jobs/account-export] skip — already processed ${payload.dedupId}`);
    return;
  }

  const supabase = createServiceClient();

  const [{ data: authUser, error: authErr }, { data: profile, error: profileErr }] =
    await Promise.all([
      supabase.auth.admin.getUserById(payload.userId),
      supabase.from("users").select("*").eq("id", payload.userId).maybeSingle(),
    ]);

  if (authErr || !authUser?.user) {
    console.error("[jobs/account-export] auth lookup failed", authErr);
    throw authErr ?? new Error("auth user not found");
  }
  if (profileErr) {
    console.error("[jobs/account-export] profile lookup failed", profileErr);
    throw profileErr;
  }

  const email = authUser.user.email;
  if (!email) {
    throw new Error("[jobs/account-export] user has no email on auth record");
  }

  const zip = new JSZip();

  zip.file(
    "README.md",
    buildReadme({
      userId: payload.userId,
      exportedAt: new Date().toISOString(),
    })
  );

  zip.file(
    "profile.json",
    JSON.stringify(
      {
        id: profile?.id ?? payload.userId,
        email,
        created_at: authUser.user.created_at,
        ...profile,
      },
      null,
      2
    )
  );

  for (const table of OWNED_TABLES) {
    const { data, error } = await supabase.from(table).select("*").eq("user_id", payload.userId);
    if (error) {
      console.warn(`[jobs/account-export] skipping ${table}: ${error.message}`);
      zip.file(`${table}.json`, JSON.stringify({ error: error.message, rows: [] }, null, 2));
      continue;
    }
    zip.file(`${table}.json`, JSON.stringify(data ?? [], null, 2));
  }

  // Discussion threads authored by the user — full rows (they own them).
  const { data: threads } = await supabase
    .from("discussion_threads")
    .select("*")
    .eq("author_id", payload.userId);
  zip.file("discussion_threads.json", JSON.stringify(threads ?? [], null, 2));

  // Discussion comments: scrub — only this user's own rows, no siblings.
  const { data: comments } = await supabase
    .from("discussion_comments")
    .select("id, thread_id, parent_comment_id, body, created_at, updated_at")
    .eq("author_id", payload.userId);
  zip.file("discussion_comments.json", JSON.stringify(comments ?? [], null, 2));

  // Announcements the user posted.
  const { data: announcements } = await supabase
    .from("club_announcements")
    .select("*")
    .eq("user_id", payload.userId);
  zip.file("club_announcements.json", JSON.stringify(announcements ?? [], null, 2));

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  const filePath = `${payload.userId}/${Date.now()}-export.zip`;
  const { error: uploadErr } = await supabase.storage
    .from("account-exports")
    .upload(filePath, zipBuffer, {
      contentType: "application/zip",
      upsert: false,
    });
  if (uploadErr) {
    console.error("[jobs/account-export] upload failed", uploadErr);
    throw uploadErr;
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from("account-exports")
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS);
  if (signErr || !signed?.signedUrl) {
    console.error("[jobs/account-export] signed url failed", signErr);
    throw signErr ?? new Error("signed URL missing");
  }

  const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString();

  await sendEmail({
    to: email,
    subject: "Your BackRow data export is ready",
    html: buildEmailHtml({ downloadUrl: signed.signedUrl, expiresAt }),
  });
}

function buildReadme(info: { userId: string; exportedAt: string }): string {
  return `# Your BackRow data export

Exported: ${info.exportedAt}
User ID:  ${info.userId}

## Files in this archive

- profile.json              — your public profile + preferences
- ratings.json              — themed festival ratings
- generic_ratings.json      — your global (non-festival) movie ratings
- nominations.json          — festival nominations you submitted
- nomination_guesses.json   — your guesses in nomination games
- watch_history.json        — movies you've marked watched
- future_nomination_list.json — your private "want to nominate" list
- user_favorites.json       — favorited movies/pinned entries
- private_notes.json        — your private notes on movies
- discussion_threads.json   — threads you authored (full)
- discussion_comments.json  — your own comments only (parent thread id + body + timestamps)
- club_announcements.json   — announcements you posted
- club_members.json         — your club memberships
- club_polls.json           — polls you created
- club_poll_votes.json      — your poll votes
- favorite_clubs.json       — clubs you bookmarked
- notifications.json        — notifications sent to you
- push_subscriptions.json   — devices registered for push
- user_badges.json          — badges you've earned
- user_rubrics.json         — your custom rating rubrics
- user_stats.json           — cached stats row

Other users' PII has been scrubbed. Comments you posted on other users' threads
include only your own body and the parent thread id — not the thread content
or other commenters.

If you spot something missing, reply to the email that delivered this archive.
`;
}

function buildEmailHtml(opts: { downloadUrl: string; expiresAt: string }): string {
  return `
    <p>Hey,</p>
    <p>Your BackRow data export is ready. Download it here:</p>
    <p><a href="${opts.downloadUrl}">Download your export (ZIP)</a></p>
    <p>This link expires at <strong>${opts.expiresAt}</strong> (7 days from now).</p>
    <p>The archive contains every rating, nomination, comment, and note tied to your account. See <code>README.md</code> inside the zip for the full file list.</p>
    <p>If you didn't request this export, reply to this email and we'll investigate.</p>
    <p>— BackRow</p>
  `;
}

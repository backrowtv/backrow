import { checkBotId } from "botid/server";

export type HumanCheckResult = { ok: true } | { ok: false; error: string };

/**
 * Server-side BotID gate used by high-value actions.
 *
 * Escape hatches (both temporary while the iOS-Safari BotID regression
 * is being diagnosed — remove once the root cause is understood):
 *
 * - `BOTID_FAIL_OPEN=1` — treat the check as { ok: true } no matter what
 *   the verification returns. Lets a real user unblock club creation etc.
 *   while we investigate. Flip this in Vercel env to let the live site
 *   work; revert afterwards.
 * - Verbose verification logging — when checkBotId says `isBot: true`,
 *   dump the ENTIRE verification object so we can see reason / score /
 *   whatever fields Kasada returned. The previous log printed nothing
 *   useful.
 */
export async function requireHuman(): Promise<HumanCheckResult> {
  try {
    const verification = await checkBotId();
    if (verification.isBot) {
      // Log the verification object verbatim so we can see *why* Kasada
      // classified as bot. Whitelist/blocklist, score, reason, etc. are
      // all fields that may or may not be present depending on the
      // verification tier — log the whole thing and we'll see.
      console.error("[botid] isBot=true — verification:", JSON.stringify(verification, null, 2));
      if (process.env.BOTID_FAIL_OPEN === "1") {
        console.warn("[botid] BOTID_FAIL_OPEN=1 — overriding isBot=true, treating as human");
        return { ok: true };
      }
      return { ok: false, error: "Automated traffic blocked." };
    }
    return { ok: true };
  } catch (err) {
    console.error("[botid] checkBotId threw; failing open", err);
    return { ok: true };
  }
}

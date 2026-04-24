// Shared validation helpers for username server actions. Kept in a separate
// file so the 'use server' file can restrict itself to async exports per
// project convention (see CLAUDE.md).

// Usernames are editable once every 6 months. Approximated as 180 days —
// close enough for rate-limiting and avoids month-arithmetic surprises near
// month boundaries. If you need exact calendar-month behavior, swap the
// consumer to `setMonth(+6)` and drop this constant.
export const USERNAME_CHANGE_COOLDOWN_DAYS = 180;

export function validateUsername(
  raw: string | null
): { ok: true; username: string } | { ok: false; error: string } {
  if (!raw) return { ok: false, error: "Username is required" };
  const username = raw.trim().toLowerCase();
  if (username.length < 3) return { ok: false, error: "Username must be at least 3 characters" };
  if (username.length > 30) return { ok: false, error: "Username must be 30 characters or less" };
  if (!/^[a-z0-9_]+$/.test(username)) {
    return {
      ok: false,
      error: "Username can only contain lowercase letters, numbers, and underscores",
    };
  }
  return { ok: true, username };
}

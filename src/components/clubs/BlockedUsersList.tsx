import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { UnblockButton } from "./UnblockButton";

interface BlockedUsersListProps {
  clubId: string;
}

export async function BlockedUsersList({ clubId }: BlockedUsersListProps) {
  const supabase = await createClient();

  const { data: blockedUsers, error } = await supabase
    .from("blocked_users")
    .select(
      `
      user_id,
      reason,
      created_at,
      user:user_id (
        id,
        display_name,
        avatar_url
      )
    `
    )
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p
            className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
            role="alert"
          >
            <span aria-hidden="true">⚠</span>Error loading blocked users: {error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!blockedUsers || blockedUsers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Blocked Users</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--text-muted)]">No users are currently blocked.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Blocked Users</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {blockedUsers.map((blocked) => {
            const userData = Array.isArray(blocked.user) ? blocked.user[0] : blocked.user;
            const user = userData as {
              id: string;
              display_name: string | null;
              avatar_url: string | null;
            } | null;
            if (!user) return null;

            return (
              <div
                key={blocked.user_id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    src={user.avatar_url || undefined}
                    fallback={user.display_name?.[0] || "U"}
                  />
                  <div>
                    <p className="font-medium">{user.display_name || "Unknown User"}</p>
                    {blocked.reason && (
                      <p className="text-sm text-[var(--text-muted)]">Reason: {blocked.reason}</p>
                    )}
                  </div>
                </div>
                <UnblockButton clubId={clubId} userId={blocked.user_id} />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

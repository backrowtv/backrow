"use client";

import { AdminsList } from "./components/AdminsList";
import { UserTable } from "./components/UserTable";

interface UserRow {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  is_admin: boolean;
}

interface AdminRecord {
  user_id: string;
  role: string;
  created_at: string;
  user:
    | {
        id: string;
        display_name: string | null;
        username: string | null;
        email: string;
        avatar_url: string | null;
      }[]
    | {
        id: string;
        display_name: string | null;
        username: string | null;
        email: string;
        avatar_url: string | null;
      }
    | null;
}

export function UsersPageClient({
  initialUsers,
  initialTotal,
  admins,
}: {
  initialUsers: UserRow[];
  initialTotal: number;
  admins: AdminRecord[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Users</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Manage users and admin access</p>
      </div>
      <AdminsList admins={admins} />
      <UserTable initialUsers={initialUsers} initialTotal={initialTotal} />
    </div>
  );
}

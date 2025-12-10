import { searchUsers, listSiteAdmins } from "@/app/actions/admin";
import { UsersPageClient } from "./UsersPageClient";

export default async function AdminUsersPage() {
  const [usersResult, adminsResult] = await Promise.all([
    searchUsers({ page: 1, pageSize: 25 }),
    listSiteAdmins(),
  ]);

  return (
    <UsersPageClient
      initialUsers={usersResult.data}
      initialTotal={usersResult.total}
      admins={adminsResult.data}
    />
  );
}

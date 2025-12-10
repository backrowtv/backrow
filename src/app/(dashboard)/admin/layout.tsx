import { redirect } from "next/navigation";
import { isAdmin } from "@/app/actions/admin";
import { AdminNavigation } from "./components/AdminNavigation";

export const metadata = {
  title: "Admin Dashboard | BackRow",
  description: "Site administration dashboard",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const hasAdminAccess = await isAdmin();
  if (!hasAdminAccess) {
    redirect("/");
  }

  return (
    <div>
      <AdminNavigation />
      <div className="max-w-2xl mx-auto px-4 lg:px-6">{children}</div>
    </div>
  );
}

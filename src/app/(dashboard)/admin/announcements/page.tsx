import { getAdminDashboardData } from "@/app/actions/admin";
import { redirect } from "next/navigation";
import { AnnouncementsClient } from "./AnnouncementsClient";

export default async function AdminAnnouncementsPage() {
  const data = await getAdminDashboardData();

  if ("error" in data) {
    redirect("/");
  }

  return <AnnouncementsClient announcements={data.announcements} />;
}

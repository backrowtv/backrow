import { getAdminDashboardData } from "@/app/actions/admin";
import { redirect } from "next/navigation";
import { SettingsClient } from "./SettingsClient";

export default async function AdminSettingsPage() {
  const data = await getAdminDashboardData();

  if ("error" in data) {
    redirect("/");
  }

  return <SettingsClient settings={data.settings} />;
}

import { getAdminOverviewData } from "@/app/actions/admin";
import { getBackgroundsByType } from "@/app/actions/backgrounds";
import { redirect } from "next/navigation";
import { OverviewClient } from "./OverviewClient";

export default async function AdminOverviewPage() {
  const [data, bgResult] = await Promise.all([
    getAdminOverviewData(),
    getBackgroundsByType("site_page"),
  ]);

  if ("error" in data) {
    redirect("/");
  }

  const homepageBg = bgResult.data?.find((bg) => bg.entity_id === "/") || null;

  return <OverviewClient data={data} homepageBackground={homepageBg} />;
}

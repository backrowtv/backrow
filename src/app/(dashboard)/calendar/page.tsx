import { redirect } from "next/navigation";

// Calendar page now redirects to Timeline which uses the new timeline view
export default function CalendarPage() {
  redirect("/timeline");
}

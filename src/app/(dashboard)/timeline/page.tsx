import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TimelineContainer } from "@/components/timeline/TimelineContainer";

export default async function TimelinePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Header - hidden on mobile */}
        <div className="hidden md:block mb-6">
          <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Timeline</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Deadlines and important dates from your clubs.
          </p>
        </div>

        {/* Clean, minimal timeline */}
        <TimelineContainer mode="global" userId={user.id} />
      </div>
    </div>
  );
}

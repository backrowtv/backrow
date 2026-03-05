import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FeedbackTabs } from "@/components/feedback/FeedbackTabs";
import { getFeedbackItems, getFeedbackVotes, checkIsAdmin } from "@/app/actions/feedback";
import { MarketingSidebarMount } from "@/components/marketing/MarketingSidebarMount";

export const metadata = {
  title: "Feedback | BackRow",
  description: "Submit bug reports and feature requests for BackRow",
};

export default async function FeedbackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Require authentication
  if (!user) {
    redirect("/sign-in?redirect=/feedback");
  }

  // Fetch data in parallel
  const [bugResult, featureResult, votesResult, isAdmin] = await Promise.all([
    getFeedbackItems("bug"),
    getFeedbackItems("feature"),
    getFeedbackVotes(),
    checkIsAdmin(),
  ]);

  const bugItems = bugResult.data || [];
  const featureItems = featureResult.data || [];
  const userVotes = votesResult.data || new Set<string>();

  return (
    <div className="bg-[var(--background)]">
      <MarketingSidebarMount />
      <div className="max-w-2xl mx-auto px-4 lg:px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Feedback</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Help us improve BackRow by reporting bugs or requesting features. Upvote submissions you
            want to see prioritized!
          </p>
        </div>

        {/* Feedback Tabs */}
        <FeedbackTabs
          bugItems={bugItems}
          featureItems={featureItems}
          userVotes={userVotes}
          currentUserId={user.id}
          isAdmin={isAdmin}
        />

        {/* Guidelines */}
        <div
          className="mt-8 p-4 rounded-lg border"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-1)" }}
        >
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
            Submission Guidelines
          </h2>
          <ul className="space-y-1.5 text-xs text-[var(--text-muted)]">
            <li>
              • <strong className="text-[var(--text-secondary)]">Bug Reports:</strong> Describe what
              happened, what you expected, and steps to reproduce.
            </li>
            <li>
              • <strong className="text-[var(--text-secondary)]">Feature Requests:</strong> Explain
              the feature and why it would be useful.
            </li>
            <li>
              • <strong className="text-[var(--text-secondary)]">Be specific:</strong> The more
              detail you provide, the better we can help.
            </li>
            <li>
              • <strong className="text-[var(--text-secondary)]">Search first:</strong> Check if
              someone already submitted your idea and upvote it instead.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MobileBackButton } from "@/components/profile/MobileBackButton";

export default async function SubscriptionsSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Mobile Back Button */}
        <MobileBackButton href="/profile/settings" label="Settings" />

        {/* Header - Hidden on mobile since TopNav shows "Profile" */}
        <div className="hidden md:block mb-6">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">
            Subscription Management
          </h1>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
              Current Plan
            </h3>
            {subscription ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2">
                  <p className="text-sm text-[var(--text-primary)]">Plan</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {subscription.plan}
                  </p>
                </div>
                <div className="flex items-center justify-between py-2">
                  <p className="text-sm text-[var(--text-primary)]">Status</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {subscription.status}
                  </p>
                </div>
                {subscription.current_period_end && (
                  <div className="flex items-center justify-between py-2">
                    <p className="text-sm text-[var(--text-primary)]">Current period ends</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {new Date(subscription.current_period_end).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                Free plan. Subscription management coming soon.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

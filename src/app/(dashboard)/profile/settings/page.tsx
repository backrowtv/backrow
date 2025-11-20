import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { MobileBackButton } from "@/components/profile/MobileBackButton";
import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";

const settingsLinks = [
  {
    label: "Account",
    description: "Email, password, and privacy",
    href: "/profile/settings/account",
  },
  {
    label: "Notifications",
    description: "Email and push preferences",
    href: "/profile/settings/notifications",
  },
  {
    label: "Ratings",
    description: "Rating scale and rubrics",
    href: "/profile/settings/ratings",
  },
  {
    label: "Display",
    description: "Theme, navigation, and formats",
    href: "/profile/settings/display",
  },
];

export default async function ProfileSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Error fetching profile:", profileError);
    redirect("/");
  }

  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Mobile Back Button */}
        <MobileBackButton href="/profile" label="Profile" />

        {/* Header - Hidden on mobile since TopNav shows "Profile" */}
        <div className="hidden md:block mb-6">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Settings</h1>
        </div>

        {/* Profile Information */}
        <ProfileEditForm profile={profile} />

        {/* Settings Sub-pages */}
        <div className="mt-6 pt-6 border-t border-[var(--border)]">
          <div className="space-y-1">
            {settingsLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 p-3 -mx-3 rounded-lg hover:bg-[var(--surface-1)] transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{link.label}</p>
                  <p className="text-xs text-[var(--text-muted)]">{link.description}</p>
                </div>
                <CaretRight className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

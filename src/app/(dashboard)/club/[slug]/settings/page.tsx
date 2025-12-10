import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { Gear, Bell, User } from "@phosphor-icons/react/dist/ssr";
import { resolveClub } from "@/lib/clubs/resolveClub";
import { ClubNavigation } from "@/components/clubs/ClubNavigation";
import Link from "next/link";

interface SettingsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const identifier = (await params).slug;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Resolve club by slug or ID
  const clubResolution = await resolveClub(supabase, identifier);
  if (!clubResolution) redirect("/clubs");

  const clubId = clubResolution.id;
  const clubSlug = clubResolution.slug || clubId;

  // Get club
  const { data: club } = await supabase
    .from("clubs")
    .select("name, slug, settings")
    .eq("id", clubId)
    .single();

  // Check user's role
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    redirect(`/club/${clubSlug}`);
  }

  const isAdmin = membership.role === "producer" || membership.role === "director";
  const isProducer = membership.role === "producer";

  // Build menu items based on role
  type MenuItem = {
    title: string;
    description: string;
    href: string;
    icon: typeof Gear;
  };

  const menuItems: MenuItem[] = [
    {
      title: "General",
      description: isAdmin ? "Club profile, name, and privacy" : "Your profile and rating rubric",
      href: `/club/${clubSlug}/settings/general`,
      icon: Gear,
    },
    {
      title: "Notifications",
      description: "Email and push notification preferences",
      href: `/club/${clubSlug}/settings/notifications`,
      icon: Bell,
    },
  ];

  // Personalization is only a separate route for admins
  if (isAdmin) {
    menuItems.push({
      title: "Personalization",
      description: "Customize how you appear in this club",
      href: `/club/${clubSlug}/settings/personalization`,
      icon: User,
    });
  }

  return (
    <>
      <ClubNavigation
        clubSlug={clubSlug}
        clubName={club?.name || "Club"}
        isAdmin={isAdmin}
        isProducer={isProducer}
      />
      <div className="bg-[var(--background)]">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
          {/* Header - Hidden on mobile since TopNav shows club name */}
          <div className="hidden lg:block mb-6">
            <h1 className="text-lg font-semibold text-[var(--club-accent,var(--text-primary))]">
              Settings
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              {isAdmin ? "Club configuration and preferences" : "Your preferences for this club"}
            </p>
          </div>

          {/* Menu Items - Compact list matching manage page design */}
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <div className="flex items-center gap-3 py-3 px-3 -mx-3 rounded-lg transition-colors hover:bg-[var(--surface-1)]">
                    <div className="w-10 h-10 rounded-lg bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-[var(--text-muted)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">{item.description}</p>
                    </div>
                    <CaretRight className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

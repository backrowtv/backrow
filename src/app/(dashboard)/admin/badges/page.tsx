import { createClient } from "@/lib/supabase/server";
import Image from "next/image";

export default async function AdminBadgesPage() {
  const supabase = await createClient();
  const { data: badges, error } = await supabase
    .from("badges")
    .select("id, name, description, icon_url, badge_type, requirements_jsonb")
    .order("badge_type")
    .order("name");

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-400">Error: {error.message}</p>
      </div>
    );
  }

  const siteBadges = badges?.filter((b) => b.badge_type === "site") || [];
  const clubBadges = badges?.filter((b) => b.badge_type === "club_challenge") || [];

  return (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Badge Icons</h2>
        <p className="text-sm text-[var(--text-muted)]">
          All badge icons are bundled static assets from licensed Flaticon packs.
        </p>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
          User Badges ({siteBadges.length})
        </h3>
        <div className="grid grid-cols-6 gap-3">
          {siteBadges.map((badge) => (
            <div
              key={badge.id}
              className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-[var(--surface-1)]"
            >
              {badge.icon_url ? (
                <Image
                  src={badge.icon_url}
                  alt={badge.name}
                  width={48}
                  height={48}
                  className="object-contain"
                />
              ) : (
                <div className="w-12 h-12 bg-[var(--surface-2)] rounded-full" />
              )}
              <span className="text-[10px] text-center text-[var(--text-muted)] leading-tight">
                {badge.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
          Club Badges ({clubBadges.length})
        </h3>
        <div className="grid grid-cols-6 gap-3">
          {clubBadges.map((badge) => (
            <div
              key={badge.id}
              className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-[var(--surface-1)]"
            >
              {badge.icon_url ? (
                <Image
                  src={badge.icon_url}
                  alt={badge.name}
                  width={48}
                  height={48}
                  className="object-contain"
                />
              ) : (
                <div className="w-12 h-12 bg-[var(--surface-2)] rounded-full" />
              )}
              <span className="text-[10px] text-center text-[var(--text-muted)] leading-tight">
                {badge.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

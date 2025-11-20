import { EntityAvatar } from "@/components/ui/entity-avatar";
import { userToAvatarData } from "@/lib/avatar-helpers";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { GradientOrb, CinemaCurtains } from "./ProfileIllustrations";

interface ProfileSidebarProps {
  profile: {
    id: string;
    display_name?: string | null;
    username?: string | null;
    bio?: string | null;
    avatar_url?: string | null;
    email?: string | null;
    social_links?: {
      avatar_icon?: string;
      avatar_color_index?: number;
      avatar_border_color_index?: number;
      [key: string]: unknown;
    } | null;
  };
}

export function ProfileSidebar({ profile }: ProfileSidebarProps) {
  const displayName = profile.display_name || profile.email?.split("@")[0] || "User";

  return (
    <div className="relative overflow-hidden">
      {/* Background gradient orbs */}
      <GradientOrb className="absolute -top-20 -left-20 w-64 h-64 opacity-50" />
      <GradientOrb className="absolute -bottom-20 -right-20 w-80 h-80 opacity-30" />

      {/* Cinema curtains decorative element */}
      <div
        className="absolute top-0 left-0 right-0 h-32 opacity-10"
        style={{ color: "var(--text-muted)" }}
      >
        <CinemaCurtains className="w-full h-full" />
      </div>

      <div className="relative z-10 flex flex-col items-center lg:items-start">
        {/* Avatar with custom frame */}
        <div className="relative mb-8 group inline-block">
          {/* Avatar with border */}
          <div
            className="relative p-[3px] rounded-full border"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="rounded-full overflow-hidden"
              style={{ background: "var(--background)" }}
            >
              <EntityAvatar
                entity={userToAvatarData(profile)}
                emojiSet="user"
                size="xl"
                className="relative z-10"
              />
            </div>
          </div>

          {/* Edit button overlay */}
          <Link
            href="/profile/edit"
            className="absolute bottom-0 right-0 rounded-full p-3 cursor-pointer hover:opacity-90 transition-all duration-300 z-20"
            style={{ backgroundColor: "var(--primary)" }}
          >
            <svg
              className="h-5 w-5"
              style={{ color: "var(--text-primary)" }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </Link>
        </div>

        {/* Name and username */}
        <div className="text-center lg:text-left mb-6">
          <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            {displayName}
          </h1>
          {profile.username && (
            <p className="text-lg font-medium" style={{ color: "var(--text-secondary)" }}>
              @{profile.username}
            </p>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="mb-8 max-w-sm">
            <p
              className="text-sm leading-relaxed text-center lg:text-left"
              style={{ color: "var(--text-secondary)" }}
            >
              {profile.bio}
            </p>
          </div>
        )}

        {/* Edit Profile Button */}
        <Link href="/profile/edit" className="w-full lg:w-auto">
          <Button variant="primary" className="w-full lg:w-auto">
            Edit Profile
          </Button>
        </Link>
      </div>
    </div>
  );
}

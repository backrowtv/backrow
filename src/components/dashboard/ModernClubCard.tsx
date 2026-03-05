"use client";

import Link from "next/link";
import { Database } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CinemaCurtainsIllustration } from "./CinemaIllustrations";
import { FavoriteButton } from "@/components/clubs/FavoriteButton";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { clubToAvatarData } from "@/lib/avatar-helpers";
import { BrandText } from "@/components/ui/brand-text";
import NumberFlow from "@/components/ui/number-flow";

type Club = Database["public"]["Tables"]["clubs"]["Row"];

interface ModernClubCardProps {
  club: Club & {
    member_count?: number;
    user_role?: string;
    is_favorite?: boolean;
    picture_url?: string | null;
    settings?: {
      avatar_icon?: string | null;
      avatar_color_index?: number | null;
      avatar_border_color_index?: number | null;
      [key: string]: unknown;
    } | null;
  };
}

export function ModernClubCard({ club }: ModernClubCardProps) {
  const clubSlug = club.slug;
  if (!clubSlug) {
    console.error("ModernClubCard: Club slug is required", club.id);
    return null;
  }

  return (
    <Link href={`/club/${clubSlug}`}>
      <Card
        variant="default"
        hover
        className="group relative h-full overflow-hidden border-[var(--emboss-border)] shadow-[var(--emboss-shadow)]"
      >
        {/* Animated background illustration */}
        <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
          <CinemaCurtainsIllustration className="w-full h-full" />
        </div>

        <CardContent className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {/* Club Picture */}
                <EntityAvatar
                  entity={clubToAvatarData(club)}
                  emojiSet="club"
                  size="sm"
                  className="shrink-0"
                />
                <h3
                  className="text-base font-bold line-clamp-1 transition-colors"
                  style={{ color: "var(--text-primary)" }}
                >
                  <BrandText>{club.name}</BrandText>
                </h3>
                {club.user_role && (
                  <Badge variant="secondary" size="sm" className="shrink-0">
                    {club.user_role}
                  </Badge>
                )}
              </div>

              {club.description && (
                <p
                  className="text-xs mb-4 line-clamp-2 leading-relaxed transition-colors"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {club.description}
                </p>
              )}
            </div>

            {/* Favorite button */}
            <FavoriteButton clubId={club.id} isFavorite={club.is_favorite ?? false} />
          </div>

          {/* Stats row */}
          <div
            className="flex items-center gap-4 pt-3 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            {club.member_count !== undefined && (
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full transition-colors"
                  style={{ backgroundColor: "var(--primary)" }}
                />
                <span
                  className="text-xs transition-colors"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <NumberFlow
                    value={club.member_count}
                    suffix={club.member_count === 1 ? " member" : " members"}
                  />
                </span>
              </div>
            )}
            {club.privacy && (
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full transition-colors"
                  style={{ backgroundColor: "var(--text-muted)" }}
                />
                <span
                  className="text-xs capitalize flex items-center gap-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {club.privacy === "public_open" && "🌐"}
                  {club.privacy === "public_moderated" && "✋"}
                  {club.privacy === "private" && "🔐"}
                  {club.privacy.replace("_", " ")}
                </span>
              </div>
            )}
          </div>

          {/* Arrow indicator */}
          <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "var(--surface-2)" }}
            >
              <svg
                className="w-4 h-4"
                style={{ color: "var(--text-primary)" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

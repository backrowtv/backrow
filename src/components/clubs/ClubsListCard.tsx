"use client";

import Link from "next/link";
import Image from "next/image";
import { Database } from "@/types/database";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { clubToAvatarData } from "@/lib/avatar-helpers";
import { BrandText } from "@/components/ui/brand-text";
import NumberFlow from "@/components/ui/number-flow";

type Club = Database["public"]["Tables"]["clubs"]["Row"] & {
  picture_url?: string | null;
  settings?: {
    avatar_icon?: string | null;
    avatar_color_index?: number | null;
    avatar_border_color_index?: number | null;
    [key: string]: unknown;
  } | null;
};

interface ClubsListCardProps {
  club: Club & {
    member_count?: number;
    user_role?: string;
  };
}

export function ClubsListCard({ club }: ClubsListCardProps) {
  const privacyLabels: Record<string, { label: string; icon: string }> = {
    public_open: { label: "Open", icon: "🌐" },
    public_moderated: { label: "Moderated", icon: "✋" },
    private: { label: "Private", icon: "🔐" },
  };

  const _getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow border-[var(--emboss-border)] shadow-[var(--emboss-shadow)]">
      {/* Cover image section */}
      <div className="aspect-video relative" style={{ backgroundColor: "var(--surface-1)" }}>
        {club.picture_url && (
          <Image
            src={club.picture_url}
            alt={club.name}
            fill
            sizes="(max-width: 640px) 100vw, 400px"
            className="object-cover"
          />
        )}
        {/* Logo positioned absolutely */}
        <div className="absolute bottom-4 left-4">
          <div className="h-16 w-16 rounded-full border-4 border-[var(--background)] overflow-hidden">
            <EntityAvatar
              entity={clubToAvatarData(club)}
              emojiSet="club"
              size="xl"
              className="h-full w-full"
            />
          </div>
        </div>
      </div>

      {/* CardContent */}
      <CardContent>
        <CardTitle className="text-lg truncate">
          <BrandText>{club.name}</BrandText>
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-[var(--text-muted)] mt-1">
          <span>
            <NumberFlow value={club.member_count || 0} suffix=" members" />
          </span>
          <Badge variant={club.privacy === "private" ? "secondary" : "default"}>
            {privacyLabels[club.privacy]?.icon && (
              <span className="mr-1">{privacyLabels[club.privacy].icon}</span>
            )}
            {privacyLabels[club.privacy]?.label || club.privacy}
          </Badge>
        </div>
      </CardContent>

      {/* CardFooter with pt-0 */}
      <CardFooter className="pt-0">
        {club.slug ? (
          <Link href={`/club/${club.slug}`} className="w-full">
            <Button variant="club-accent" className="w-full">
              Enter Club →
            </Button>
          </Link>
        ) : (
          <div className="w-full text-center text-sm text-[var(--text-muted)] py-2">
            Slug required
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

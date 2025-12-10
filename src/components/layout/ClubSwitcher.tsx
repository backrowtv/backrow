"use client";

import { useState, useEffect, startTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { CaretDown, FilmReel } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { BrandText } from "@/components/ui/brand-text";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { clubToAvatarData } from "@/lib/avatar-helpers";

interface Club {
  id: string;
  name: string;
  slug: string | null;
  picture_url?: string | null;
  logo_url?: string | null;
  settings?: unknown;
}

export function ClubSwitcher() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [currentClubId, setCurrentClubId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  // Extract club ID from pathname if on a club page
  useEffect(() => {
    const clubMatch = pathname.match(/\/clubs\/([^/]+)/);
    startTransition(() => {
      if (clubMatch) {
        setCurrentClubId(clubMatch[1]);
      } else {
        setCurrentClubId(null);
      }
    });
  }, [pathname]);

  useEffect(() => {
    async function loadClubs() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships } = await supabase
        .from("club_members")
        .select("club_id")
        .eq("user_id", user.id);

      if (!memberships || memberships.length === 0) return;

      const clubIds = memberships.map((m) => m.club_id);
      const { data: clubsData } = await supabase
        .from("clubs")
        .select(
          "id, name, slug, picture_url, settings, avatar_icon, avatar_color_index, avatar_border_color_index"
        )
        .in("id", clubIds)
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(10);

      setClubs(clubsData || []);
    }
    loadClubs();
  }, [supabase]);

  const currentClub = clubs.find((c) => c.id === currentClubId);

  if (clubs.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2">
          {currentClub ? (
            <EntityAvatar entity={clubToAvatarData(currentClub)} emojiSet="club" size="xs" />
          ) : (
            <FilmReel className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {currentClub ? currentClub.name : "Select Club"}
          </span>
          <CaretDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {clubs.map((club) => {
          const clubSlug = club.slug || club.id;
          return (
            <DropdownMenuItem
              key={club.id}
              onClick={() => router.push(`/club/${clubSlug}`)}
              className={cn(
                "flex items-center gap-2",
                currentClubId === club.id && "bg-[var(--hover)]"
              )}
            >
              <EntityAvatar entity={clubToAvatarData(club)} emojiSet="club" size="xs" />
              <BrandText>{club.name}</BrandText>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

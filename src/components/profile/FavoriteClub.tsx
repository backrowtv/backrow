"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Star } from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { BrandText } from "@/components/ui/brand-text";

interface Club {
  id: string;
  name: string;
}

interface FavoriteClubProps {
  currentFavoriteClubId: string | null;
  onChange?: (clubId: string | null) => void;
  disabled?: boolean;
}

export function FavoriteClub({ currentFavoriteClubId, onChange, disabled }: FavoriteClubProps) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(currentFavoriteClubId);

  useEffect(() => {
    async function fetchClubs() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: memberships, error: membershipsError } = await supabase
          .from("club_members")
          .select("club_id")
          .eq("user_id", user.id);

        if (membershipsError) {
          console.error("Error fetching memberships:", membershipsError);
          toast.error("Failed to load clubs");
          setLoading(false);
          return;
        }

        if (!memberships || memberships.length === 0) {
          setClubs([]);
          setLoading(false);
          return;
        }

        const clubIds = memberships.map((m) => m.club_id);

        const { data: clubsData, error: clubsError } = await supabase
          .from("clubs")
          .select("id, name")
          .in("id", clubIds)
          .eq("archived", false)
          .order("created_at", { ascending: false });

        if (clubsError) {
          console.error("Error fetching clubs:", clubsError);
          toast.error("Failed to load clubs");
          setLoading(false);
          return;
        }

        setClubs(clubsData || []);
      } catch (error) {
        console.error("Error fetching clubs:", error);
        toast.error("Failed to load clubs");
      } finally {
        setLoading(false);
      }
    }

    fetchClubs();
  }, []);

  const handleSelect = (clubId: string) => {
    const newSelection = selectedClubId === clubId ? null : clubId;
    setSelectedClubId(newSelection);
    if (onChange) {
      onChange(newSelection);
    }
  };

  if (loading) {
    return <div className="text-xs text-[var(--text-muted)]">Loading clubs...</div>;
  }

  if (clubs.length === 0) {
    return (
      <div className="text-xs text-[var(--text-muted)]">Join a club to set it as your favorite</div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {clubs.map((club) => {
        const isSelected = selectedClubId === club.id;
        return (
          <button
            key={club.id}
            type="button"
            onClick={() => !disabled && handleSelect(club.id)}
            disabled={disabled}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors
              ${
                isSelected
                  ? "bg-[var(--surface-3)] ring-1 ring-[var(--primary)] text-[var(--text-primary)] shadow-sm border border-transparent"
                  : "bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            <Star className="h-3 w-3" weight={isSelected ? "fill" : "regular"} />
            <span>
              <BrandText>{club.name}</BrandText>
            </span>
          </button>
        );
      })}
    </div>
  );
}

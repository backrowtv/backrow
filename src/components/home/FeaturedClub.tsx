import { Card } from "@/components/ui/card";
import Link from "next/link";
import { UsersThree } from "@phosphor-icons/react/dist/ssr";
import { getFeaturedClub } from "@/app/actions/marketing";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { clubToAvatarData } from "@/lib/avatar-helpers";
import { BrandText } from "@/components/ui/brand-text";
import { formatRatingDisplay } from "@/lib/ratings/normalize";

export async function FeaturedClub() {
  const club = await getFeaturedClub();

  if (!club) {
    // Fallback placeholder if no featured club
    return (
      <Card className="p-6 h-[400px] flex flex-col justify-center items-center text-center bg-[var(--card)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-[var(--primary)]" />
        <div className="mb-6 relative w-24 h-24 rounded-full overflow-hidden border-4 border-[var(--background)] shadow-lg">
          <div className="w-full h-full bg-[var(--surface-2)] flex items-center justify-center">
            <UsersThree className="w-10 h-10 text-[var(--text-muted)]" />
          </div>
        </div>
        <div className="uppercase tracking-wider text-xs font-bold text-[var(--primary)] mb-2">
          Featured Club
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-2">
          No Featured Club
        </h3>
        <p className="text-[var(--text-muted)] mb-6 max-w-xs mx-auto">
          Check back soon for featured clubs!
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 h-[400px] flex flex-col justify-center items-center text-center bg-[var(--card)] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-[var(--primary)]" />
      <div className="mb-6 relative w-24 h-24 rounded-full overflow-hidden border-4 border-[var(--background)] shadow-lg">
        <EntityAvatar
          entity={clubToAvatarData(club)}
          emojiSet="club"
          size="xxl"
          className="w-full h-full"
        />
      </div>
      <div className="uppercase tracking-wider text-xs font-bold text-[var(--primary)] mb-2">
        Featured Club
      </div>
      <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-2">
        <BrandText>{club.name}</BrandText>
      </h3>
      {club.description && (
        <p className="text-[var(--text-muted)] mb-6 max-w-xs mx-auto line-clamp-2">
          {club.description}
        </p>
      )}
      <div className="flex items-center gap-6 text-sm text-[var(--text-muted)] mb-8">
        <div className="flex flex-col">
          <span className="font-bold text-[var(--text-default)]">{club.member_count}</span>
          <span>Members</span>
        </div>
        <div className="w-px h-8 bg-[var(--border)]" />
        <div className="flex flex-col">
          <span className="font-bold text-[var(--text-default)]">
            {club.avg_rating > 0 ? formatRatingDisplay(club.avg_rating) : "N/A"}
          </span>
          <span>Avg Rating</span>
        </div>
        {club.festival_count > 0 && (
          <>
            <div className="w-px h-8 bg-[var(--border)]" />
            <div className="flex flex-col">
              <span className="font-bold text-[var(--text-default)]">{club.festival_count}</span>
              <span>Festivals</span>
            </div>
          </>
        )}
      </div>
      {club.slug ? (
        <Link
          href={`/club/${club.slug}`}
          className="border border-[var(--border)] px-6 py-2 rounded-full font-bold text-sm hover:bg-[var(--muted)] transition-colors"
        >
          View Club
        </Link>
      ) : (
        <div className="border border-[var(--border)] px-6 py-2 rounded-full font-bold text-sm text-[var(--text-muted)]">
          Slug required
        </div>
      )}
    </Card>
  );
}

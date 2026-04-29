import { ChatCircle } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";

export type DiscussionAvatarType = "movie" | "person" | "festival" | "generic";

interface DiscussionAvatarProps {
  type: DiscussionAvatarType;
  /** Poster URL for movies, profile photo URL for persons */
  imageUrl?: string | null;
  /** Festival theme text (for festival type) */
  themeText?: string | null;
  /** Alt text for images */
  alt?: string;
  /** Size class - defaults to w-6 h-6 */
  className?: string;
}

export function DiscussionAvatar({
  type,
  imageUrl,
  themeText,
  alt = "Discussion",
  className,
}: DiscussionAvatarProps) {
  // Poster types (movie/festival) use 2:3 aspect ratio, others use square
  const isPoster = type === "movie" || type === "festival";

  const baseClasses = cn(
    "shrink-0 rounded overflow-hidden flex items-center justify-center",
    isPoster ? "w-7 h-10" : "w-8 h-8", // 2:3 ratio for posters, square for others
    className
  );

  // Movie or Festival with poster image
  if ((type === "movie" || type === "festival") && imageUrl) {
    // TMDB images need the base URL prefix, Supabase URLs are already full
    const fullUrl = imageUrl.startsWith("http")
      ? imageUrl
      : `https://image.tmdb.org/t/p/w92${imageUrl}`;

    return (
      <div className={baseClasses} style={{ background: "var(--surface-2)" }}>
        <Image
          src={fullUrl}
          alt={alt}
          width={28}
          height={40}
          className="w-full h-full object-cover"
          placeholder="blur"
          blurDataURL={getTMDBBlurDataURL()}
        />
      </div>
    );
  }

  // Person with profile photo (square)
  if (type === "person" && imageUrl) {
    const fullUrl = imageUrl.startsWith("http")
      ? imageUrl
      : `https://image.tmdb.org/t/p/w92${imageUrl}`;

    return (
      <div className={cn(baseClasses, "rounded-full")} style={{ background: "var(--surface-2)" }}>
        <Image
          src={fullUrl}
          alt={alt}
          width={32}
          height={32}
          className="w-full h-full object-cover"
          placeholder="blur"
          blurDataURL={getTMDBBlurDataURL()}
        />
      </div>
    );
  }

  // Festival fallback - theme text badge (when no poster)
  if (type === "festival" && themeText) {
    const truncatedTheme = themeText.length > 5 ? themeText.slice(0, 4) + "…" : themeText;

    return (
      <div
        className={cn(
          baseClasses,
          "text-[7px] font-bold uppercase tracking-tight px-0.5 text-center leading-tight bg-[var(--surface-3)] text-[var(--text-primary)]"
        )}
        title={themeText}
      >
        {truncatedTheme}
      </div>
    );
  }

  // Generic fallback - chat icon
  return (
    <div
      className={cn(
        "w-8 h-8 shrink-0 rounded overflow-hidden flex items-center justify-center",
        className
      )}
      style={{ background: "var(--surface-2)" }}
    >
      <ChatCircle className="w-4 h-4 text-[var(--text-muted)]" />
    </div>
  );
}

/**
 * Determines the avatar type and data from discussion tags
 */
export function getDiscussionAvatarData(
  tags:
    | Array<{
        tag_type: string;
        movie?: { poster_url?: string | null } | null;
        person?: { profile_path?: string | null } | null;
        festival?: { theme?: string | null; poster_url?: string | null } | null;
      }>
    | null
    | undefined
): {
  type: DiscussionAvatarType;
  imageUrl?: string | null;
  themeText?: string | null;
} {
  // No tags or multiple tags = generic
  if (!tags || tags.length === 0 || tags.length > 1) {
    return { type: "generic" };
  }

  const tag = tags[0];

  switch (tag.tag_type) {
    case "movie":
      return {
        type: "movie",
        imageUrl: tag.movie?.poster_url,
      };
    case "person":
      return {
        type: "person",
        imageUrl: tag.person?.profile_path,
      };
    case "festival":
      // Use poster_url if available, fallback to theme text
      return {
        type: "festival",
        imageUrl: tag.festival?.poster_url,
        themeText: tag.festival?.theme,
      };
    default:
      return { type: "generic" };
  }
}

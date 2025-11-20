"use client";

import Image from "next/image";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Text } from "@/components/ui/typography";
import { Trophy, User, FilmSlate } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

// Social platform icons - reused from SocialLinks.tsx
const LetterboxdIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="250" cy="250" r="250" fill="#202830" />
    <ellipse cx="150" cy="250" rx="55" ry="55" fill="#00E054" />
    <ellipse cx="250" cy="250" rx="55" ry="55" fill="#40BCF4" />
    <ellipse cx="350" cy="250" rx="55" ry="55" fill="#FF8000" />
    <path
      d="M200 250c0-20 10-38 25-49c-15-11-25-29-25-49c0 20-10 38-25 49c15 11 25 29 25 49z"
      fill="#1A9B4B"
      fillOpacity="0.8"
    />
    <path
      d="M300 250c0-20 10-38 25-49c-15-11-25-29-25-49c0 20-10 38-25 49c15 11 25 29 25 49z"
      fill="#68A2BB"
      fillOpacity="0.8"
    />
  </svg>
);

const ImdbIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 64 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="32" rx="4" fill="#F5C518" />
    <path d="M8 8h4v16H8V8z" fill="#000" />
    <path d="M16 8h4l2 10 2-10h4v16h-3V14l-2 10h-2l-2-10v10h-3V8z" fill="#000" />
    <path
      d="M32 8h4c3 0 5 2 5 5v6c0 3-2 5-5 5h-4V8zm4 13c1 0 2-1 2-2v-6c0-1-1-2-2-2h-1v10h1z"
      fill="#000"
    />
    <path
      d="M44 8h4c2 0 4 1 4 4 0 2-1 3-2 3 2 1 3 2 3 4 0 3-2 5-5 5h-4V8zm4 5c1 0 1-1 1-2s0-1-1-1h-1v3h1zm0 7c1 0 2-1 2-2s-1-2-2-2h-1v4h1z"
      fill="#000"
    />
  </svg>
);

const TraktIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="12" fill="#ED1C24" />
    <path
      d="M12 4C7.58 4 4 7.58 4 12s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"
      fill="#fff"
    />
    <path d="M10.5 8.5l5 3.5-5 3.5V8.5z" fill="#fff" />
  </svg>
);

const TmdbIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 190.24 81.52"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="tmdb-gradient-popup" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#90CEA1" />
        <stop offset="50%" stopColor="#3CBEC9" />
        <stop offset="100%" stopColor="#00B3E5" />
      </linearGradient>
    </defs>
    <g fill="url(#tmdb-gradient-popup)">
      <path d="M105.67,36.06h66.9a17.67,17.67,0,0,0,17.67-17.67h0A17.67,17.67,0,0,0,172.57.72h-66.9A17.67,17.67,0,0,0,88,18.39h0A17.67,17.67,0,0,0,105.67,36.06Z" />
      <path d="M105.67,80.8h66.9a17.67,17.67,0,0,0,17.67-17.67h0a17.67,17.67,0,0,0-17.67-17.67h-66.9A17.67,17.67,0,0,0,88,63.13h0A17.67,17.67,0,0,0,105.67,80.8Z" />
      <path d="M17.67,36.06H49.46a17.67,17.67,0,0,0,17.67-17.67h0A17.67,17.67,0,0,0,49.46.72H17.67A17.67,17.67,0,0,0,0,18.39H0A17.67,17.67,0,0,0,17.67,36.06Z" />
      <path d="M17.67,80.8H49.46a17.67,17.67,0,0,0,17.67-17.67h0a17.67,17.67,0,0,0-17.67-17.67H17.67A17.67,17.67,0,0,0,0,63.13H0A17.67,17.67,0,0,0,17.67,80.8Z" />
    </g>
  </svg>
);

// Types
export interface CircularAvatarItem {
  id: string;
  type: "movie" | "person" | "badge" | "trophy" | "social";
  imageUrl?: string | null;
  label: string;
  sublabel?: string;
  href?: string;
  // For person type (kept for backward compat, no longer role-specific)
  personType?: string;
  // For badge type
  badgeIcon?: string | null;
  // For trophy type
  trophyRank?: 1 | 2 | 3;
  count?: number;
  // For social type
  socialPlatform?: "letterboxd" | "imdb" | "trakt" | "tmdb";
  username?: string;
}

interface CircularAvatarRowProps {
  items: CircularAvatarItem[];
  title?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-10 h-10",
  md: "w-12 h-12",
  lg: "w-14 h-14",
};

const iconSizeClasses = {
  sm: "w-5 h-5",
  md: "w-6 h-6",
  lg: "w-7 h-7",
};

const trophyColors = {
  1: "text-[var(--warning)] bg-[var(--warning)]/20 border-[var(--warning)]/50",
  2: "text-[var(--text-secondary)] bg-[var(--surface-3)] border-[var(--border)]",
  3: "text-[var(--warning)] bg-[var(--warning)]/10 border-[var(--warning)]/30",
};

const socialPlatformConfig = {
  letterboxd: {
    label: "Letterboxd",
    url: (username: string) => `https://letterboxd.com/${username}/`,
    Icon: LetterboxdIcon,
  },
  imdb: {
    label: "IMDb",
    url: (username: string) => `https://www.imdb.com/user/${username}/`,
    Icon: ImdbIcon,
  },
  trakt: {
    label: "Trakt",
    url: (username: string) => `https://trakt.tv/users/${username}`,
    Icon: TraktIcon,
  },
  tmdb: {
    label: "TMDB",
    url: (username: string) => `https://www.themoviedb.org/u/${username}`,
    Icon: TmdbIcon,
  },
};

function getPersonIcon(_personType?: string) {
  // Generic person icon - no longer role-specific
  return User;
}

function CircularAvatarItemComponent({
  item,
  size = "md",
}: {
  item: CircularAvatarItem;
  size: "sm" | "md" | "lg";
}) {
  const sizeClass = sizeClasses[size];
  const iconSize = iconSizeClasses[size];

  const renderContent = () => {
    // Movie type - show poster
    if (item.type === "movie") {
      return item.imageUrl ? (
        <Image
          src={item.imageUrl}
          alt={item.label}
          fill
          sizes="64px"
          className="object-cover rounded-full"
        />
      ) : (
        <FilmSlate className={cn(iconSize, "text-[var(--text-muted)]")} />
      );
    }

    // Person type - show profile photo or fallback icon
    if (item.type === "person") {
      const PersonIcon = getPersonIcon(item.personType);
      return item.imageUrl ? (
        <Image
          src={item.imageUrl}
          alt={item.label}
          fill
          sizes="64px"
          className="object-cover rounded-full"
        />
      ) : (
        <PersonIcon className={cn(iconSize, "text-[var(--text-muted)]")} />
      );
    }

    // Badge type - show badge icon or trophy fallback
    if (item.type === "badge") {
      return item.badgeIcon ? (
        <Image
          src={item.badgeIcon}
          alt={item.label}
          fill
          sizes="64px"
          className="object-contain p-1"
        />
      ) : (
        <Trophy className={cn(iconSize, "text-[var(--foreground)]")} />
      );
    }

    // Trophy type - show colored trophy with count
    if (item.type === "trophy" && item.trophyRank) {
      return (
        <div className="relative flex items-center justify-center">
          <Trophy className={cn(iconSize, "relative z-10")} weight="fill" />
          {item.count && item.count > 0 && (
            <span className="absolute -bottom-1 -right-1 text-[10px] font-bold bg-[var(--surface-3)] rounded-full px-1 min-w-[16px] text-center z-20">
              {item.count}
            </span>
          )}
        </div>
      );
    }

    // Social type - show platform logo
    if (item.type === "social" && item.socialPlatform) {
      const config = socialPlatformConfig[item.socialPlatform];
      const Icon = config.Icon;
      return <Icon className={iconSize} />;
    }

    return <User className={cn(iconSize, "text-[var(--text-muted)]")} />;
  };

  const containerClasses = cn(
    sizeClass,
    "rounded-full flex items-center justify-center border-2 transition-all duration-200 relative overflow-hidden",
    item.type === "trophy" && item.trophyRank
      ? trophyColors[item.trophyRank]
      : "bg-[var(--surface-2)] border-[var(--border)] hover:border-[var(--border-hover)]",
    (item.href || (item.type === "social" && item.username)) && "cursor-pointer hover:scale-105"
  );

  const content = <div className={containerClasses}>{renderContent()}</div>;

  // Wrap with link if href or social link
  if (item.type === "social" && item.socialPlatform && item.username) {
    const config = socialPlatformConfig[item.socialPlatform];
    return (
      <a
        href={config.url(item.username)}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {content}
      </a>
    );
  }

  if (item.href) {
    return (
      <a href={item.href} className="block">
        {content}
      </a>
    );
  }

  return content;
}

export function CircularAvatarRow({
  items,
  title,
  size = "md",
  className,
}: CircularAvatarRowProps) {
  if (items.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {title && (
        <Text size="tiny" muted className="uppercase tracking-wider font-medium">
          {title}
        </Text>
      )}
      <div className="flex flex-wrap gap-3">
        <TooltipProvider>
          {items.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <div>
                  <CircularAvatarItemComponent item={item} size={size} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm break-words">{item.label}</p>
                  {item.sublabel && (
                    <p className="text-xs text-zinc-400 break-words">{item.sublabel}</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
    </div>
  );
}

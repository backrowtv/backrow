"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { updateProfile } from "@/app/actions/auth";
import { useActionState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { ArrowSquareOut } from "@phosphor-icons/react";
import {
  IMDbLogo,
  LetterboxdLogo,
  TraktLogo,
  TMDbLogo,
  YouTubeLogo,
  TwitterLogo,
  InstagramLogo,
  RedditLogo,
  DiscordLogo,
  TikTokLogo,
} from "@/components/ui/external-logos";

// Platform Logo Icon wrappers for the form
// Note: IMDB has aspectRatio 2, TMDB has aspectRatio 1.2, so they need smaller heights to fit the container
const LetterboxdIcon = () => <LetterboxdLogo size={20} />;
const ImdbIcon = () => <IMDbLogo size={14} />;
const TraktIcon = () => <TraktLogo size={20} />;
const TmdbIcon = () => <TMDbLogo size={18} />;
const YouTubeIcon = () => <YouTubeLogo size={20} />;
const TwitterIcon = () => <TwitterLogo size={20} />;
const InstagramIcon = () => <InstagramLogo size={20} />;
const RedditIcon = () => <RedditLogo size={20} />;
const DiscordIcon = () => <DiscordLogo size={20} />;
const TikTokIcon = () => <TikTokLogo size={20} />;

interface LinkedAccountsFormProps {
  socialLinks: {
    letterboxd?: string;
    letterboxd_visible?: boolean;
    imdb?: string;
    imdb_visible?: boolean;
    trakt?: string;
    trakt_visible?: boolean;
    tmdb?: string;
    tmdb_visible?: boolean;
    youtube?: string;
    youtube_visible?: boolean;
    twitter?: string;
    twitter_visible?: boolean;
    instagram?: string;
    instagram_visible?: boolean;
    reddit?: string;
    reddit_visible?: boolean;
    discord?: string;
    discord_visible?: boolean;
    tiktok?: string;
    tiktok_visible?: boolean;
  };
}

// Platform configuration with URLs
const platforms = [
  {
    key: "letterboxd" as const,
    name: "Letterboxd",
    icon: LetterboxdIcon,
    getUrl: (username: string) => `https://letterboxd.com/${username}/`,
    placeholder: "username",
  },
  {
    key: "imdb" as const,
    name: "IMDb",
    icon: ImdbIcon,
    getUrl: (username: string) => `https://www.imdb.com/user/${username}/`,
    placeholder: "user ID (ur12345678)",
  },
  {
    key: "trakt" as const,
    name: "Trakt",
    icon: TraktIcon,
    getUrl: (username: string) => `https://trakt.tv/users/${username}`,
    placeholder: "username",
  },
  {
    key: "tmdb" as const,
    name: "TMDB",
    icon: TmdbIcon,
    getUrl: (username: string) => `https://www.themoviedb.org/u/${username}`,
    placeholder: "username",
  },
  {
    key: "youtube" as const,
    name: "YouTube",
    icon: YouTubeIcon,
    getUrl: (username: string) => `https://youtube.com/@${username}`,
    placeholder: "@username or channel ID",
  },
  {
    key: "twitter" as const,
    name: "X",
    icon: TwitterIcon,
    getUrl: (username: string) => `https://x.com/${username}`,
    placeholder: "username (without @)",
  },
  {
    key: "instagram" as const,
    name: "Instagram",
    icon: InstagramIcon,
    getUrl: (username: string) => `https://instagram.com/${username}`,
    placeholder: "username",
  },
  {
    key: "reddit" as const,
    name: "Reddit",
    icon: RedditIcon,
    getUrl: (username: string) => `https://reddit.com/user/${username}`,
    placeholder: "username (without u/)",
  },
  {
    key: "discord" as const,
    name: "Discord",
    icon: DiscordIcon,
    getUrl: (username: string) => `https://discord.com/users/${username}`,
    placeholder: "user ID or username",
  },
  {
    key: "tiktok" as const,
    name: "TikTok",
    icon: TikTokIcon,
    getUrl: (username: string) => `https://tiktok.com/@${username}`,
    placeholder: "@username (without @)",
  },
];

// Compact linked account row component
interface LinkedAccountRowProps {
  platform: (typeof platforms)[number];
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  disabled?: boolean;
}

function LinkedAccountRow({
  platform,
  value,
  onChange,
  visible,
  onVisibleChange,
  disabled,
}: LinkedAccountRowProps) {
  const Icon = platform.icon;
  const hasValue = Boolean(value.trim());

  return (
    <>
      {/* Desktop layout */}
      <div className="hidden sm:flex items-center gap-2 group">
        <div
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center"
          title={platform.name}
        >
          <Icon />
        </div>
        <span className="flex-shrink-0 w-20 text-sm text-[var(--text-primary)] font-medium">
          {platform.name}
        </span>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={platform.placeholder}
            disabled={disabled}
            className="w-full h-8 px-3 text-sm rounded-md border bg-[var(--background)] border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent hover:border-[var(--border-hover)] transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--surface-2)]"
            aria-label={platform.name}
          />
        </div>
        {hasValue ? (
          <a
            href={platform.getUrl(value)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
            title={`View ${platform.name} profile`}
            aria-label={`View ${platform.name} profile for ${value}`}
          >
            <ArrowSquareOut className="h-4 w-4" />
          </a>
        ) : (
          <div className="flex-shrink-0 w-8 h-8" aria-hidden="true" />
        )}
        <Switch
          checked={hasValue && visible}
          onCheckedChange={onVisibleChange}
          disabled={disabled || !hasValue}
          aria-label={`Show ${platform.name} on profile popup`}
          className="scale-75 flex-shrink-0"
        />
      </div>

      {/* Mobile layout — stacked */}
      <div className="sm:hidden flex items-center gap-2">
        <div
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center"
          title={platform.name}
        >
          <Icon />
        </div>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`${platform.name}`}
            disabled={disabled}
            className="w-full h-8 px-2 text-[13px] rounded-md border bg-[var(--background)] border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent hover:border-[var(--border-hover)] transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--surface-2)]"
            aria-label={platform.name}
          />
        </div>
        {hasValue && (
          <a
            href={platform.getUrl(value)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            title={`View ${platform.name} profile`}
          >
            <ArrowSquareOut className="h-3.5 w-3.5" />
          </a>
        )}
        <Switch
          checked={hasValue && visible}
          onCheckedChange={onVisibleChange}
          disabled={disabled || !hasValue}
          aria-label={`Show ${platform.name} on profile popup`}
          className="scale-[0.65] flex-shrink-0"
        />
      </div>
    </>
  );
}

export function LinkedAccountsForm({ socialLinks }: LinkedAccountsFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateProfile, null);
  const [linkedAccounts, setLinkedAccounts] = useState({
    letterboxd: socialLinks.letterboxd || "",
    imdb: socialLinks.imdb || "",
    trakt: socialLinks.trakt || "",
    tmdb: socialLinks.tmdb || "",
    youtube: socialLinks.youtube || "",
    twitter: socialLinks.twitter || "",
    instagram: socialLinks.instagram || "",
    reddit: socialLinks.reddit || "",
    discord: socialLinks.discord || "",
    tiktok: socialLinks.tiktok || "",
  });
  const initialAccountsRef = useRef(
    JSON.stringify({
      letterboxd: socialLinks.letterboxd || "",
      imdb: socialLinks.imdb || "",
      trakt: socialLinks.trakt || "",
      tmdb: socialLinks.tmdb || "",
      youtube: socialLinks.youtube || "",
      twitter: socialLinks.twitter || "",
      instagram: socialLinks.instagram || "",
      reddit: socialLinks.reddit || "",
      discord: socialLinks.discord || "",
      tiktok: socialLinks.tiktok || "",
    })
  );
  const initialVisibilityRef = useRef(
    JSON.stringify({
      letterboxd: socialLinks.letterboxd_visible !== false,
      imdb: socialLinks.imdb_visible !== false,
      trakt: socialLinks.trakt_visible !== false,
      tmdb: socialLinks.tmdb_visible !== false,
      youtube: socialLinks.youtube_visible !== false,
      twitter: socialLinks.twitter_visible !== false,
      instagram: socialLinks.instagram_visible !== false,
      reddit: socialLinks.reddit_visible !== false,
      discord: socialLinks.discord_visible !== false,
      tiktok: socialLinks.tiktok_visible !== false,
    })
  );
  // Visibility defaults to true for backward compatibility
  const [visibility, setVisibility] = useState({
    letterboxd: socialLinks.letterboxd_visible !== false,
    imdb: socialLinks.imdb_visible !== false,
    trakt: socialLinks.trakt_visible !== false,
    tmdb: socialLinks.tmdb_visible !== false,
    youtube: socialLinks.youtube_visible !== false,
    twitter: socialLinks.twitter_visible !== false,
    instagram: socialLinks.instagram_visible !== false,
    reddit: socialLinks.reddit_visible !== false,
    discord: socialLinks.discord_visible !== false,
    tiktok: socialLinks.tiktok_visible !== false,
  });

  // Handle success/error messages for linked accounts
  React.useEffect(() => {
    if (state && "success" in state && state.success) {
      toast.success("Linked accounts updated successfully");
      router.refresh();
    } else if (state && "error" in state && state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  const handleSaveLinkedAccounts = () => {
    const formData = new FormData();
    formData.append(
      "social_links_json",
      JSON.stringify({
        ...socialLinks,
        ...linkedAccounts,
        letterboxd_visible: visibility.letterboxd,
        imdb_visible: visibility.imdb,
        trakt_visible: visibility.trakt,
        tmdb_visible: visibility.tmdb,
        youtube_visible: visibility.youtube,
        twitter_visible: visibility.twitter,
        instagram_visible: visibility.instagram,
        reddit_visible: visibility.reddit,
        discord_visible: visibility.discord,
        tiktok_visible: visibility.tiktok,
      })
    );
    formAction(formData);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Linked Accounts
        </h3>
        {/* Column header for visibility toggle */}
        <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
          <span className="hidden sm:inline">Show on Profile</span>
          <span className="sm:hidden">Show</span>
        </span>
      </div>

      <div className="space-y-2">
        {platforms.map((platform) => (
          <LinkedAccountRow
            key={platform.key}
            platform={platform}
            value={linkedAccounts[platform.key]}
            onChange={(value) => setLinkedAccounts((prev) => ({ ...prev, [platform.key]: value }))}
            visible={visibility[platform.key]}
            onVisibleChange={(visible) =>
              setVisibility((prev) => ({ ...prev, [platform.key]: visible }))
            }
            disabled={isPending}
          />
        ))}
      </div>

      {(JSON.stringify(linkedAccounts) !== initialAccountsRef.current ||
        JSON.stringify(visibility) !== initialVisibilityRef.current) && (
        <div className="mt-4 flex justify-end">
          <Button
            onClick={handleSaveLinkedAccounts}
            disabled={isPending}
            variant="primary"
            size="sm"
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}

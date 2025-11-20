"use client";

import { Input } from "@/components/ui/input";
import { LetterboxdLogo } from "@/components/ui/external-logos";

// Platform Logo Icons with brand colors
const LetterboxdIcon = ({ className }: { className?: string }) => (
  <LetterboxdLogo className={className} size={24} />
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
      <linearGradient id="tmdb-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#90CEA1" />
        <stop offset="50%" stopColor="#3CBEC9" />
        <stop offset="100%" stopColor="#00B3E5" />
      </linearGradient>
    </defs>
    <g fill="url(#tmdb-gradient)">
      <path d="M105.67,36.06h66.9a17.67,17.67,0,0,0,17.67-17.67h0A17.67,17.67,0,0,0,172.57.72h-66.9A17.67,17.67,0,0,0,88,18.39h0A17.67,17.67,0,0,0,105.67,36.06Z" />
      <path d="M105.67,80.8h66.9a17.67,17.67,0,0,0,17.67-17.67h0a17.67,17.67,0,0,0-17.67-17.67h-66.9A17.67,17.67,0,0,0,88,63.13h0A17.67,17.67,0,0,0,105.67,80.8Z" />
      <path d="M17.67,36.06H49.46a17.67,17.67,0,0,0,17.67-17.67h0A17.67,17.67,0,0,0,49.46.72H17.67A17.67,17.67,0,0,0,0,18.39H0A17.67,17.67,0,0,0,17.67,36.06Z" />
      <path d="M17.67,80.8H49.46a17.67,17.67,0,0,0,17.67-17.67h0a17.67,17.67,0,0,0-17.67-17.67H17.67A17.67,17.67,0,0,0,0,63.13H0A17.67,17.67,0,0,0,17.67,80.8Z" />
    </g>
  </svg>
);

const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
      fill="#FF0000"
    />
  </svg>
);

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      fill="currentColor"
    />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="ig-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FFDC80" />
        <stop offset="25%" stopColor="#F77737" />
        <stop offset="50%" stopColor="#E1306C" />
        <stop offset="75%" stopColor="#C13584" />
        <stop offset="100%" stopColor="#833AB4" />
      </linearGradient>
    </defs>
    <path
      d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
      fill="url(#ig-gradient)"
    />
  </svg>
);

const RedditIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"
      fill="#FF4500"
    />
  </svg>
);

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"
      fill="#5865F2"
    />
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
      fill="currentColor"
    />
  </svg>
);

interface SocialLinksData {
  letterboxd?: string;
  imdb?: string;
  trakt?: string;
  tmdb?: string;
  youtube?: string;
  twitter?: string;
  instagram?: string;
  reddit?: string;
  discord?: string;
  tiktok?: string;
}

interface SocialLinksProps {
  socialLinks: SocialLinksData | null;
  onChange?: (links: SocialLinksData) => void;
  disabled?: boolean;
}

export function SocialLinks({ socialLinks, onChange, disabled }: SocialLinksProps) {
  const links = socialLinks || {};

  const handleChange = (platform: keyof SocialLinksData, value: string) => {
    if (onChange) {
      onChange({
        ...links,
        [platform]: value.trim() || undefined,
      });
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Input
        type="text"
        label="Letterboxd"
        placeholder="username"
        value={links.letterboxd || ""}
        onChange={(e) => handleChange("letterboxd", e.target.value)}
        disabled={disabled}
      />
      <Input
        type="text"
        label="IMDb"
        placeholder="username"
        value={links.imdb || ""}
        onChange={(e) => handleChange("imdb", e.target.value)}
        disabled={disabled}
      />
      <Input
        type="text"
        label="Trakt"
        placeholder="username"
        value={links.trakt || ""}
        onChange={(e) => handleChange("trakt", e.target.value)}
        disabled={disabled}
      />
      <Input
        type="text"
        label="TMDb"
        placeholder="username"
        value={links.tmdb || ""}
        onChange={(e) => handleChange("tmdb", e.target.value)}
        disabled={disabled}
      />
      <Input
        type="text"
        label="YouTube"
        placeholder="@username or channel ID"
        value={links.youtube || ""}
        onChange={(e) => handleChange("youtube", e.target.value)}
        disabled={disabled}
      />
      <Input
        type="text"
        label="X"
        placeholder="username (without @)"
        value={links.twitter || ""}
        onChange={(e) => handleChange("twitter", e.target.value)}
        disabled={disabled}
      />
      <Input
        type="text"
        label="Instagram"
        placeholder="username"
        value={links.instagram || ""}
        onChange={(e) => handleChange("instagram", e.target.value)}
        disabled={disabled}
      />
      <Input
        type="text"
        label="Reddit"
        placeholder="username (without u/)"
        value={links.reddit || ""}
        onChange={(e) => handleChange("reddit", e.target.value)}
        disabled={disabled}
      />
      <Input
        type="text"
        label="Discord"
        placeholder="user ID or username"
        value={links.discord || ""}
        onChange={(e) => handleChange("discord", e.target.value)}
        disabled={disabled}
      />
      <Input
        type="text"
        label="TikTok"
        placeholder="@username (without @)"
        value={links.tiktok || ""}
        onChange={(e) => handleChange("tiktok", e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}

interface SocialLinksDisplayProps {
  socialLinks: SocialLinksData | null;
  size?: "sm" | "md" | "lg";
}

const platformConfig = {
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
  youtube: {
    label: "YouTube",
    url: (username: string) => `https://youtube.com/@${username}`,
    Icon: YouTubeIcon,
  },
  twitter: {
    label: "X",
    url: (username: string) => `https://x.com/${username}`,
    Icon: TwitterIcon,
  },
  instagram: {
    label: "Instagram",
    url: (username: string) => `https://instagram.com/${username}`,
    Icon: InstagramIcon,
  },
  reddit: {
    label: "Reddit",
    url: (username: string) => `https://reddit.com/user/${username}`,
    Icon: RedditIcon,
  },
  discord: {
    label: "Discord",
    url: (username: string) => `https://discord.com/users/${username}`,
    Icon: DiscordIcon,
  },
  tiktok: {
    label: "TikTok",
    url: (username: string) => `https://tiktok.com/@${username}`,
    Icon: TikTokIcon,
  },
};

export function SocialLinksDisplay({ socialLinks, size = "md" }: SocialLinksDisplayProps) {
  if (!socialLinks) return null;

  const platforms = [
    "letterboxd",
    "imdb",
    "trakt",
    "tmdb",
    "youtube",
    "twitter",
    "instagram",
    "reddit",
    "discord",
    "tiktok",
  ] as const;
  const activeLinks = platforms.filter((key) => socialLinks[key]);

  if (activeLinks.length === 0) return null;

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  const iconSizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <div className="flex flex-wrap gap-2">
      {activeLinks.map((key) => {
        const config = platformConfig[key];
        const username = socialLinks[key]!;
        const Icon = config.Icon;
        return (
          <a
            key={key}
            href={config.url(username)}
            target="_blank"
            rel="noopener noreferrer"
            title={`${config.label}: ${username}`}
            className={`inline-flex items-center justify-center rounded-lg transition-all hover:scale-110 hover:opacity-80 ${sizeClasses[size]}`}
          >
            <Icon className={iconSizeClasses[size]} />
          </a>
        );
      })}
    </div>
  );
}

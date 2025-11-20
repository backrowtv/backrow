"use client";

import { useState, useTransition } from "react";
import { signInWithOAuth } from "@/app/actions/auth-oauth";
import { CircleNotch } from "@phosphor-icons/react";
import toast from "react-hot-toast";

type OAuthProvider = "google" | "meta" | "twitter" | "apple" | "discord";

// OAuth Icons - slightly larger for icon-only buttons
const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const MetaIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      fill="#1877F2"
    />
  </svg>
);

const TwitterIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      fill="currentColor"
    />
  </svg>
);

const AppleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.18 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
      fill="currentColor"
    />
  </svg>
);

const DiscordIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
      fill="#5865F2"
    />
  </svg>
);

const InstagramIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FFDC80" />
        <stop offset="25%" stopColor="#FCAF45" />
        <stop offset="50%" stopColor="#F77737" />
        <stop offset="75%" stopColor="#F56040" />
        <stop offset="100%" stopColor="#FD1D1D" />
      </linearGradient>
      <linearGradient id="instagram-gradient-2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F56040" />
        <stop offset="50%" stopColor="#C13584" />
        <stop offset="100%" stopColor="#833AB4" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#instagram-gradient-2)" />
    <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="2" fill="none" />
    <circle cx="17.5" cy="6.5" r="1.5" fill="white" />
  </svg>
);

interface OAuthButtonProps {
  provider: OAuthProvider;
  label: string;
  icon: React.ReactNode;
  isLoading: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

function OAuthButton({ label, icon, isLoading, isDisabled, onClick }: OAuthButtonProps) {
  return (
    <button
      type="button"
      className="flex items-center justify-center h-9 w-9 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] disabled:opacity-50 transition-colors p-1"
      onClick={onClick}
      disabled={isDisabled}
      aria-label={isLoading ? `Signing in with ${label}...` : `Sign in with ${label}`}
      aria-busy={isLoading}
    >
      {isLoading ? (
        <CircleNotch className="h-5 w-5 animate-spin text-[var(--text-muted)]" />
      ) : (
        <span className="[&_svg]:h-6 [&_svg]:w-6">{icon}</span>
      )}
    </button>
  );
}

interface OAuthButtonsProps {
  redirectTo?: string;
}

export function OAuthButtons({ redirectTo }: OAuthButtonsProps) {
  const [loadingButton, setLoadingButton] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOAuth = (provider: OAuthProvider, label: string) => {
    setLoadingButton(label);

    startTransition(async () => {
      try {
        const result = await signInWithOAuth(provider, redirectTo);

        if (result && "error" in result && result.error) {
          toast.error(result.error, {
            duration: 5000,
            icon: "⚠️",
          });
          setLoadingButton(null);
        }
      } catch (error) {
        console.error(`OAuth error for ${provider}:`, error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : `Failed to sign in with ${label}. Please check your connection and try again.`;
        toast.error(errorMessage, {
          duration: 5000,
          icon: "⚠️",
        });
        setLoadingButton(null);
      }
    });
  };

  const providers: Array<{ provider: OAuthProvider; label: string; icon: React.ReactNode }> = [
    { provider: "google", label: "Google", icon: <GoogleIcon /> },
    { provider: "apple", label: "Apple", icon: <AppleIcon /> },
    { provider: "meta", label: "Facebook", icon: <MetaIcon /> },
    { provider: "meta", label: "Instagram", icon: <InstagramIcon /> },
    { provider: "twitter", label: "X", icon: <TwitterIcon /> },
    { provider: "discord", label: "Discord", icon: <DiscordIcon /> },
  ];

  const isAnyLoading = loadingButton !== null || isPending;

  return (
    <div className="flex items-center justify-center gap-2">
      {providers.map(({ provider, label, icon }) => (
        <OAuthButton
          key={label}
          provider={provider}
          label={label}
          icon={icon}
          isLoading={loadingButton === label}
          isDisabled={isAnyLoading}
          onClick={() => handleOAuth(provider, label)}
        />
      ))}
    </div>
  );
}

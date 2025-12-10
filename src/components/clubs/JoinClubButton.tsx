"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { JoinRequestButton } from "./JoinRequestButton";
import { joinPublicClub } from "@/app/actions/clubs/membership";
import toast from "react-hot-toast";
import { Lock } from "@phosphor-icons/react";

interface JoinClubButtonProps {
  clubId: string;
  clubName: string;
  clubSlug: string;
  privacy: "public_open" | "public_moderated" | "private" | string | null;
  variant?: "primary" | "secondary" | "ghost" | "club-accent";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function JoinClubButton({
  clubId,
  clubName,
  clubSlug,
  privacy,
  variant = "club-accent",
  size = "sm",
  className,
}: JoinClubButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // For public_open clubs, show direct join button
  if (privacy === "public_open") {
    const handleJoin = () => {
      startTransition(async () => {
        const result = await joinPublicClub(clubId);

        if ("error" in result && result.error) {
          toast.error(result.error);
        } else if (result.success) {
          toast.success(`Welcome to ${clubName}!`);
          router.refresh();
        }
      });
    };

    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleJoin}
        isLoading={isPending}
        disabled={isPending}
      >
        {isPending ? "Joining..." : "Join Club"}
      </Button>
    );
  }

  // For public_moderated clubs, show request button
  if (privacy === "public_moderated") {
    return (
      <JoinRequestButton
        clubId={clubId}
        clubName={clubName}
        clubSlug={clubSlug}
        variant={variant === "club-accent" ? "primary" : variant}
        size={size}
        className={className}
      />
    );
  }

  // For private/invite-only clubs, show invite only badge
  return (
    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
      <Lock className="w-3 h-3" />
      <span>Invite Only</span>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { SocialLinks } from "@/components/profile/SocialLinks";
import { updateProfile } from "@/app/actions/auth";
import { updateSocialLinksVisibility } from "@/app/actions/id-card";
import toast from "react-hot-toast";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/typography";
import { IdentificationCard } from "@phosphor-icons/react";
import type { IDCardSocialLinksVisibility } from "@/types/id-card";

interface SocialLinksFormProps {
  initialLinks: {
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
  };
  initialVisibility?: IDCardSocialLinksVisibility;
}

const platforms = [
  { key: "letterboxd" as const, label: "Letterboxd" },
  { key: "imdb" as const, label: "IMDb" },
  { key: "trakt" as const, label: "Trakt" },
  { key: "tmdb" as const, label: "TMDB" },
  { key: "youtube" as const, label: "YouTube" },
  { key: "twitter" as const, label: "X" },
  { key: "instagram" as const, label: "Instagram" },
  { key: "reddit" as const, label: "Reddit" },
  { key: "discord" as const, label: "Discord" },
  { key: "tiktok" as const, label: "TikTok" },
];

export function SocialLinksForm({ initialLinks, initialVisibility }: SocialLinksFormProps) {
  const [isPending, startTransition] = useTransition();
  const [socialLinks, setSocialLinks] = useState(initialLinks);
  const [visibility, setVisibility] = useState<IDCardSocialLinksVisibility>(
    initialVisibility || {}
  );

  const handleSave = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("social_links_json", JSON.stringify(socialLinks));

      // Save social links
      const result = await updateProfile(null, formData);

      // Save visibility settings
      const visibilityResult = await updateSocialLinksVisibility(visibility);

      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else if ("error" in visibilityResult) {
        toast.error(visibilityResult.error);
      } else {
        toast.success("Social links saved");
      }
    });
  };

  const handleVisibilityChange = (
    platform: keyof IDCardSocialLinksVisibility,
    visible: boolean
  ) => {
    setVisibility((prev) => ({
      ...prev,
      [platform]: visible,
    }));
  };

  // Check which platforms have links set
  const hasAnyLinks = platforms.some((p) => socialLinks[p.key]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
          Social Media Links
        </h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Connect your external movie tracking accounts. These will appear on your profile.
        </p>

        <SocialLinks
          socialLinks={socialLinks}
          onChange={(links) => setSocialLinks(links)}
          disabled={isPending}
        />
      </div>

      {/* ID Card Visibility Settings */}
      {hasAnyLinks && (
        <div className="pt-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-2 mb-3">
            <IdentificationCard className="h-4 w-4 text-[var(--primary)]" />
            <h3 className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Show on ID Card
            </h3>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            Choose which social links appear on your BackRow ID card.
          </p>

          <div className="space-y-3">
            {platforms.map((platform) => {
              const hasLink = Boolean(socialLinks[platform.key]);
              if (!hasLink) return null;

              // Default to true if not explicitly set
              const isVisible = visibility[platform.key] !== false;

              return (
                <div key={platform.key} className="flex items-center justify-between py-1">
                  <Text size="sm">{platform.label}</Text>
                  <Switch
                    checked={isVisible}
                    onCheckedChange={(checked) => handleVisibilityChange(platform.key, checked)}
                    disabled={isPending}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(JSON.stringify(socialLinks) !== JSON.stringify(initialLinks) ||
        JSON.stringify(visibility) !== JSON.stringify(initialVisibility || {})) && (
        <div className="pt-4 border-t border-[var(--border)]">
          <Button onClick={handleSave} disabled={isPending} variant="primary" size="sm">
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}

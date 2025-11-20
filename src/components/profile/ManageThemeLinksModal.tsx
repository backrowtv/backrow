"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import {
  getFutureNominationLinks,
  addFutureNominationLink,
  removeFutureNominationLink,
  type FutureNominationLink,
} from "@/app/actions/profile";
import toast from "react-hot-toast";
import { Link, CircleNotch, X, Check, Trash } from "@phosphor-icons/react";
import type { ClubTheme } from "./hooks/useThemeLinking";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { clubToAvatarData } from "@/lib/avatar-helpers";

export interface ManageThemeLinksItem {
  id: string;
  movie: {
    title: string;
    year?: number | null;
    poster_url?: string | null;
  } | null;
}

interface ManageThemeLinksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ManageThemeLinksItem | null;
  clubThemes: ClubTheme[];
  onNominate: (futureNominationId: string, clubId: string, festivalId: string) => Promise<void>;
  onLinksChanged: () => void;
  loading: boolean;
  /** Optional callback to remove the movie from future nominations */
  onRemove?: () => Promise<void>;
}

export function ManageThemeLinksModal({
  open,
  onOpenChange,
  item,
  clubThemes,
  onNominate,
  onLinksChanged,
  loading,
  onRemove,
}: ManageThemeLinksModalProps) {
  const [links, setLinks] = useState<FutureNominationLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [selectedClub, setSelectedClub] = useState<string>("");
  const [selectedTheme, setSelectedTheme] = useState<string>("");
  const [addingLink, setAddingLink] = useState(false);
  const [removingLinkId, setRemovingLinkId] = useState<string | null>(null);
  const [nominatingLinkId, setNominatingLinkId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const selectedClubData = clubThemes.find((c) => c.clubId === selectedClub);

  const linkedThemePoolIds = links
    .filter((link) => link.club_id === selectedClub && !link.nominated)
    .map((link) => link.theme_pool_id);

  const availableThemesForClub =
    selectedClubData?.themes.filter((theme) => !linkedThemePoolIds.includes(theme.id)) || [];

  const availableClubs = clubThemes.filter((club) => {
    const clubLinkedThemePoolIds = links
      .filter((link) => link.club_id === club.clubId && !link.nominated)
      .map((link) => link.theme_pool_id);
    return club.themes.some((theme) => !clubLinkedThemePoolIds.includes(theme.id));
  });

  useEffect(() => {
    if (open && item) {
      loadLinks();
    } else {
      setLinks([]);
      setSelectedClub("");
      setSelectedTheme("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Depends on item?.id not the full item object to avoid unnecessary reloads
  }, [open, item?.id]);

  async function loadLinks() {
    if (!item) return;
    setLinksLoading(true);
    try {
      const result = await getFutureNominationLinks(item.id);
      if (result.data) {
        setLinks(result.data);
      }
    } catch (error) {
      console.error("Error loading links:", error);
    } finally {
      setLinksLoading(false);
    }
  }

  async function handleAddLink() {
    if (!item || !selectedClub || !selectedTheme) return;

    setAddingLink(true);
    try {
      const result = await addFutureNominationLink(item.id, selectedClub, selectedTheme, null);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Theme linked!");
        setSelectedClub("");
        setSelectedTheme("");
        await loadLinks();
        onLinksChanged();
      }
    } catch (error) {
      console.error("Error adding link:", error);
      toast.error("Failed to add link");
    } finally {
      setAddingLink(false);
    }
  }

  async function handleRemoveLink(linkId: string) {
    setRemovingLinkId(linkId);
    try {
      const result = await removeFutureNominationLink(linkId);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Link removed");
        await loadLinks();
        onLinksChanged();
      }
    } catch (error) {
      console.error("Error removing link:", error);
      toast.error("Failed to remove link");
    } finally {
      setRemovingLinkId(null);
    }
  }

  async function handleNominateLink(link: FutureNominationLink) {
    if (!item || !link.festival_id) return;

    setNominatingLinkId(link.id);
    try {
      await onNominate(item.id, link.club_id, link.festival_id);
      await loadLinks();
    } catch (error) {
      console.error("Error nominating:", error);
    } finally {
      setNominatingLinkId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[calc(100vw-2rem)] sm:max-w-md"
        style={{ backgroundColor: "var(--surface-1)" }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "var(--text-primary)" }}>Link to Theme</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {item?.movie && (
            <div
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ backgroundColor: "var(--surface-2)" }}
            >
              {item.movie.poster_url && (
                <div
                  className="relative w-12 h-18 rounded overflow-hidden flex-shrink-0"
                  style={{ aspectRatio: "2/3" }}
                >
                  <Image
                    src={
                      item.movie.poster_url.startsWith("http")
                        ? item.movie.poster_url
                        : `https://image.tmdb.org/t/p/w200${item.movie.poster_url}`
                    }
                    alt={item.movie.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                  {item.movie.title}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {item.movie.year}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              Linked Themes
            </p>

            {linksLoading ? (
              <div className="flex justify-center py-4">
                <CircleNotch
                  className="w-5 h-5 animate-spin"
                  style={{ color: "var(--text-muted)" }}
                />
              </div>
            ) : links.length === 0 ? (
              <p
                className="text-sm py-3 text-center rounded-lg"
                style={{ color: "var(--text-muted)", backgroundColor: "var(--surface-2)" }}
              >
                Not linked to any themes yet
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ backgroundColor: "var(--surface-2)" }}
                  >
                    <div className="flex-shrink-0">
                      <EntityAvatar
                        entity={clubToAvatarData(link.club)}
                        emojiSet="club"
                        size="sm"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className="font-medium text-sm truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {link.theme_pool?.theme_name || link.festival?.theme || "Untitled Theme"}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                        {link.club?.name || "Unknown Club"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      {!link.nominated && link.festival_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleNominateLink(link)}
                          disabled={nominatingLinkId === link.id || loading}
                          className="h-8 px-2 text-[var(--success)] hover:text-[var(--success)] hover:bg-[var(--success)]/10"
                          title="Nominate now"
                        >
                          {nominatingLinkId === link.id ? (
                            <CircleNotch className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      {!link.nominated && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveLink(link.id)}
                          disabled={removingLinkId === link.id}
                          className="h-8 px-2 text-[var(--error)] hover:text-[var(--error)] hover:bg-[var(--error)]/10"
                          title="Remove link"
                        >
                          {removingLinkId === link.id ? (
                            <CircleNotch className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
            <p
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              Link to Theme
            </p>

            {availableClubs.length === 0 ? (
              <p className="text-sm py-2" style={{ color: "var(--text-muted)" }}>
                {clubThemes.length === 0 || clubThemes.every((c) => c.themes.length === 0)
                  ? "No upcoming themes available in your clubs"
                  : "Already linked to all available themes"}
              </p>
            ) : (
              <>
                <Select
                  label="Club"
                  value={selectedClub}
                  onChange={(e) => {
                    setSelectedClub(e.target.value);
                    setSelectedTheme("");
                  }}
                >
                  <option value="">Select a club</option>
                  {availableClubs.map((club) => (
                    <option key={club.clubId} value={club.clubId}>
                      {club.clubName}
                    </option>
                  ))}
                </Select>

                {selectedClub && availableThemesForClub.length > 0 && (
                  <Select
                    label="Theme"
                    value={selectedTheme}
                    onChange={(e) => setSelectedTheme(e.target.value)}
                  >
                    <option value="">Select a theme</option>
                    {availableThemesForClub.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {theme.theme || "Untitled Theme"}
                      </option>
                    ))}
                  </Select>
                )}

                {selectedClub && availableThemesForClub.length === 0 && (
                  <p className="text-sm py-2" style={{ color: "var(--text-muted)" }}>
                    No upcoming themes in this club
                  </p>
                )}

                <Button
                  variant="outline"
                  onClick={handleAddLink}
                  disabled={!selectedClub || !selectedTheme || addingLink}
                  className="w-full"
                >
                  {addingLink ? (
                    <CircleNotch className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Link className="w-4 h-4 mr-2" />
                  )}
                  Link Theme
                </Button>
              </>
            )}

            {onRemove && (
              <button
                onClick={async () => {
                  setRemoving(true);
                  try {
                    await onRemove();
                  } finally {
                    setRemoving(false);
                  }
                }}
                disabled={removing}
                className="flex items-center gap-1.5 text-xs transition-colors disabled:opacity-50 mx-auto"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--error)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                {removing ? (
                  <CircleNotch className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash className="w-3 h-3" />
                )}
                Remove
              </button>
            )}
          </div>

          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

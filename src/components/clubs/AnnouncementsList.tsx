"use client";

import { deleteAnnouncement } from "@/app/actions/clubs";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Trash } from "@phosphor-icons/react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  message: string;
  image_url?: string | null;
  announcement_type?: string | null;
  created_at: string;
  expires_at: string | null;
}

interface AnnouncementsListProps {
  clubId: string;
  announcements: Announcement[];
  isAdmin?: boolean;
}

export function AnnouncementsList({
  clubId: _clubId,
  announcements,
  isAdmin = false,
}: AnnouncementsListProps) {
  const [isPending, startTransition] = useTransition();
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);
  const router = useRouter();

  function handleDeleteClick(e: React.MouseEvent, announcement: Announcement) {
    e.stopPropagation();
    setAnnouncementToDelete(announcement);
  }

  async function handleConfirmDelete() {
    if (!announcementToDelete) return;

    startTransition(async () => {
      await deleteAnnouncement(announcementToDelete.id);
      router.refresh();
      setAnnouncementToDelete(null);
    });
  }

  if (announcements.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-3">
        {announcements.map((announcement) => {
          const hasImage = !!announcement.image_url;
          const hasTitle = announcement.title && announcement.title.trim() !== "";
          const hasBody = announcement.message && announcement.message.trim() !== "";
          const hasTextContent = hasTitle || hasBody;

          return (
            <div key={announcement.id} className="group relative">
              {hasImage ? (
                // Image card
                <div className="relative aspect-video rounded-lg overflow-hidden bg-[var(--surface-1)]">
                  <Image
                    src={announcement.image_url!}
                    alt="Announcement image"
                    fill
                    sizes="(max-width: 640px) 100vw, 400px"
                    className="object-cover"
                  />
                  {/* Text overlay at bottom if there's content */}
                  {hasTextContent && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 pt-8">
                      {hasTitle && (
                        <h3 className="text-white font-semibold text-base">{announcement.title}</h3>
                      )}
                      {hasBody && (
                        <p className="text-white/80 text-sm mt-1 line-clamp-2">
                          {announcement.message}
                        </p>
                      )}
                    </div>
                  )}
                  {/* Delete button for admins - always visible on mobile */}
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteClick(e, announcement)}
                      disabled={isPending}
                      className="absolute top-2 right-2 h-8 w-8 bg-black/50 hover:bg-black/70 text-white transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                      aria-label={`Delete announcement`}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                // Text-only card
                <div
                  className={cn(
                    "rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4",
                    !hasTextContent && "hidden"
                  )}
                >
                  {hasTitle && (
                    <h3 className="text-[var(--text-primary)] font-semibold text-base">
                      {announcement.title}
                    </h3>
                  )}
                  {hasBody && (
                    <p className={cn("text-[var(--text-secondary)] text-sm", hasTitle && "mt-1")}>
                      {announcement.message}
                    </p>
                  )}
                  {/* Delete button for admins - always visible on mobile */}
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteClick(e, announcement)}
                      disabled={isPending}
                      className="absolute top-2 right-2 h-7 w-7 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                      aria-label={`Delete announcement`}
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={announcementToDelete !== null}
        onOpenChange={(open) => !open && setAnnouncementToDelete(null)}
        title="Delete Announcement?"
        description="Are you sure you want to delete this announcement? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        variant="danger"
        isLoading={isPending}
      />
    </>
  );
}

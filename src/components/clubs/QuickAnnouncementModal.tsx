"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { createAnnouncement } from "@/app/actions/clubs";
import { PushPin, CircleNotch } from "@phosphor-icons/react";

interface QuickAnnouncementModalProps {
  clubId: string;
  trigger?: React.ReactNode;
  variant?: "default" | "subtle";
}

export function QuickAnnouncementModal({
  clubId,
  trigger,
  variant = "default",
}: QuickAnnouncementModalProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const defaultTrigger =
    variant === "subtle" ? (
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <PushPin className="h-3 w-3 mr-1" />
        Announce
      </Button>
    ) : (
      <Button>
        <PushPin className="h-4 w-4 mr-2" />
        New Announcement
      </Button>
    );

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setExpiresAt("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !message.trim()) {
      setError("Title and message are required");
      return;
    }

    const formData = new FormData();
    formData.append("clubId", clubId);
    formData.append("title", title.trim());
    formData.append("message", message.trim());
    if (expiresAt) {
      formData.append("expiresAt", expiresAt);
    }

    startTransition(async () => {
      const result = await createAnnouncement(null, formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        resetForm();
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PushPin className="h-5 w-5" />
            Quick Announcement
          </DialogTitle>
          <DialogDescription>Share an update with your club members.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              ref={titleInputRef}
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's the announcement about?"
              required
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share your announcement with the club..."
              rows={4}
              required
            />
          </div>

          {/* Expiration */}
          <div className="relative">
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expires (optional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
              <p className="text-xs text-[var(--text-muted)]">
                Leave empty to keep the announcement indefinitely
              </p>
            </div>
            <p
              className={`absolute left-0 top-full mt-1 text-sm text-[var(--destructive)] ${!error ? "invisible pointer-events-none" : ""}`}
            >
              {error}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="club-accent"
              disabled={isPending || !title.trim() || !message.trim()}
            >
              {isPending ? (
                <>
                  <CircleNotch className="h-4 w-4 animate-spin mr-2" />
                  Posting...
                </>
              ) : (
                "Post Announcement"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

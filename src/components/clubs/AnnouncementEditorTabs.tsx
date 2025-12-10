"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DebossedTabs } from "@/components/ui/debossed-tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { RichAnnouncementForm } from "./RichAnnouncementForm";
import { createAnnouncement } from "@/app/actions/clubs";
import { Lightning, Sparkle, CircleNotch } from "@phosphor-icons/react";

interface AnnouncementEditorTabsProps {
  clubId: string;
}

export function AnnouncementEditorTabs({ clubId }: AnnouncementEditorTabsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"quick" | "rich">("quick");
  const router = useRouter();

  // Simple form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const resetSimpleForm = () => {
    setTitle("");
    setMessage("");
    setExpiresAt("");
    setError(null);
  };

  const handleSimpleSubmit = (e: React.FormEvent) => {
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
        resetSimpleForm();
        router.refresh();
      }
    });
  };

  return (
    <div className="w-full space-y-4">
      <DebossedTabs
        options={[
          { value: "quick", label: "Quick", icon: Lightning },
          { value: "rich", label: "Rich Editor", icon: Sparkle },
        ]}
        value={activeTab}
        onChange={(v) => setActiveTab(v as "quick" | "rich")}
        fullWidth
        compact
      />

      {activeTab === "quick" && (
        <div>
          <form onSubmit={handleSimpleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="simple-title">Title</Label>
                <span className="text-xs text-[var(--text-muted)] tabular-nums">
                  {title.length}/50
                </span>
              </div>
              <Input
                id="simple-title"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 50))}
                placeholder="Announcement title"
                maxLength={50}
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="simple-message">Message</Label>
                <span className="text-xs text-[var(--text-muted)] tabular-nums">
                  {message.length}/280
                </span>
              </div>
              <Textarea
                id="simple-message"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 280))}
                placeholder="Your announcement message..."
                maxLength={280}
                rows={4}
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-[var(--text-primary)]">Expires (Optional)</Label>
              <DateTimePicker
                value={expiresAt}
                onChange={(val) => setExpiresAt(val)}
                disabled={isPending}
                placeholder="Select expiration date"
              />
              <p className="text-xs text-[var(--text-muted)]">
                Leave empty to keep the announcement indefinitely
              </p>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-lg bg-[var(--error)]/10 border border-[var(--error)]/20">
                <p className="text-sm text-[var(--error)]">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isPending || !title.trim() || !message.trim()}
              className="w-full"
            >
              {isPending ? (
                <>
                  <CircleNotch className="h-4 w-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                "Post Announcement"
              )}
            </Button>
          </form>
        </div>
      )}

      {activeTab === "rich" && (
        <div>
          <RichAnnouncementForm clubId={clubId} />
        </div>
      )}
    </div>
  );
}

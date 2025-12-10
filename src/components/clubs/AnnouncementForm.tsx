"use client";

import { createAnnouncement } from "@/app/actions/clubs";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AnnouncementFormProps {
  clubId: string;
  onSuccess?: () => void;
}

type FormState = { error?: string; success?: boolean } | null;

export function AnnouncementForm({ clubId, onSuccess }: AnnouncementFormProps) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    createAnnouncement,
    null
  );
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  if (state && "success" in state && state.success) {
    if (onSuccess) onSuccess();
    setTitle("");
    setMessage("");
    setExpiresAt("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Announcement</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="clubId" value={clubId} />

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              name="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Announcement message"
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Expires At (Optional)</Label>
            <DateTimePicker
              value={expiresAt}
              onChange={(val) => setExpiresAt(val)}
              placeholder="Select expiration date"
            />
          </div>

          {state && "error" in state && state.error && (
            <div className="text-sm text-[var(--destructive)]">{state.error}</div>
          )}

          <Button type="submit" variant="club-accent" disabled={isPending}>
            {isPending ? "Creating..." : "Create Announcement"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

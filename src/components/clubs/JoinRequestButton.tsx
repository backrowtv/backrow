"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { createJoinRequest, getUserPendingRequest } from "@/app/actions/clubs";
import toast from "react-hot-toast";

interface JoinRequestButtonProps {
  clubId: string;
  clubName: string;
  clubSlug: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function JoinRequestButton({
  clubId,
  clubName,
  clubSlug: _clubSlug,
  variant = "primary",
  size = "md",
  className,
}: JoinRequestButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [existingRequest, setExistingRequest] = useState<{
    id: string;
    status: string;
    created_at: string | null;
  } | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const router = useRouter();

  // Check if user already has a pending request
  useEffect(() => {
    async function checkExistingRequest() {
      setIsCheckingStatus(true);
      const result = await getUserPendingRequest(clubId);
      if (result.request) {
        setExistingRequest(result.request);
      }
      setIsCheckingStatus(false);
    }
    checkExistingRequest();
  }, [clubId]);

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await createJoinRequest(clubId, message.trim() || undefined);

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else if (result.success) {
        toast.success("Join request sent! You'll be notified when it's reviewed.");
        setIsOpen(false);
        setMessage("");
        // Set a placeholder request state - the actual ID will be fetched on next load
        setExistingRequest({
          id: "pending",
          status: "pending",
          created_at: new Date().toISOString(),
        });
        router.refresh();
      }
    });
  };

  // Show pending status if request already exists
  if (existingRequest) {
    return (
      <Button variant="secondary" size={size} className={className} disabled>
        {existingRequest.status === "pending" ? "Request Pending" : "Request Sent"}
      </Button>
    );
  }

  // Show loading while checking status
  if (isCheckingStatus) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        Loading...
      </Button>
    );
  }

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setIsOpen(true)}>
        Request to Join
      </Button>

      <Modal
        open={isOpen}
        onOpenChange={setIsOpen}
        title="Request to Join"
        description={`Send a request to join "${clubName}". Club admins will review your request.`}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="message"
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              Message (optional)
            </label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Introduce yourself or explain why you'd like to join..."
              rows={3}
              maxLength={500}
              className="resize-none"
            />
            <p className="text-xs text-right" style={{ color: "var(--text-muted)" }}>
              {message.length}/500
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              isLoading={isPending}
              disabled={isPending}
              className="flex-1"
            >
              {isPending ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

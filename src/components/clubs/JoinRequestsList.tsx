"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";

import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { userToAvatarData } from "@/lib/avatar-helpers";
import { approveJoinRequest, denyJoinRequest, type JoinRequest } from "@/app/actions/clubs";
import toast from "react-hot-toast";
import { Check, X } from "@phosphor-icons/react";

interface JoinRequestsListProps {
  requests: JoinRequest[];
  clubId: string;
}

export function JoinRequestsList({ requests, clubId: _clubId }: JoinRequestsListProps) {
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [denyModalOpen, setDenyModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [denialReason, setDenialReason] = useState("");
  const router = useRouter();

  const handleApprove = (requestId: string) => {
    setProcessingId(requestId);
    startTransition(async () => {
      const result = await approveJoinRequest(requestId);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Request approved! Member has been added.");
        router.refresh();
      }
      setProcessingId(null);
    });
  };

  const openDenyModal = (request: JoinRequest) => {
    setSelectedRequest(request);
    setDenialReason("");
    setDenyModalOpen(true);
  };

  const handleDeny = () => {
    if (!selectedRequest) return;

    setProcessingId(selectedRequest.id);
    startTransition(async () => {
      const result = await denyJoinRequest(selectedRequest.id, denialReason.trim() || undefined);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Request denied.");
        setDenyModalOpen(false);
        setSelectedRequest(null);
        router.refresh();
      }
      setProcessingId(null);
    });
  };

  if (requests.length === 0) {
    return (
      <div className="py-12 text-center">
        <p style={{ color: "var(--text-muted)" }}>No pending join requests</p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-[var(--border)]">
        {requests.map((request) => {
          const user = request.users;
          const displayName = user.display_name || user.username || "Unknown User";
          const isProcessing = processingId === request.id;

          return (
            <div key={request.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-start gap-4">
                {/* User Avatar */}
                <EntityAvatar
                  entity={userToAvatarData({
                    avatar_url: user.avatar_url,
                    display_name: user.display_name,
                    email: user.email,
                  })}
                  emojiSet="user"
                  size="md"
                />

                {/* Request Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {displayName}
                    </span>
                    {user.username && (
                      <span className="text-sm truncate" style={{ color: "var(--text-muted)" }}>
                        @{user.username}
                      </span>
                    )}
                  </div>

                  {request.message && (
                    <p
                      className="text-sm mb-2 line-clamp-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      "{request.message}"
                    </p>
                  )}

                  {request.created_at && (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Requested{" "}
                      {formatDistanceToNow(new Date(request.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openDenyModal(request)}
                    disabled={isProcessing || isPending}
                    className="gap-1"
                  >
                    <X className="w-4 h-4" />
                    <span className="hidden sm:inline">Deny</span>
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleApprove(request.id)}
                    disabled={isProcessing || isPending}
                    isLoading={isProcessing}
                    className="gap-1"
                  >
                    <Check className="w-4 h-4" />
                    <span className="hidden sm:inline">Approve</span>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deny Modal */}
      <Modal
        open={denyModalOpen}
        onOpenChange={setDenyModalOpen}
        title="Deny Request"
        description={`Deny ${selectedRequest?.users.display_name || selectedRequest?.users.username || "this user"}'s request to join?`}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="denialReason"
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              Reason (optional)
            </label>
            <Textarea
              id="denialReason"
              value={denialReason}
              onChange={(e) => setDenialReason(e.target.value)}
              placeholder="Let them know why their request was denied..."
              rows={3}
              maxLength={500}
              className="resize-none"
            />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              If you include a reason, the user will receive a notification with your message.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDenyModalOpen(false)}
              disabled={isPending}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleDeny}
              isLoading={processingId === selectedRequest?.id}
              disabled={isPending}
              className="flex-1"
            >
              Deny Request
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

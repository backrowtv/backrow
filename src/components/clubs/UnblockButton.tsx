"use client";

import { unblockUser } from "@/app/actions/clubs";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

interface UnblockButtonProps {
  clubId: string;
  userId: string;
  userName?: string;
}

export function UnblockButton({ clubId, userId, userName }: UnblockButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  async function handleUnblock() {
    startTransition(async () => {
      const result = await unblockUser(clubId, userId);
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
      setShowConfirm(false);
    });
  }

  return (
    <div>
      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>}
      <Button variant="outline" size="sm" onClick={() => setShowConfirm(true)} disabled={isPending}>
        {isPending ? "Unblocking..." : "Unblock"}
      </Button>

      <ConfirmationDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Unblock User?"
        description={
          <span>
            Are you sure you want to unblock {userName ? <strong>{userName}</strong> : "this user"}?
            They will be able to request to join or rejoin the club.
          </span>
        }
        confirmText="Unblock"
        onConfirm={handleUnblock}
        variant="default"
        isLoading={isPending}
      />
    </div>
  );
}

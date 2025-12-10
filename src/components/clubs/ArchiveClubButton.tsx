"use client";

import { archiveClub } from "@/app/actions/clubs";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

interface ArchiveClubButtonProps {
  clubId: string;
  archived: boolean;
}

export function ArchiveClubButton({ clubId, archived }: ArchiveClubButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  async function handleArchive() {
    startTransition(async () => {
      const result = await archiveClub(clubId);
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
      {error && <div className="rounded-md bg-red-600 p-3 text-sm text-white mb-4">{error}</div>}
      <Button
        variant="danger"
        onClick={() => setShowConfirm(true)}
        disabled={isPending || archived}
        aria-label={archived ? "Club already archived" : "Archive club"}
      >
        {isPending ? "Archiving..." : archived ? "Already Archived" : "Archive Club"}
      </Button>

      <ConfirmationDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Archive Club?"
        description="This will archive the club. Members will no longer be able to access it or participate in festivals. This action can be reversed by a site administrator."
        confirmText="Archive Club"
        onConfirm={handleArchive}
        variant="danger"
        isLoading={isPending}
      />
    </div>
  );
}

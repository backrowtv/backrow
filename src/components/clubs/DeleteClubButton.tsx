"use client";

import { deleteClub } from "@/app/actions/clubs";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { BrandText } from "@/components/ui/brand-text";

interface DeleteClubButtonProps {
  clubId: string;
  clubName: string;
}

export function DeleteClubButton({ clubId, clubName }: DeleteClubButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);

  const isConfirmed = confirmText === clubName;

  async function handleDelete() {
    startTransition(async () => {
      const result = await deleteClub(clubId);
      if (result && "error" in result && result.error) {
        setError(result.error);
        setShowFinalConfirm(false);
      } else {
        router.push("/clubs");
      }
    });
  }

  function handleProceedToFinalConfirm() {
    if (!isConfirmed) {
      setError("Club name must match exactly");
      return;
    }
    setShowFinalConfirm(true);
  }

  if (!showConfirm) {
    return (
      <Button variant="danger" onClick={() => setShowConfirm(true)}>
        Delete Club
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-600 p-3 text-sm text-white">{error}</div>}
      <div className="space-y-2">
        <Label htmlFor="confirmDelete">
          Type the club name{" "}
          <strong>
            <BrandText>{clubName}</BrandText>
          </strong>{" "}
          to confirm deletion:
        </Label>
        <Input
          id="confirmDelete"
          value={confirmText}
          onChange={(e) => {
            setConfirmText(e.target.value);
            setError(null);
          }}
          placeholder={clubName}
          disabled={isPending}
        />
      </div>
      <div className="flex gap-2">
        <Button
          variant="danger"
          onClick={handleProceedToFinalConfirm}
          disabled={isPending || !isConfirmed}
        >
          {isPending ? "Deleting..." : "Permanently Delete Club"}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setShowConfirm(false);
            setConfirmText("");
            setError(null);
          }}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>

      <ConfirmationDialog
        open={showFinalConfirm}
        onOpenChange={setShowFinalConfirm}
        title="Permanently Delete Club?"
        description={
          <span>
            This action <strong>cannot be undone</strong>. The club{" "}
            <strong>
              <BrandText>{clubName}</BrandText>
            </strong>{" "}
            and all its data (festivals, nominations, ratings, results) will be permanently deleted.
          </span>
        }
        confirmText="Delete Forever"
        onConfirm={handleDelete}
        variant="danger"
        isLoading={isPending}
      />
    </div>
  );
}

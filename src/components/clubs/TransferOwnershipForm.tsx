"use client";

import { transferOwnership } from "@/app/actions/clubs";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/typography";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

interface TransferOwnershipFormProps {
  clubId: string;
  members: Array<{ id: string; display_name: string }>;
}

export function TransferOwnershipForm({ clubId, members }: TransferOwnershipFormProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const selectedMember = members.find((m) => m.id === selectedUserId);

  function handleTransferClick() {
    if (!selectedUserId) {
      setError("Please select a member");
      return;
    }
    setShowConfirm(true);
  }

  async function handleTransfer() {
    startTransition(async () => {
      const result = await transferOwnership(clubId, selectedUserId);
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
      setShowConfirm(false);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer Ownership</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Text size="sm" muted>
          Transfer ownership of this club to another member. You will become a director.
        </Text>
        <div className="space-y-2">
          <Label htmlFor="newOwner">New Owner</Label>
          <Select
            id="newOwner"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">Select a member...</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.display_name}
              </option>
            ))}
          </Select>
        </div>
        {error && (
          <p
            className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
            role="alert"
          >
            <span aria-hidden="true">⚠</span>
            {error}
          </p>
        )}
        <Button onClick={handleTransferClick} disabled={isPending || !selectedUserId}>
          {isPending ? "Transferring..." : "Transfer Ownership"}
        </Button>
      </CardContent>

      <ConfirmationDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Transfer Ownership?"
        description={
          <span>
            Are you sure you want to transfer ownership to{" "}
            <strong>{selectedMember?.display_name}</strong>? You will be demoted to a director and
            lose producer privileges.
          </span>
        }
        confirmText="Transfer Ownership"
        onConfirm={handleTransfer}
        variant="danger"
        isLoading={isPending}
      />
    </Card>
  );
}

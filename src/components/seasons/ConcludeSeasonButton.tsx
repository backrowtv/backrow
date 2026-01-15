"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Text } from "@/components/ui/typography";
import { concludeSeason } from "@/app/actions/seasons";
import toast from "react-hot-toast";

interface ConcludeSeasonButtonProps {
  clubId: string;
}

export function ConcludeSeasonButton({ clubId }: ConcludeSeasonButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleConclude = async () => {
    setIsPending(true);
    try {
      const result = await concludeSeason(clubId);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Season concluded. New season "${result.newSeasonName}" created automatically.`
        );
        setIsModalOpen(false);
        router.refresh();
      }
    } catch {
      toast.error("Failed to conclude season");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="text-xs font-medium px-2.5 py-1 rounded-md text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors"
      >
        Conclude Season
      </button>

      <Modal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title="Conclude Current Season"
        description="This will end the current season and create a new one"
        size="md"
      >
        <div className="space-y-4">
          <Text size="md">Are you sure you want to conclude the current season? This will:</Text>

          <ul
            className="list-disc list-inside space-y-2 text-sm ml-2"
            style={{ color: "var(--text-muted)" }}
          >
            <li>End the current season immediately</li>
            <li>Create a new season with an incremented name</li>
            <li>Preserve the season subtitle (if set)</li>
          </ul>

          <div
            className="flex items-center justify-end gap-3 pt-4 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleConclude} isLoading={isPending}>
              Conclude Season
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

"use client";

import { calculateResults } from "@/app/actions/results";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/typography";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

interface CalculateResultsButtonProps {
  festivalId: string;
}

export function CalculateResultsButton({ festivalId }: CalculateResultsButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  async function handleCalculate() {
    startTransition(async () => {
      const result = await calculateResults(festivalId);
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        setError(null);
        router.refresh();
      }
      setShowConfirm(false);
    });
  }

  return (
    <div>
      {error && (
        <Card variant="outlined" className="border-red-500/30 bg-red-900/10 mb-4">
          <div className="p-3">
            <Text size="sm" className="text-red-400">
              {error}
            </Text>
          </div>
        </Card>
      )}
      <Button onClick={() => setShowConfirm(true)} isLoading={isPending} variant="primary">
        {isPending ? "Calculating..." : "Calculate Results"}
      </Button>

      <ConfirmationDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Calculate Results?"
        description="This will finalize the festival results. Once calculated, results are cached permanently and cannot be recalculated. Make sure all ratings are complete before proceeding."
        confirmText="Calculate Results"
        onConfirm={handleCalculate}
        variant="default"
        isLoading={isPending}
      />
    </div>
  );
}

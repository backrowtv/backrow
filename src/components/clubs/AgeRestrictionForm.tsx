"use client";

import { updateClubSettings } from "@/app/actions/clubs";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/typography";
import toast from "react-hot-toast";

interface AgeRestrictionFormProps {
  clubId: string;
  settings: Record<string, unknown>;
}

export function AgeRestrictionForm({ clubId, settings }: AgeRestrictionFormProps) {
  const [isPending, startTransition] = useTransition();
  const [minAge, setMinAge] = useState<number>((settings.min_age as number) || 18);
  const router = useRouter();

  async function handleSave() {
    if (minAge < 18) {
      toast.error("Minimum age must be at least 18");
      return;
    }

    startTransition(async () => {
      const result = await updateClubSettings(clubId, { min_age: minAge });
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Age restriction updated");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Age Restriction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="minAge">Minimum Age</Label>
          <Input
            id="minAge"
            type="number"
            min="18"
            value={minAge}
            onChange={(e) => setMinAge(parseInt(e.target.value) || 18)}
          />
        </div>
        <Text size="sm" muted>
          Users must be at least {minAge} years old to join this club.
        </Text>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save Age Restriction"}
        </Button>
      </CardContent>
    </Card>
  );
}

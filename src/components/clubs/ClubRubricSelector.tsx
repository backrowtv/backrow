"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { setClubRubricPreference } from "@/app/actions/rubrics";
import toast from "react-hot-toast";
import { Scales, Info, Plus } from "@phosphor-icons/react";
import type { UserRubric } from "@/app/actions/rubrics.types";
import Link from "next/link";

interface ClubRubricSelectorProps {
  clubId: string;
  userRubrics: UserRubric[];
  defaultRubricId: string | null;
}

export function ClubRubricSelector({
  clubId,
  userRubrics,
  defaultRubricId,
}: ClubRubricSelectorProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedRubricId, setSelectedRubricId] = useState<string | null>(defaultRubricId);
  const [hasChanges, setHasChanges] = useState(false);

  const globalDefaultRubric = userRubrics.find((r) => r.is_default);

  useEffect(() => {
    setSelectedRubricId(defaultRubricId);
    setHasChanges(false);
  }, [defaultRubricId]);

  const handleChange = (value: string) => {
    const newValue = value || null;
    setSelectedRubricId(newValue);
    setHasChanges(newValue !== defaultRubricId);
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await setClubRubricPreference(clubId, selectedRubricId);

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Club rubric preference saved");
        setHasChanges(false);
      }
    });
  };

  const selectedRubric = userRubrics.find((r) => r.id === selectedRubricId);
  const isOverride = selectedRubricId && selectedRubricId !== globalDefaultRubric?.id;

  // If the saved preference happens to point at the user's current default rubric,
  // the option is filtered out of the list below — surface it as the "use default" entry.
  const dropdownValue = isOverride ? selectedRubricId : "";

  const helperText = globalDefaultRubric
    ? `Your default rubric is ${globalDefaultRubric.name}. Pick a different one for this club, or create a new one.`
    : userRubrics.length > 0
      ? "Pick a rubric for this club, or create a new one."
      : "You don't have any rubrics yet — create one to use it here.";

  return (
    <Card variant="default" hover>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scales className="h-5 w-5" style={{ color: "var(--primary)" }} />
          Rating Rubric for This Club
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="defaultRubric">Rubric for This Club</Label>
          <Select
            id="defaultRubric"
            value={dropdownValue}
            onChange={(e) => handleChange(e.target.value)}
            disabled={isPending || userRubrics.length === 0}
            helperText={helperText}
          >
            <option value="">
              {globalDefaultRubric
                ? `Use my default (${globalDefaultRubric.name})`
                : "No rubric (simple rating)"}
            </option>
            {userRubrics
              .filter((rubric) => rubric.id !== globalDefaultRubric?.id)
              .map((rubric) => (
                <option key={rubric.id} value={rubric.id}>
                  {rubric.name}
                </option>
              ))}
          </Select>
        </div>

        {selectedRubric && isOverride && (
          <div
            className="p-3 rounded-lg border"
            style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}
          >
            <Text size="sm" className="font-medium mb-2">
              Override Categories:
            </Text>
            <div className="flex flex-wrap gap-1">
              {selectedRubric.categories.map((c) => (
                <span
                  key={c.id}
                  className="text-xs px-2 py-1 rounded"
                  style={{ backgroundColor: "var(--surface-2)", color: "var(--text-muted)" }}
                >
                  {c.name} ({c.weight}%)
                </span>
              ))}
            </div>
          </div>
        )}

        {userRubrics.length === 0 && (
          <div
            className="p-3 rounded-lg flex items-start gap-2 border"
            style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}
          >
            <Info className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }} />
            <Text size="sm" muted>
              You don&apos;t have any rubrics yet.{" "}
              <Link
                href="/profile/settings/ratings"
                className="text-[var(--primary)] hover:underline"
              >
                Create one in your profile settings
              </Link>{" "}
              to use it here.
            </Text>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/profile/settings/ratings">
              <Plus className="h-4 w-4 mr-1" />
              Create a new rubric
            </Link>
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending || !hasChanges}
            variant="primary"
            size="sm"
          >
            {isPending ? "Saving..." : "Save Preference"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

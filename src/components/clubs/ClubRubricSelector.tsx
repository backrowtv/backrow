"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { setClubRubricPreference } from "@/app/actions/rubrics";
import toast from "react-hot-toast";
import { Scales, Info, Star } from "@phosphor-icons/react";
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

  // Find the user's global default rubric
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

  // Find the selected rubric for display
  const selectedRubric = userRubrics.find((r) => r.id === selectedRubricId);
  const isOverride = selectedRubricId && selectedRubricId !== globalDefaultRubric?.id;

  return (
    <Card variant="default" hover>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scales className="h-5 w-5" style={{ color: "var(--primary)" }} />
          Rating Rubric for This Club
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Global default info */}
        {globalDefaultRubric && (
          <div
            className="p-3 rounded-lg border flex items-start gap-2"
            style={{
              backgroundColor: "var(--primary)/5",
              borderColor: "var(--primary)/20",
            }}
          >
            <Star
              weight="fill"
              className="h-4 w-4 shrink-0 mt-0.5"
              style={{ color: "var(--primary)" }}
            />
            <div>
              <Text size="sm" className="font-medium" style={{ color: "var(--primary)" }}>
                Your Default: {globalDefaultRubric.name}
              </Text>
              <Text size="tiny" muted>
                This is your default rubric. You can override it for this club below.
              </Text>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="defaultRubric">Rubric for This Club</Label>
          <Select
            id="defaultRubric"
            value={selectedRubricId || ""}
            onChange={(e) => handleChange(e.target.value)}
            disabled={isPending}
            helperText={
              userRubrics.length === 0
                ? "Create rubrics in your profile settings to use them here."
                : "Select which rubric to use when rating movies in this club."
            }
          >
            <option value="">
              {globalDefaultRubric
                ? `Use My Default (${globalDefaultRubric.name})`
                : "No Rubric (Simple Rating)"}
            </option>
            {userRubrics.map((rubric) => (
              <option key={rubric.id} value={rubric.id}>
                {rubric.name}
                {rubric.is_default ? " (Default)" : ""}
              </option>
            ))}
          </Select>
        </div>

        {/* Selected Rubric Preview (only if overriding) */}
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
            <div>
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
          </div>
        )}

        {userRubrics.length > 0 && (
          <div
            className="p-3 rounded-lg flex items-start gap-2"
            style={{ backgroundColor: "var(--surface-1)" }}
          >
            <Info className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }} />
            <div>
              <Text size="sm" muted>
                When rating movies in this club, your selected rubric will be used. You can still
                change it when rating each movie.
              </Text>
            </div>
          </div>
        )}

        <div className="flex justify-end">
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

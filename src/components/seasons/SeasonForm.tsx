"use client";

import { createSeason, updateSeason } from "@/app/actions/seasons";
import { useActionState } from "react";
import { Database } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/typography";

type Season = Database["public"]["Tables"]["seasons"]["Row"];

interface SeasonFormProps {
  season?: Season;
  clubId: string;
}

export function SeasonForm({ season, clubId }: SeasonFormProps) {
  const isEditing = !!season;
  const [state, formAction, isPending] = useActionState(
    isEditing ? updateSeason : createSeason,
    null
  );

  // Format dates for input (YYYY-MM-DD)
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="clubId" value={clubId} />
      {isEditing && <input type="hidden" name="seasonId" value={season.id} />}

      {state && "error" in state && state.error && (
        <div
          className="rounded-lg p-3 border"
          style={{
            backgroundColor: "color-mix(in srgb, var(--error) 10%, transparent)",
            borderColor: "color-mix(in srgb, var(--error) 30%, transparent)",
          }}
        >
          <Text size="sm" style={{ color: "var(--error)", fontWeight: 500 }}>
            {state.error}
          </Text>
        </div>
      )}

      <Input
        id="name"
        name="name"
        type="text"
        label="Season Name"
        required
        disabled={isPending}
        defaultValue={season?.name}
        placeholder="Spring 2024"
      />

      <Input
        id="subtitle"
        name="subtitle"
        type="text"
        label="Subtitle (Optional)"
        disabled={isPending}
        defaultValue={(season as { subtitle?: string | null })?.subtitle || ""}
        placeholder="e.g., The Year of Action Movies"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          id="startDate"
          name="startDate"
          type="date"
          label="Start Date"
          required
          disabled={isPending}
          defaultValue={season ? formatDateForInput(season.start_date) : ""}
        />

        <Input
          id="endDate"
          name="endDate"
          type="date"
          label="End Date"
          required
          disabled={isPending}
          defaultValue={season ? formatDateForInput(season.end_date) : ""}
        />
      </div>

      <Text size="sm" muted>
        Seasons cannot overlap. The end date must be after the start date.
      </Text>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={isPending}
        isLoading={isPending}
        className="w-full"
      >
        {isEditing ? "Update Season" : "Create Season"}
      </Button>
    </form>
  );
}

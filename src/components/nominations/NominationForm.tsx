"use client";

import { createNomination } from "@/app/actions/nominations";
import { useActionState, useState } from "react";
import { MovieSearch } from "@/components/movies/MovieSearch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface NominationFormProps {
  festivalId: string;
  clubId: string;
}

export function NominationForm({ festivalId, clubId: _clubId }: NominationFormProps) {
  const [state, formAction, isPending] = useActionState(createNomination, null);
  const [selectedMovieId, setSelectedMovieId] = useState<number | undefined>();
  const [pitch, setPitch] = useState("");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="festivalId" value={festivalId} />
      <input type="hidden" name="tmdbId" value={selectedMovieId || ""} />

      {state && "error" in state && state.error && (
        <div
          className="rounded-md p-3 text-sm"
          style={{
            backgroundColor: "color-mix(in srgb, var(--error) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)",
          }}
        >
          <span style={{ color: "var(--error)", fontWeight: 500 }}>{state.error}</span>
        </div>
      )}

      <div>
        <label
          className="block text-sm font-medium mb-2"
          style={{ color: "var(--text-secondary)" }}
        >
          Select Movie *
        </label>
        <MovieSearch
          onSelect={setSelectedMovieId}
          selectedMovieId={selectedMovieId}
          disabled={isPending}
        />
      </div>

      {selectedMovieId && (
        <Input
          id="pitch"
          name="pitch"
          type="textarea"
          label="Pitch (Optional)"
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
          disabled={isPending}
          maxLength={500}
          placeholder="Why should we watch this movie?"
          showCharacterCount
          rows={4}
        />
      )}

      {selectedMovieId && (
        <Button
          type="submit"
          disabled={isPending}
          isLoading={isPending}
          className="w-full"
          size="lg"
        >
          Submit Nomination
        </Button>
      )}
    </form>
  );
}

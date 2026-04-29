"use client";

import { updateClub } from "@/app/actions/clubs";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import toast from "react-hot-toast";

interface ClubNameFormProps {
  clubId: string;
  currentName: string;
}

type FormState = { error?: string; success?: boolean } | null;

export function ClubNameForm({ clubId, currentName }: ClubNameFormProps) {
  const router = useRouter();
  const [name, setName] = useState(currentName);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(updateClub, null);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      toast.success("Club name updated");
      router.refresh();
    }
  }, [state, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Club Name</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="clubId" value={clubId} />
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={30}
              showCharacterCount
            />
          </div>
          {state && "error" in state && state.error && (
            <p
              className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
              role="alert"
            >
              <span aria-hidden="true">⚠</span>
              {state.error}
            </p>
          )}
          <Button type="submit" variant="club-accent" disabled={isPending || name === currentName}>
            {isPending ? "Saving..." : "Save Name"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

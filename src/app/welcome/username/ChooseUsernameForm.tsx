"use client";

import { useActionState, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { claimUsername } from "@/app/actions/auth/username";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/typography";

interface ChooseUsernameFormProps {
  currentDerivedUsername: string;
}

export function ChooseUsernameForm({ currentDerivedUsername }: ChooseUsernameFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState(currentDerivedUsername);
  const [state, formAction] = useActionState(claimUsername, null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (state && "success" in state && state.success) {
      router.replace("/");
      router.refresh();
    }
  }, [state, router]);

  const sanitize = (value: string) => value.toLowerCase().replace(/[^a-z0-9_]/g, "");

  const isValid = username.length >= 3 && username.length <= 30 && /^[a-z0-9_]+$/.test(username);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValid) return;
    const fd = new FormData();
    fd.append("username", username);
    startTransition(() => formAction(fd));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          type="text"
          name="username"
          label="Username"
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(sanitize(e.target.value))}
          required
          disabled={isPending}
          autoComplete="username"
          minLength={3}
          maxLength={30}
        />
        <Text size="tiny" muted className="mt-1">
          Lowercase letters, numbers, and underscores. 3–30 characters.
        </Text>
      </div>

      {state && "error" in state && state.error && (
        <div
          className="rounded-lg p-3 text-xs"
          style={{
            backgroundColor: "color-mix(in srgb, var(--error) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)",
            color: "var(--error)",
            fontWeight: 500,
          }}
        >
          {state.error}
        </div>
      )}

      <Button
        type="submit"
        size="sm"
        className="w-full"
        disabled={!isValid || isPending}
        isLoading={isPending}
      >
        Continue
      </Button>
    </form>
  );
}

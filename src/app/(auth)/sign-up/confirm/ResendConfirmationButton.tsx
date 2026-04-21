"use client";

import { useActionState, useTransition } from "react";
import { resendSignUpConfirmation } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/typography";

interface Props {
  email: string;
  next: string | null;
}

export function ResendConfirmationButton({ email, next }: Props) {
  const [state, formAction] = useActionState(resendSignUpConfirmation, null);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    const fd = new FormData();
    fd.append("email", email);
    if (next) fd.append("next", next);
    startTransition(() => formAction(fd));
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="w-full"
        onClick={handleClick}
        disabled={isPending}
        isLoading={isPending}
      >
        Resend confirmation email
      </Button>
      {state && "error" in state && state.error && (
        <Text
          size="tiny"
          className="text-center"
          style={{ color: "var(--error)", fontWeight: 500 }}
        >
          {state.error}
        </Text>
      )}
      {state && "success" in state && state.success && (
        <Text
          size="tiny"
          className="text-center"
          style={{ color: "var(--success)", fontWeight: 500 }}
        >
          {state.message}
        </Text>
      )}
    </div>
  );
}

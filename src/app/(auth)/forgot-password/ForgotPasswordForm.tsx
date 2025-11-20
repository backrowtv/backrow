"use client";

import { useActionState, useRef } from "react";
import { resetPassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(resetPassword, null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <Input
          ref={emailInputRef}
          type="email"
          name="email"
          label="Email address"
          placeholder="Enter your email"
          required
          disabled={isPending}
          autoComplete="email"
        />

        {state && "error" in state && state.error && (
          <div
            className="rounded-lg p-4 text-sm flex items-start gap-3 animate-fade-in"
            style={{
              backgroundColor: "color-mix(in srgb, var(--error) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)",
            }}
          >
            <svg
              className="w-5 h-5 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: "var(--error)" }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="flex-1" style={{ color: "var(--error)", fontWeight: 500 }}>
              {state.error}
            </span>
          </div>
        )}

        {state && "success" in state && state.success && (
          <div
            className="rounded-lg p-4 text-sm flex items-start gap-3 animate-fade-in"
            style={{
              backgroundColor: "color-mix(in srgb, var(--success) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--success) 30%, transparent)",
              color: "var(--success)",
            }}
          >
            <svg
              className="w-5 h-5 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="flex-1">{state.message}</span>
          </div>
        )}

        <Button type="submit" className="w-full" isLoading={isPending}>
          Send reset link
        </Button>
      </form>

      <p className="text-center text-sm">
        Remember your password?{" "}
        <Link href="/sign-in" className="text-[var(--primary)]">
          Sign in
        </Link>
      </p>
    </div>
  );
}

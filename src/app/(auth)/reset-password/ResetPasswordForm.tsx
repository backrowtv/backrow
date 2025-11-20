"use client";

import { useActionState, useState, useRef } from "react";
import { updatePassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeSlash } from "@phosphor-icons/react";

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePassword, null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <div className="relative">
          <Input
            ref={passwordInputRef}
            type={showPassword ? "text" : "password"}
            name="password"
            label="New password"
            placeholder="Enter your new password"
            className="pr-10"
            required
            disabled={isPending}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[calc(1.25rem+0.5rem+1rem)] p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Must be at least 8 characters with uppercase, number, and special character
        </p>
      </div>

      <div>
        <div className="relative">
          <Input
            type={showConfirmPassword ? "text" : "password"}
            name="confirmPassword"
            label="Confirm new password"
            placeholder="Confirm your new password"
            className="pr-10"
            required
            disabled={isPending}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-[calc(1.25rem+0.5rem+1rem)] p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            tabIndex={-1}
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

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

      <Button type="submit" className="w-full" isLoading={isPending}>
        Update password
      </Button>
    </form>
  );
}

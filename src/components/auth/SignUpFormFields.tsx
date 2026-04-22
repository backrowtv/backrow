"use client";

import { useState, useActionState, useTransition } from "react";
import { signUp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { Text } from "@/components/ui/typography";
import Link from "next/link";
import { Eye, EyeSlash } from "@phosphor-icons/react";

interface SignUpFormFieldsProps {
  redirectTo?: string;
}

export function SignUpFormFields({ redirectTo }: SignUpFormFieldsProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const [state, formAction] = useActionState(signUp, null);
  const [isTransitioning, startTransition] = useTransition();

  const handleUsernameChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(sanitized);
  };

  const isValid =
    email &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    username.length >= 3 &&
    password.length >= 8 &&
    termsAccepted &&
    privacyAccepted;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValid) return;

    const submitFormData = new FormData();
    submitFormData.append("email", email);
    submitFormData.append("password", password);
    submitFormData.append("username", username);
    if (redirectTo) submitFormData.append("redirectTo", redirectTo);

    startTransition(() => {
      formAction(submitFormData);
    });
  };

  const isPending = isTransitioning;

  return (
    <div className="space-y-3">
      {/* OAuth buttons */}
      <Text size="tiny" muted className="text-center">
        Sign up with
      </Text>
      <OAuthButtons redirectTo={redirectTo} />

      {/* Separator */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span
            className="px-2"
            style={{
              backgroundColor: "var(--background)",
              color: "var(--text-muted)",
            }}
          >
            or
          </span>
        </div>
      </div>

      {/* Form: email → username → password */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Input
            type="email"
            name="email"
            label="Email address"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isPending}
            autoComplete="email"
          />
          {email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
            <Text size="tiny" className="mt-1" style={{ color: "var(--error)", fontWeight: 500 }}>
              Please enter a valid email address
            </Text>
          )}
        </div>

        <div>
          <Input
            type="text"
            name="username"
            label="Username"
            placeholder="username"
            value={username}
            onChange={(e) => handleUsernameChange(e.target.value)}
            required
            disabled={isPending}
            autoComplete="username"
            minLength={3}
            maxLength={30}
          />
          {username && username.length > 0 && username.length < 3 && (
            <Text size="tiny" className="mt-1" style={{ color: "var(--error)", fontWeight: 500 }}>
              Username must be at least 3 characters
            </Text>
          )}
        </div>

        <div>
          <label
            htmlFor="signup-password"
            className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
          >
            Password<span className="text-[var(--error)] ml-0.5">*</span>
          </label>
          <div className="relative">
            <Input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isPending}
              autoComplete="new-password"
              className="pr-10"
              minLength={8}
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowPassword(!showPassword);
              }}
              onMouseDown={(e) => e.preventDefault()}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {password && (
            <div className="mt-2">
              <PasswordStrengthMeter password={password} />
            </div>
          )}
          {password && password.length > 0 && password.length < 8 && (
            <Text size="tiny" className="mt-1" style={{ color: "var(--error)", fontWeight: 500 }}>
              Password must be at least 8 characters
            </Text>
          )}
        </div>

        {/* Agreement checkboxes */}
        <div className="space-y-2 pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              disabled={isPending}
              className="mt-0.5 h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)] cursor-pointer"
            />
            <span className="text-xs leading-relaxed text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
              I am at least 16 years old and agree to the{" "}
              <Link
                href="/terms-of-use"
                target="_blank"
                className="text-[var(--primary)] hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Terms of Use
              </Link>
            </span>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              disabled={isPending}
              className="mt-0.5 h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)] cursor-pointer"
            />
            <span className="text-xs leading-relaxed text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
              I agree to the{" "}
              <Link
                href="/privacy-policy"
                target="_blank"
                className="text-[var(--primary)] hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Privacy Policy
              </Link>
            </span>
          </label>
        </div>

        {state && "error" in state && state.error && (
          <div
            className="rounded-lg p-3 text-sm flex items-start gap-2 animate-fade-in"
            style={{
              backgroundColor: "color-mix(in srgb, var(--error) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)",
            }}
          >
            <svg
              className="w-4 h-4 shrink-0 mt-0.5"
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
            <span className="flex-1 text-xs" style={{ color: "var(--error)", fontWeight: 500 }}>
              {state.error}
              {"alreadyExists" in state && state.alreadyExists && (
                <>
                  {" "}
                  <Link
                    href={
                      redirectTo
                        ? `/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`
                        : "/sign-in"
                    }
                    className="underline font-medium"
                    style={{ color: "var(--error)" }}
                  >
                    Sign in
                  </Link>
                </>
              )}
            </span>
          </div>
        )}

        <Button
          type="submit"
          size="sm"
          className="w-full"
          disabled={!isValid || isPending}
          isLoading={isPending}
          aria-label={isPending ? "Creating your account..." : "Create your account"}
        >
          Create Account
        </Button>
      </form>

      <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
        Already have an account?{" "}
        <Link
          href={redirectTo ? `/sign-in?redirectTo=${encodeURIComponent(redirectTo)}` : "/sign-in"}
          className="font-medium transition-colors"
          style={{ color: "var(--primary)" }}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

"use client";

import { useActionState, useState, useEffect, startTransition, useRef } from "react";
import { signIn, signInWithMagicLink } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { Heading, Text } from "@/components/ui/typography";
import Link from "next/link";
import { Eye, EyeSlash, EnvelopeSimple } from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";

interface SignInFormProps {
  initialError?: string;
  hideSignUpLink?: boolean;
  /** When true, renders without Card wrapper (for use inside modals) */
  noCard?: boolean;
  /** Post-auth redirect path (e.g. from invite links) */
  redirectTo?: string;
}

export function SignInForm({
  initialError,
  hideSignUpLink = false,
  noCard = false,
  redirectTo,
}: SignInFormProps) {
  const [state, formAction, isPending] = useActionState(signIn, null);
  const [magicLinkState, magicLinkFormAction, isMagicLinkPending] = useActionState(
    signInWithMagicLink,
    null
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showMagicLinkForm, setShowMagicLinkForm] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const magicLinkEmailRef = useRef<HTMLInputElement>(null);

  // Show success toast for magic link
  useEffect(() => {
    if (magicLinkState?.success) {
      toast.success(magicLinkState.message || "Magic link sent! Check your email.");
      startTransition(() => {
        setShowMagicLinkForm(false);
      });
    }
  }, [magicLinkState]);

  // Display initial error from query params (OAuth errors)
  useEffect(() => {
    if (initialError) {
      toast.error(initialError, {
        duration: 6000,
        icon: "⚠️",
      });
      // Clear error from URL
      const params = new URLSearchParams(searchParams.toString());
      params.delete("error");
      const newUrl = params.toString() ? `?${params.toString()}` : "";
      router.replace(`/sign-in${newUrl}`, { scroll: false });
    }
  }, [initialError, router, searchParams]);

  // If email link form is shown, render that instead
  if (showMagicLinkForm) {
    const magicLinkContent = (
      <>
        {!noCard && (
          <CardHeader className="text-center space-y-1 px-4 sm:px-6 pt-5 pb-2">
            <Heading level={1} className="text-xl sm:text-2xl">
              Sign in via email
            </Heading>
            <Text size="small" muted>
              No password needed
            </Text>
          </CardHeader>
        )}
        {noCard && (
          <div className="text-center space-y-1 mb-3">
            <Heading level={2} className="text-lg">
              Sign in via email
            </Heading>
            <Text size="small" muted>
              No password needed
            </Text>
          </div>
        )}
        <div className={noCard ? "" : "px-4 sm:px-6 pb-5"}>
          <form action={magicLinkFormAction} className="space-y-3">
            {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
            <Input
              ref={magicLinkEmailRef}
              type="email"
              name="email"
              label="Email address"
              placeholder="Enter your email"
              required
              disabled={isMagicLinkPending}
              autoComplete="email"
            />

            {magicLinkState?.error && (
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
                  {magicLinkState.error}
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowMagicLinkForm(false)}
                disabled={isMagicLinkPending}
              >
                Back
              </Button>
              <Button
                type="submit"
                size="sm"
                className="flex-1"
                isLoading={isMagicLinkPending}
                aria-label={
                  isMagicLinkPending ? "Sending link..." : "Send sign-in link to your email"
                }
              >
                <EnvelopeSimple className="mr-2 h-4 w-4" aria-hidden="true" />
                Send Link
              </Button>
            </div>
          </form>
        </div>
      </>
    );

    if (noCard) {
      return <div className="w-full">{magicLinkContent}</div>;
    }

    return <Card className="w-full">{magicLinkContent}</Card>;
  }

  const formContent = (
    <div className={noCard ? "space-y-3" : "space-y-3"}>
      {/* OAuth buttons */}
      <OAuthButtons redirectTo={redirectTo} />

      {/* Separator with "or" */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[var(--background)] px-2 text-[var(--text-muted)]">or</span>
        </div>
      </div>

      {/* Email/password form */}
      <form action={formAction} className="space-y-3">
        {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
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

        <div className="space-y-2">
          <div>
            <label
              htmlFor="sign-in-password"
              className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
            >
              Password<span className="text-[var(--error)] ml-0.5">*</span>
            </label>
            <div className="relative">
              <Input
                id="sign-in-password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                className="pr-10"
                required
                disabled={isPending}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Checkbox id="remember" name="remember" />
              <Label htmlFor="remember" className="text-xs cursor-pointer">
                Remember me
              </Label>
            </div>
            <Link href="/forgot-password" className="text-xs text-[var(--primary)]">
              Forgot password?
            </Link>
          </div>
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
            </span>
          </div>
        )}

        <Button
          type="submit"
          size="sm"
          className="w-full"
          isLoading={isPending}
          aria-label={isPending ? "Signing in..." : "Sign in to your account"}
        >
          Sign In
        </Button>
      </form>

      {/* Email link button - more user-friendly than "magic link" */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        onClick={() => setShowMagicLinkForm(true)}
        disabled={isPending}
      >
        <EnvelopeSimple className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Email me a sign-in link instead
      </Button>

      {!hideSignUpLink && (
        <p className="text-center text-xs pt-1">
          New here?{" "}
          <Link
            href={redirectTo ? `/sign-up?redirectTo=${encodeURIComponent(redirectTo)}` : "/sign-up"}
            className="text-[var(--primary)]"
          >
            Create an account
          </Link>
        </p>
      )}
    </div>
  );

  if (noCard) {
    return <div className="w-full">{formContent}</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center space-y-1 px-4 sm:px-6 pt-5 pb-2">
        <Heading
          level={1}
          className="text-xl sm:text-2xl"
          style={{ fontFamily: "var(--font-brand)" }}
        >
          Welcome back!
        </Heading>
        <Text size="small" muted>
          Sign in to continue to{" "}
          <span style={{ fontFamily: "var(--font-brand)" }} className="text-[var(--primary)]">
            BackRow
          </span>
        </Text>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-5">{formContent}</CardContent>
    </Card>
  );
}

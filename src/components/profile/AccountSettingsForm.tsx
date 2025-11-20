"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfile, changeEmail } from "@/app/actions/auth";
import { useActionState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { CalendarBlank, EnvelopeSimple, PencilSimple, X, User } from "@phosphor-icons/react";

interface AccountSettingsFormProps {
  email: string;
  createdAt: string;
  dateOfBirth: string | null;
  displayName: string;
  lastDisplayNameChange: string | null;
}

export function AccountSettingsForm({
  email,
  createdAt,
  dateOfBirth,
  displayName,
  lastDisplayNameChange,
}: AccountSettingsFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateProfile, null);
  const [emailState, emailFormAction, isEmailPending] = useActionState(changeEmail, null);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isChangingUsername, setIsChangingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(displayName);

  // Calculate username change cooldown
  const usernameOnCooldown = (() => {
    if (!lastDisplayNameChange) return false;
    const lastChange = new Date(lastDisplayNameChange);
    const sixMonthsLater = new Date(lastChange);
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    return new Date() < sixMonthsLater;
  })();

  const nextUsernameChangeDate = lastDisplayNameChange
    ? (() => {
        const lastChange = new Date(lastDisplayNameChange);
        const sixMonthsLater = new Date(lastChange);
        sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
        return sixMonthsLater.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      })()
    : null;

  // Handle success/error messages for username change
  React.useEffect(() => {
    if (state && "success" in state && state.success) {
      toast.success("Username updated successfully");
      setIsChangingUsername(false);
      router.refresh();
    } else if (state && "error" in state && state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  // Handle success/error messages for email change
  React.useEffect(() => {
    if (emailState && "success" in emailState && emailState.success) {
      toast.success(emailState.message || "Check your email to confirm the change");
      setIsChangingEmail(false);
      setNewEmail("");
      router.refresh();
    } else if (emailState && "error" in emailState && emailState.error) {
      toast.error(emailState.error);
    }
  }, [emailState, router]);

  const handleUsernameChange = () => {
    if (!newUsername.trim()) {
      toast.error("Please enter a username");
      return;
    }
    if (newUsername.trim().length < 2) {
      toast.error("Username must be at least 2 characters");
      return;
    }
    if (newUsername.length > 50) {
      toast.error("Username must be less than 50 characters");
      return;
    }
    const formData = new FormData();
    formData.append("display_name", newUsername.trim());
    formData.append("bio", "");
    formAction(formData);
  };

  const handleEmailChange = () => {
    if (!newEmail.trim()) {
      toast.error("Please enter a new email address");
      return;
    }
    const formData = new FormData();
    formData.append("newEmail", newEmail.trim());
    emailFormAction(formData);
  };

  // Format date of birth for display (use manual formatting to avoid hydration mismatch)
  const formattedDateOfBirth = dateOfBirth
    ? (() => {
        const months = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];
        const parts = dateOfBirth.split("-");
        return `${months[parseInt(parts[1]) - 1]} ${parseInt(parts[2])}, ${parts[0]}`;
      })()
    : null;

  return (
    <div className="space-y-4">
      {/* Account Info */}
      <div>
        <h3 className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
          Account Information
        </h3>
        <div className="divide-y divide-[var(--border)]">
          {/* Username */}
          <div className="py-3">
            <div className="flex items-start gap-2.5">
              <User className="h-4 w-4 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-muted)]">Username</p>
                {isChangingUsername ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-1">
                    <Input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="Enter username"
                      className="h-8 text-sm flex-1"
                      disabled={isPending}
                      maxLength={50}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleUsernameChange}
                        disabled={isPending || !newUsername.trim() || newUsername.trim().length < 2}
                        variant="primary"
                        size="sm"
                        className="h-8 px-3 text-xs flex-1 sm:flex-none"
                      >
                        {isPending ? "Saving..." : "Save"}
                      </Button>
                      <button
                        onClick={() => {
                          setIsChangingUsername(false);
                          setNewUsername(displayName);
                        }}
                        className="p-1.5 hover:bg-[var(--surface-2)] rounded flex-shrink-0"
                        disabled={isPending}
                      >
                        <X className="h-4 w-4 text-[var(--text-muted)]" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-[var(--text-primary)] font-medium truncate">
                        {displayName}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs flex-shrink-0"
                        onClick={() => setIsChangingUsername(true)}
                        disabled={usernameOnCooldown}
                      >
                        <PencilSimple className="h-3 w-3" />
                      </Button>
                    </div>
                    {usernameOnCooldown && nextUsernameChangeDate && (
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        You can change your username again on {nextUsernameChangeDate}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="py-3">
            <div className="flex items-start gap-2.5">
              <EnvelopeSimple className="h-4 w-4 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-muted)]">Email</p>
                {isChangingEmail ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-1">
                    <Input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Enter new email"
                      className="h-8 text-sm flex-1"
                      disabled={isEmailPending}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleEmailChange}
                        disabled={isEmailPending || !newEmail.trim()}
                        variant="primary"
                        size="sm"
                        className="h-8 px-3 text-xs flex-1 sm:flex-none"
                      >
                        {isEmailPending ? "Sending..." : "Confirm"}
                      </Button>
                      <button
                        onClick={() => {
                          setIsChangingEmail(false);
                          setNewEmail("");
                        }}
                        className="p-1.5 hover:bg-[var(--surface-2)] rounded flex-shrink-0"
                        disabled={isEmailPending}
                      >
                        <X className="h-4 w-4 text-[var(--text-muted)]" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-[var(--text-primary)] font-medium truncate">
                      {email}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs flex-shrink-0"
                      onClick={() => setIsChangingEmail(true)}
                    >
                      <PencilSimple className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Date of Birth (read-only) */}
          <div className="py-3">
            <div className="flex items-start gap-2.5">
              <CalendarBlank className="h-4 w-4 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-muted)]">Date of Birth</p>
                <p className="text-sm text-[var(--text-primary)] font-medium truncate">
                  {formattedDateOfBirth || "Not set"}
                </p>
              </div>
            </div>
          </div>

          {/* Member Since */}
          <div className="py-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-[var(--text-muted)]">Member since</span>
              <span
                className="text-xs text-[var(--text-primary)] font-medium"
                suppressHydrationWarning
              >
                {new Date(createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

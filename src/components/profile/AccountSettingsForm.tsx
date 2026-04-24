"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfile, changeEmail } from "@/app/actions/auth";
import { changeUsername } from "@/app/actions/auth/username";
import { useActionState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { At, EnvelopeSimple, PencilSimple, X, User } from "@phosphor-icons/react";

interface AccountSettingsFormProps {
  email: string;
  createdAt: string;
  displayName: string;
  username: string;
  usernameLastChangedAt: string | null;
}

// Username is editable every 6 months (~180 days). Display name is always
// editable — no cooldown.
const USERNAME_CHANGE_COOLDOWN_DAYS = 180;

export function AccountSettingsForm({
  email,
  createdAt,
  displayName,
  username,
  usernameLastChangedAt,
}: AccountSettingsFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateProfile, null);
  const [emailState, emailFormAction, isEmailPending] = useActionState(changeEmail, null);
  const [usernameState, usernameFormAction, isUsernamePending] = useActionState(
    changeUsername,
    null
  );
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isChangingDisplayName, setIsChangingDisplayName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(displayName);
  const [isChangingUsername, setIsChangingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(username);

  const usernameOnCooldown = (() => {
    if (!usernameLastChangedAt) return false;
    const last = new Date(usernameLastChangedAt);
    const next = new Date(last);
    next.setDate(next.getDate() + USERNAME_CHANGE_COOLDOWN_DAYS);
    return new Date() < next;
  })();

  const nextUsernameChangeDate = usernameLastChangedAt
    ? (() => {
        const last = new Date(usernameLastChangedAt);
        const next = new Date(last);
        next.setDate(next.getDate() + USERNAME_CHANGE_COOLDOWN_DAYS);
        return next.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      })()
    : null;

  // Display name change toast
  React.useEffect(() => {
    if (state && "success" in state && state.success) {
      toast.success("Display name updated");
      setIsChangingDisplayName(false);
      router.refresh();
    } else if (state && "error" in state && state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  // Username change toast
  React.useEffect(() => {
    if (usernameState && "success" in usernameState && usernameState.success) {
      toast.success("Username updated");
      setIsChangingUsername(false);
      router.refresh();
    } else if (usernameState && "error" in usernameState && usernameState.error) {
      toast.error(usernameState.error);
    }
  }, [usernameState, router]);

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

  const handleDisplayNameChange = () => {
    if (!newDisplayName.trim()) {
      toast.error("Please enter a display name");
      return;
    }
    if (newDisplayName.trim().length < 2) {
      toast.error("Display name must be at least 2 characters");
      return;
    }
    if (newDisplayName.length > 50) {
      toast.error("Display name must be less than 50 characters");
      return;
    }
    const formData = new FormData();
    formData.append("display_name", newDisplayName.trim());
    formData.append("bio", "");
    formAction(formData);
  };

  const handleUsernameChange = () => {
    const sanitized = newUsername.trim().toLowerCase();
    if (sanitized.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }
    if (sanitized.length > 30) {
      toast.error("Username must be 30 characters or less");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(sanitized)) {
      toast.error("Username can only contain lowercase letters, numbers, and underscores");
      return;
    }
    const formData = new FormData();
    formData.append("username", sanitized);
    usernameFormAction(formData);
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

  return (
    <div className="space-y-4">
      {/* Account Info */}
      <div>
        <h3 className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
          Account Information
        </h3>
        <div className="divide-y divide-[var(--border)]">
          {/* Username (the @handle) */}
          <div className="py-3">
            <div className="flex items-start gap-2.5">
              <At className="h-4 w-4 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-muted)]">Username</p>
                {isChangingUsername ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-1">
                    <Input
                      type="text"
                      value={newUsername}
                      onChange={(e) =>
                        setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                      }
                      placeholder="username"
                      className="h-8 text-sm flex-1"
                      disabled={isUsernamePending}
                      minLength={3}
                      maxLength={30}
                      autoComplete="username"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleUsernameChange}
                        disabled={isUsernamePending || newUsername.trim().length < 3}
                        variant="primary"
                        size="sm"
                        className="h-8 px-3 text-xs flex-1 sm:flex-none"
                      >
                        {isUsernamePending ? "Saving..." : "Save"}
                      </Button>
                      <button
                        onClick={() => {
                          setIsChangingUsername(false);
                          setNewUsername(username);
                        }}
                        className="p-1.5 hover:bg-[var(--surface-2)] rounded flex-shrink-0"
                        disabled={isUsernamePending}
                      >
                        <X className="h-4 w-4 text-[var(--text-muted)]" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-[var(--text-primary)] font-medium truncate">
                        @{username}
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

          {/* Display Name */}
          <div className="py-3">
            <div className="flex items-start gap-2.5">
              <User className="h-4 w-4 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-muted)]">Display name</p>
                {isChangingDisplayName ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-1">
                    <Input
                      type="text"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      placeholder="Enter display name"
                      className="h-8 text-sm flex-1"
                      disabled={isPending}
                      maxLength={50}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleDisplayNameChange}
                        disabled={
                          isPending || !newDisplayName.trim() || newDisplayName.trim().length < 2
                        }
                        variant="primary"
                        size="sm"
                        className="h-8 px-3 text-xs flex-1 sm:flex-none"
                      >
                        {isPending ? "Saving..." : "Save"}
                      </Button>
                      <button
                        onClick={() => {
                          setIsChangingDisplayName(false);
                          setNewDisplayName(displayName);
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
                        onClick={() => setIsChangingDisplayName(true)}
                      >
                        <PencilSimple className="h-3 w-3" />
                      </Button>
                    </div>
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

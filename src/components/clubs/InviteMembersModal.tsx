"use client";

import { useState, useRef, useEffect, useCallback, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/typography";
import toast from "react-hot-toast";
import {
  Check,
  Link as LinkIcon,
  SpinnerGap,
  ArrowClockwise,
  X,
  PaperPlaneTilt,
  EnvelopeSimple,
} from "@phosphor-icons/react";
import { createInviteToken, sendInviteEmails } from "@/app/actions/clubs/invites";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAILS = 20;

interface InviteMembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubSlug: string;
  clubId: string;
  clubName: string;
  clubPrivacy: string;
}

type EmailEntry = {
  address: string;
  status: "pending" | "sending" | "sent" | "error";
  error?: string;
};

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for non-secure contexts or when page doesn't have focus
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}

export function InviteMembersModal({
  open,
  onOpenChange,
  clubSlug,
  clubId,
  clubName,
  clubPrivacy,
}: InviteMembersModalProps) {
  // Link section state
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [tokenData, setTokenData] = useState<{ token: string; expiresAt: string } | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Email section state
  const [emailInput, setEmailInput] = useState("");
  const [emails, setEmails] = useState<EmailEntry[]>([]);
  const [inputError, setInputError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const siteUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || "https://backrow.tv";

  const isPrivate = clubPrivacy === "private";
  const inviteUrl =
    isPrivate && tokenData
      ? `${siteUrl}/join/${clubSlug}?token=${tokenData.token}`
      : `${siteUrl}/join/${clubSlug}`;

  const expirationText = tokenData
    ? (() => {
        const d = new Date(tokenData.expiresAt);
        const months = [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ];
        return `Expires ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
      })()
    : null;

  const generateToken = useCallback(() => {
    setTokenError(null);
    startTransition(async () => {
      const result = await createInviteToken(clubId);
      if ("error" in result) {
        setTokenError(result.error);
        toast.error(result.error);
      } else {
        setTokenData(result);
      }
    });
  }, [clubId]);

  // Generate token when modal opens for private clubs
  useEffect(() => {
    if (open && isPrivate && !tokenData && !isPending) {
      generateToken();
    }
  }, [open, isPrivate, tokenData, isPending, generateToken]);

  // Reset email state when modal closes
  useEffect(() => {
    if (!open) {
      setEmailInput("");
      setEmails([]);
      setInputError(null);
      setIsSending(false);
    }
  }, [open]);

  async function handleCopyLink() {
    const success = await copyToClipboard(inviteUrl);
    if (success) {
      setCopied(true);
      toast.success("Invite link copied!");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Failed to copy — try selecting the link manually");
    }
  }

  function addEmail(raw: string) {
    const email = raw.trim().toLowerCase();
    if (!email) return;

    setInputError(null);

    if (!EMAIL_REGEX.test(email)) {
      setInputError(`"${email}" is not a valid email`);
      return;
    }

    if (emails.some((e) => e.address === email)) {
      setInputError("Already added");
      return;
    }

    if (emails.length >= MAX_EMAILS) {
      setInputError(`Maximum ${MAX_EMAILS} emails per batch`);
      return;
    }

    setEmails((prev) => [...prev, { address: email, status: "pending" }]);
    setEmailInput("");
  }

  function addBulkEmails(text: string) {
    const parts = text.split(/[,;\s\n]+/).filter(Boolean);
    let added = 0;
    let skipped = 0;

    for (const part of parts) {
      const email = part.trim().toLowerCase();
      if (!email) continue;

      if (!EMAIL_REGEX.test(email)) {
        skipped++;
        continue;
      }

      if (emails.some((e) => e.address === email)) {
        skipped++;
        continue;
      }

      if (emails.length + added >= MAX_EMAILS) {
        skipped += parts.length - added - skipped;
        break;
      }

      setEmails((prev) => [...prev, { address: email, status: "pending" }]);
      added++;
    }

    setEmailInput("");

    if (skipped > 0) {
      toast(`Skipped ${skipped} invalid or duplicate email${skipped > 1 ? "s" : ""}`, {
        icon: "⚠️",
      });
    }
  }

  function removeEmail(address: string) {
    setEmails((prev) => prev.filter((e) => e.address !== address));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab" || e.key === ";") {
      e.preventDefault();
      if (emailInput.trim()) {
        addEmail(emailInput);
      }
    } else if (e.key === "Backspace" && !emailInput && emails.length > 0) {
      const lastPending = [...emails].reverse().find((e) => e.status === "pending");
      if (lastPending) {
        removeEmail(lastPending.address);
      }
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (text.includes(",") || text.includes(";") || text.includes("\n") || text.includes(" ")) {
      e.preventDefault();
      addBulkEmails(text);
    }
  }

  async function handleSendInvites() {
    const pendingEmails = emails.filter((e) => e.status === "pending");
    if (pendingEmails.length === 0) return;

    setIsSending(true);

    // Mark all pending as sending
    setEmails((prev) =>
      prev.map((e) => (e.status === "pending" ? { ...e, status: "sending" } : e))
    );

    const result = await sendInviteEmails(
      clubId,
      pendingEmails.map((e) => e.address),
      tokenData?.token
    );

    if (result.error) {
      toast.error(result.error);
      // Reset sending status back to pending
      setEmails((prev) =>
        prev.map((e) => (e.status === "sending" ? { ...e, status: "pending" } : e))
      );
      setIsSending(false);
      return;
    }

    // Update each email's status based on results
    setEmails((prev) =>
      prev.map((e) => {
        const r = result.results.find((r) => r.email === e.address);
        if (!r) return e;
        return {
          ...e,
          status: r.success ? "sent" : "error",
          error: r.error,
        };
      })
    );

    const sent = result.results.filter((r) => r.success).length;
    const total = result.results.length;

    if (sent === total) {
      toast.success(`Sent ${sent} invite${sent > 1 ? "s" : ""}!`);
    } else {
      toast.error(`Sent ${sent} of ${total} invites (${total - sent} failed)`);
    }

    setIsSending(false);
  }

  const showLoading = isPrivate && isPending && !tokenData;
  const showError = isPrivate && tokenError && !tokenData;
  const canCopy = !isPrivate || tokenData;
  const pendingCount = emails.filter((e) => e.status === "pending").length;
  const hasSentEmails = emails.some((e) => e.status === "sent");

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Invite Members"
      description={`Invite people to join ${clubName}`}
      size="md"
    >
      <div className="space-y-5">
        {/* Section 1: Share Invite Link */}
        <div>
          <Text size="tiny" className="font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
            Share Invite Link
          </Text>

          {showLoading ? (
            <div className="flex items-center justify-center py-4 gap-2">
              <SpinnerGap className="h-4 w-4 animate-spin" style={{ color: "var(--text-muted)" }} />
              <Text size="tiny" muted>
                Generating secure link...
              </Text>
            </div>
          ) : showError ? (
            <div className="py-2 space-y-2">
              <Text size="tiny" className="text-red-400">
                {tokenError}
              </Text>
              <Button variant="secondary" size="sm" onClick={generateToken} className="w-full">
                <ArrowClockwise className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 text-xs px-3 py-2 rounded border truncate select-all"
                  style={{
                    backgroundColor: "var(--surface-2)",
                    borderColor: "var(--border)",
                    color: "var(--text-muted)",
                  }}
                >
                  {inviteUrl}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyLink}
                  className="h-9 px-2.5 shrink-0"
                  disabled={!canCopy}
                >
                  {copied ? <Check className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex items-center justify-between mt-2">
                <Text size="tiny" muted>
                  Share this link with people you want to invite.
                </Text>
              </div>

              {isPrivate && expirationText && (
                <div className="flex items-center justify-between mt-1">
                  <Text size="tiny" muted className="text-amber-500">
                    {expirationText}
                  </Text>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={generateToken}
                    disabled={isPending}
                    className="h-6 px-2 text-xs"
                  >
                    <ArrowClockwise className={`h-3 w-3 mr-1 ${isPending ? "animate-spin" : ""}`} />
                    New Link
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Divider */}
        <hr className="border-[var(--border)]" />

        {/* Section 2: Email Invites */}
        <div>
          <Text size="tiny" className="font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
            Invite by Email
          </Text>

          {/* Email chips */}
          {emails.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {emails.map((entry) => (
                <span
                  key={entry.address}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor:
                      entry.status === "sent"
                        ? "var(--active-success-bg)"
                        : entry.status === "error"
                          ? "var(--active-error-bg)"
                          : entry.status === "sending"
                            ? "var(--surface-2)"
                            : "var(--secondary)",
                    color:
                      entry.status === "sent"
                        ? "var(--active-success-text)"
                        : entry.status === "error"
                          ? "var(--active-error-text)"
                          : "var(--secondary-foreground)",
                  }}
                >
                  {entry.status === "sending" && (
                    <SpinnerGap className="h-3 w-3 animate-spin" />
                  )}
                  {entry.status === "sent" && <Check className="h-3 w-3" />}
                  {entry.address}
                  {(entry.status === "pending" || entry.status === "error") && (
                    <button
                      type="button"
                      onClick={() => removeEmail(entry.address)}
                      className="ml-0.5 rounded hover:bg-black/10 transition-colors cursor-pointer"
                      aria-label={`Remove ${entry.address}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Email input */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <EnvelopeSimple
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                style={{ color: "var(--text-muted)" }}
              />
              <input
                ref={inputRef}
                type="email"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  setInputError(null);
                }}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onBlur={() => {
                  if (emailInput.trim()) {
                    addEmail(emailInput);
                  }
                }}
                placeholder={
                  emails.length >= MAX_EMAILS
                    ? `Maximum ${MAX_EMAILS} emails`
                    : "Enter email addresses"
                }
                disabled={emails.length >= MAX_EMAILS || isSending}
                className="w-full h-9 rounded-md border pl-9 pr-3 py-2 text-base md:text-sm bg-[var(--background)] border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)] focus-visible:border-transparent hover:border-[var(--border-hover)] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50"
                autoComplete="email"
              />
            </div>
          </div>

          {inputError && (
            <Text size="tiny" className="mt-1.5 text-[var(--error)]">
              {inputError}
            </Text>
          )}

          <Text size="tiny" muted className="mt-1.5">
            Press Enter or comma to add. Paste multiple emails at once.
          </Text>

          {/* Send button */}
          <Button
            variant="primary"
            className="w-full mt-3"
            onClick={handleSendInvites}
            disabled={pendingCount === 0 || isSending}
          >
            {isSending ? (
              <>
                <SpinnerGap className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <PaperPlaneTilt className="h-4 w-4 mr-2" />
                {pendingCount > 0
                  ? `Send ${pendingCount} Invite${pendingCount > 1 ? "s" : ""}`
                  : hasSentEmails
                    ? "All Invites Sent"
                    : "Send Invites"}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

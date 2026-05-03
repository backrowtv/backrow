"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUserProfile } from "@/components/auth/UserProfileProvider";
import { dismissHint } from "@/app/actions/dismissed-hints";
import type { StaticHintKey } from "@/types/dismissed-hints";

export interface TourSection {
  heading: string;
  body: ReactNode;
  href?: string;
  linkLabel?: string;
}

interface TourPopupProps {
  hintKey: StaticHintKey;
  title: string;
  intro?: string;
  sections: TourSection[];
}

const sessionKey = (hintKey: string) => `tour-${hintKey}-snoozed`;

export function TourPopup({ hintKey, title, intro, sections }: TourPopupProps) {
  const { profile, isLoading, isHintDismissed } = useUserProfile();
  const [open, setOpen] = useState(false);
  const [persisting, setPersisting] = useState(false);

  useEffect(() => {
    if (isLoading || !profile) return;
    if (isHintDismissed(hintKey)) return;
    if (typeof window !== "undefined" && sessionStorage.getItem(sessionKey(hintKey))) return;

    const timer = window.setTimeout(() => setOpen(true), 350);
    return () => window.clearTimeout(timer);
  }, [hintKey, isHintDismissed, isLoading, profile]);

  const snoozeForSession = () => {
    try {
      sessionStorage.setItem(sessionKey(hintKey), "1");
    } catch {
      // storage may be unavailable (private mode) — non-fatal
    }
  };

  const handleGotIt = () => {
    snoozeForSession();
    setOpen(false);
  };

  const handleDontShowAgain = async () => {
    setPersisting(true);
    snoozeForSession();
    setOpen(false);
    await dismissHint(hintKey);
    setPersisting(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      snoozeForSession();
    }
    setOpen(next);
  };

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {intro ? <DialogDescription>{intro}</DialogDescription> : null}
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto -mx-1 px-1">
          <ul className="divide-y divide-[var(--border)]">
            {sections.map((section, idx) => (
              <li key={idx} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">{section.heading}</p>
                <div className="mt-1 text-sm text-[var(--text-muted)] leading-relaxed">
                  {section.body}
                </div>
                {section.href ? (
                  <Link
                    href={section.href}
                    onClick={handleGotIt}
                    className="mt-2 inline-block text-sm font-medium text-[var(--primary)] underline-offset-2 hover:underline"
                  >
                    {section.linkLabel ?? "Go to this"}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleGotIt} disabled={persisting}>
            Got it
          </Button>
          <Button variant="primary" onClick={handleDontShowAgain} isLoading={persisting}>
            Don&apos;t show again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/typography";
import { SignUpModal } from "@/components/auth/SignUpModal";
import { SignInModal } from "@/components/auth/SignInModal";

interface LandingHeroClientProps {
  backdropUrl: string | null;
  backdropTitle?: string | null;
  backdropYear?: number | null;
}

export function LandingHeroClient({
  backdropUrl,
  backdropTitle,
  backdropYear,
}: LandingHeroClientProps) {
  const [showSignUp, setShowSignUp] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  const openSignUp = useCallback(() => setShowSignUp(true), []);
  const openSignIn = useCallback(() => setShowSignIn(true), []);

  const taglines = [
    "Join a community movie club.",
    "Start a club with friends or family.",
    "Find a group that shares your film taste.",
    "Run themed festivals and rank the lineup.",
    "Compete for bragging rights, season after season.",
  ];

  const [currentTagline, setCurrentTagline] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentTagline((prev) => (prev + 1) % taglines.length);
    }, 3500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [taglines.length]);

  return (
    <>
      {/* Hero wrapper — pull up behind the TopNav so the backdrop covers the full viewport top */}
      <div className="relative min-h-[60vh] md:min-h-[70vh] -mt-14 lg:-mt-24 pt-14 lg:pt-24">
        {/* Backdrop image — covers entire area including behind nav */}
        {backdropUrl && (
          <Image
            src={backdropUrl}
            alt=""
            fill
            sizes="100vw"
            quality={95}
            className="object-cover object-top"
            priority
          />
        )}

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(
              to bottom,
              var(--background) 0%,
              rgba(0, 0, 0, 0.3) 15%,
              rgba(0, 0, 0, 0.2) 30%,
              rgba(0, 0, 0, 0.4) 50%,
              rgba(0, 0, 0, 0.65) 70%,
              var(--background) 100%
            )`,
          }}
        />

        {/* CTA content — centered */}
        <div className="relative z-10 flex items-center justify-center min-h-[60vh] md:min-h-[70vh]">
          <div className="text-center px-4">
            <Heading
              level={1}
              className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight"
            >
              <span
                className="block"
                style={{
                  fontFamily: "var(--font-brand)",
                  color: "var(--primary)",
                  fontWeight: 600,
                  textShadow: "0 2px 12px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.4)",
                }}
              >
                BackRow
              </span>
              <span
                className="block text-white"
                style={{
                  textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                  WebkitTextStroke: "0.5px rgba(0,0,0,0.5)",
                }}
              >
                Movie Clubs
              </span>
            </Heading>
            <div className="mt-5 h-[3.75rem] md:h-10 flex items-center justify-center overflow-hidden">
              <p
                key={currentTagline}
                className="text-lg md:text-xl animate-fade-in text-white"
                style={{
                  textShadow: "0 1px 6px rgba(0,0,0,0.7)",
                  WebkitTextStroke: "0.5px rgba(0,0,0,0.6)",
                }}
              >
                {taglines[currentTagline]}
              </p>
            </div>
            <div className="mt-8 flex items-center justify-center gap-4">
              <Button size="lg" onClick={openSignUp}>
                Get Started
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={openSignIn}
                className="text-white border-white/30 hover:bg-white/10"
                style={{ WebkitTextStroke: "0.5px rgba(0,0,0,0.6)" }}
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>

        {/* Backdrop attribution — bottom-right, subtle */}
        {backdropTitle && (
          <div
            className="absolute bottom-3 right-4 z-10 text-[10px] tracking-wide pointer-events-none select-none"
            style={{
              color: "rgba(255,255,255,0.55)",
              textShadow: "0 1px 3px rgba(0,0,0,0.7)",
            }}
            aria-hidden="true"
          >
            Background: {backdropTitle}
            {backdropYear ? ` (${backdropYear})` : ""}
          </div>
        )}
      </div>

      {/* Modals */}
      <SignUpModal open={showSignUp} onOpenChange={setShowSignUp} />
      <SignInModal open={showSignIn} onOpenChange={setShowSignIn} />
    </>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Database } from "@/types/database";
import { FestivalPhaseBar } from "./FestivalPhaseBar";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateDisplay } from "@/components/ui/date-display";
import type { FestivalPhase } from "@/types/festival";
import { BackgroundType } from "@/types/club-creation";
import { CalendarBlank, FilmReel, Star, CaretRight, Clock, Sparkle } from "@phosphor-icons/react";

type Festival = Database["public"]["Tables"]["festivals"]["Row"] & {
  background_type?: string | null;
  background_value?: string | null;
  keywords?: string[] | null;
  picture_url?: string | null;
  nominations_count?: number;
};

interface FestivalCardProps {
  festival: Festival;
  clubSlug: string;
  isAdmin?: boolean;
  variant?: "default" | "compact" | "hero";
  ratingsEnabled?: boolean;
  onPhaseChange?: () => void;
  onEditClick?: () => void;
}

// Helper to get status config with dynamic label based on ratings setting
function getStatusConfig(
  status: string,
  ratingsEnabled: boolean
): { label: string; variant: "default" | "primary" | "success" | "danger" | "warning" } {
  switch (status) {
    case "idle":
      return { label: "Starting", variant: "default" };
    case "pending":
      return { label: "Theme Selection", variant: "default" };
    case "nominating":
      return { label: "Nominations Open", variant: "primary" };
    case "watching":
      return { label: ratingsEnabled ? "Watch & Rate" : "Watch", variant: "warning" };
    case "completed":
      return { label: "Complete", variant: "success" };
    case "cancelled":
      return { label: "Cancelled", variant: "danger" };
    default:
      return { label: "Starting", variant: "default" };
  }
}

// Helper to get phase config with dynamic label based on ratings setting
function getPhaseConfig(
  phase: FestivalPhase,
  ratingsEnabled: boolean
): { label: string; icon: typeof Sparkle } {
  switch (phase) {
    case "theme_selection":
      return { label: "Selecting Theme", icon: Sparkle };
    case "nomination":
      return { label: "Nominations Open", icon: FilmReel };
    case "watch_rate":
      return { label: ratingsEnabled ? "Watch & Rate" : "Watch", icon: Star };
    case "results":
      return { label: "Results Revealed", icon: Star };
    default:
      return { label: "Selecting Theme", icon: Sparkle };
  }
}

export function FestivalCard({
  festival,
  clubSlug,
  isAdmin = false,
  variant = "default",
  ratingsEnabled = true,
  onPhaseChange,
  onEditClick,
}: FestivalCardProps) {
  const [_isHovered, setIsHovered] = useState(false);

  // Determine background style
  const backgroundType = festival.background_type as BackgroundType | null;
  const backgroundValue = festival.background_value;
  const backgroundStyle: React.CSSProperties =
    backgroundValue && backgroundType
      ? backgroundType === "gradient"
        ? { background: backgroundValue }
        : {
            backgroundImage: `url(${backgroundValue})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }
      : {};

  const festivalSlug = festival.slug;
  if (!festivalSlug) {
    console.error("FestivalCard: Festival slug is required", festival.id);
    return null;
  }

  const statusConfig = getStatusConfig(festival.status, ratingsEnabled);
  const phase = festival.phase as FestivalPhase;
  const phaseConfig = getPhaseConfig(phase, ratingsEnabled);
  const PhaseIcon = phaseConfig.icon;

  const isActive = festival.status !== "completed" && festival.status !== "cancelled";
  const hasBackgroundImage = backgroundType === "preset_image" || backgroundType === "custom_image";

  // Calculate time remaining (with negative support for overdue)
  const getTimeRemaining = (): { text: string; isOverdue: boolean } | null => {
    let deadline: string | null = null;
    if (phase === "nomination") deadline = festival.nomination_deadline;
    else if (phase === "watch_rate") deadline = festival.rating_deadline;

    if (!deadline) return null;

    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffMs = deadlineDate.getTime() - now.getTime();

    if (diffMs < 0) {
      // Overdue
      const absDiff = Math.abs(diffMs);
      const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days > 0) return { text: `${days}d overdue`, isOverdue: true };
      if (hours > 0) return { text: `${hours}h overdue`, isOverdue: true };
      return { text: "Just passed", isOverdue: true };
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return { text: `${days}d left`, isOverdue: false };
    if (hours > 0) return { text: `${hours}h left`, isOverdue: false };
    return { text: "Ending soon", isOverdue: false };
  };

  const timeInfo = isActive ? getTimeRemaining() : null;

  // Compact variant
  if (variant === "compact") {
    return (
      <Link href={`/club/${clubSlug}/festival/${festivalSlug}`} className="block">
        <div
          className="flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:bg-[var(--surface-2)]"
          style={{ borderColor: "var(--border)" }}
        >
          {/* Picture or Icon */}
          <div
            className="w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
            style={{ backgroundColor: "var(--surface-2)" }}
          >
            {festival.picture_url ? (
              <Image
                src={festival.picture_url}
                alt={festival.theme || "Festival"}
                width={40}
                height={40}
                className="object-cover"
              />
            ) : (
              <PhaseIcon className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>
              {festival.theme || "Theme Selection"}
            </p>
            <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
              {phaseConfig.label}
            </p>
          </div>

          {/* Status */}
          <Badge variant={statusConfig.variant} size="sm">
            {statusConfig.label}
          </Badge>
        </div>
      </Link>
    );
  }

  // Default card
  return (
    <Card
      variant="default"
      className="overflow-hidden relative group transition-all duration-200"
      style={{
        ...backgroundStyle,
        backgroundColor: backgroundValue && backgroundType ? "transparent" : undefined,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background overlay for images */}
      {hasBackgroundImage && backgroundValue && (
        <div className="absolute inset-0 bg-black/50 z-0" />
      )}

      {/* Festival Picture Banner — always shown, with image or themed fallback */}
      <div className="relative w-full h-32 overflow-hidden">
        {festival.picture_url ? (
          <Image
            src={festival.picture_url}
            alt={festival.theme || "Festival"}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center px-6"
            style={{ backgroundColor: "var(--surface-2)" }}
          >
            <p
              className="text-lg font-bold text-center leading-tight"
              style={{ color: "var(--text-primary)", opacity: 0.7 }}
            >
              {festival.theme || "Festival"}
            </p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Status Badge Overlay */}
        <div className="absolute top-3 right-3">
          <Badge variant={statusConfig.variant} size="sm">
            {statusConfig.label}
          </Badge>
        </div>

        {/* Time Remaining Overlay */}
        {timeInfo && (
          <div className="absolute bottom-3 right-3">
            <Badge
              variant={timeInfo.isOverdue ? "danger" : "secondary"}
              size="sm"
              className="backdrop-blur-sm"
            >
              <Clock className="w-3 h-3 mr-1" />
              {timeInfo.text}
            </Badge>
          </div>
        )}
      </div>

      <div className="relative z-10">
        <CardHeader className="pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Phase Indicator */}
              <div className="flex items-center gap-2 mb-2">
                <PhaseIcon className="w-4 h-4" style={{ color: "var(--primary)" }} />
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                  {phaseConfig.label}
                </span>
              </div>

              {/* Title */}
              <CardTitle className="text-lg">{festival.theme || "Theme Selection"}</CardTitle>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Phase Progress Bar with Admin Controls */}
          <FestivalPhaseBar
            festivalId={festival.id}
            currentPhase={phase}
            hasTheme={!!festival.theme}
            nominationCount={festival.nominations_count || 0}
            isAdmin={isAdmin}
            compact={true}
            ratingsEnabled={ratingsEnabled}
            onPhaseChange={onPhaseChange}
            onEditClick={onEditClick}
          />

          {/* Keywords */}
          {festival.keywords && festival.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {festival.keywords.slice(0, 3).map((keyword, index) => (
                <Badge key={index} variant="secondary" size="sm">
                  {keyword}
                </Badge>
              ))}
              {festival.keywords.length > 3 && (
                <Badge variant="secondary" size="sm">
                  +{festival.keywords.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Meta Info */}
          <div
            className="flex items-center justify-between text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            <div className="flex items-center gap-1">
              <CalendarBlank className="w-3.5 h-3.5" />
              <DateDisplay date={festival.start_date} format="date" />
            </div>

            {!festival.picture_url && timeInfo && (
              <div
                className={`flex items-center gap-1 ${timeInfo.isOverdue ? "text-[var(--error)]" : ""}`}
              >
                <Clock className="w-3.5 h-3.5" />
                {timeInfo.text}
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="pt-0">
          <Link href={`/club/${clubSlug}/festival/${festivalSlug}`} className="w-full">
            <Button variant="secondary" size="sm" className="w-full group/btn">
              <span>{isActive ? "View Festival" : "View Results"}</span>
              <CaretRight className="w-4 h-4 ml-1 transition-transform group-hover/btn:translate-x-0.5" />
            </Button>
          </Link>
        </CardFooter>
      </div>
    </Card>
  );
}

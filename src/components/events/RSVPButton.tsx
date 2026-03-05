"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { rsvpToEvent, removeRsvp } from "@/app/actions/events";
import type { RSVPStatus } from "@/app/actions/events";
import { Check, Question, X, CaretDown, CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface RSVPButtonProps {
  eventId: string;
  currentStatus: RSVPStatus | null;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const statusConfig = {
  going: {
    label: "Going",
    icon: Check,
    color: "text-[var(--success)]",
    bgColor: "bg-[var(--success)]/10",
    borderColor: "border-[var(--success)]/30",
  },
  maybe: {
    label: "Maybe",
    icon: Question,
    color: "text-[var(--warning)]",
    bgColor: "bg-[var(--warning)]/10",
    borderColor: "border-[var(--warning)]/30",
  },
  not_going: {
    label: "Can't Go",
    icon: X,
    color: "text-[var(--error)]",
    bgColor: "bg-[var(--error)]/10",
    borderColor: "border-[var(--error)]/30",
  },
};

export function RSVPButton({
  eventId,
  currentStatus,
  disabled = false,
  size = "sm",
  className,
}: RSVPButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useState<RSVPStatus | null>(currentStatus);

  const handleRsvp = async (status: RSVPStatus) => {
    setOptimisticStatus(status);
    startTransition(async () => {
      const result = await rsvpToEvent(eventId, status);
      if ("error" in result && result.error) {
        // Revert on error
        setOptimisticStatus(currentStatus);
        console.error("RSVP error:", result.error);
      }
    });
  };

  const handleRemove = async () => {
    setOptimisticStatus(null);
    startTransition(async () => {
      const result = await removeRsvp(eventId);
      if ("error" in result && result.error) {
        // Revert on error
        setOptimisticStatus(currentStatus);
        console.error("Remove RSVP error:", result.error);
      }
    });
  };

  const displayStatus = optimisticStatus;
  const config = displayStatus ? statusConfig[displayStatus] : null;

  if (displayStatus && config) {
    const Icon = config.icon;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={size}
            disabled={disabled || isPending}
            className={cn(
              config.bgColor,
              config.borderColor,
              config.color,
              "hover:opacity-80",
              className
            )}
          >
            {isPending ? (
              <CircleNotch className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Icon className="h-4 w-4 mr-1" />
            )}
            {config.label}
            <CaretDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(Object.keys(statusConfig) as RSVPStatus[]).map((status) => {
            const itemConfig = statusConfig[status];
            const ItemIcon = itemConfig.icon;
            return (
              <DropdownMenuItem
                key={status}
                onClick={() => handleRsvp(status)}
                className={cn(displayStatus === status && "bg-[var(--surface-2)]")}
              >
                <ItemIcon className={cn("h-4 w-4 mr-2", itemConfig.color)} />
                {itemConfig.label}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuItem onClick={handleRemove} className="text-[var(--text-muted)]">
            <X className="h-4 w-4 mr-2" />
            Remove RSVP
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={size}
          disabled={disabled || isPending}
          className={className}
        >
          {isPending ? <CircleNotch className="h-4 w-4 animate-spin mr-1" /> : null}
          RSVP
          <CaretDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.keys(statusConfig) as RSVPStatus[]).map((status) => {
          const itemConfig = statusConfig[status];
          const ItemIcon = itemConfig.icon;
          return (
            <DropdownMenuItem key={status} onClick={() => handleRsvp(status)}>
              <ItemIcon className={cn("h-4 w-4 mr-2", itemConfig.color)} />
              {itemConfig.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

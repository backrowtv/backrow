"use client";

import Link from "next/link";
import { PencilSimple } from "@phosphor-icons/react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface IDCardEditButtonProps {
  href: string;
  tooltip?: string;
  className?: string;
}

/**
 * IDCardEditButton - A small pencil icon button that links to the display case edit page
 */
export function IDCardEditButton({
  href,
  tooltip = "Edit in Display Case",
  className,
}: IDCardEditButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={href}
            className={cn(
              "inline-flex items-center justify-center w-7 h-7 rounded-md",
              "bg-[var(--surface-1)] hover:bg-[var(--surface-2)]",
              "border border-[var(--border)] hover:border-[var(--border-hover)]",
              "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
              "transition-all duration-150",
              className
            )}
          >
            <PencilSimple className="w-3.5 h-3.5" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

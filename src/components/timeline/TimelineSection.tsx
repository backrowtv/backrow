"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { TimelineItemCard } from "./TimelineItem";
import { type TimelineGroup, type TimelineGroupId } from "./timeline-utils";

interface TimelineSectionProps {
  group: TimelineGroup;
  showClub?: boolean;
  defaultExpanded?: boolean;
}

function getGroupStyles(groupId: string): {
  headerBg: string;
  headerText: string;
  accent: string;
  glowColor: string;
} {
  switch (groupId as TimelineGroupId) {
    case "overdue":
      return {
        headerBg: "bg-[var(--destructive)]",
        headerText: "text-white",
        accent: "",
        glowColor: "",
      };
    case "today":
      return {
        headerBg: "bg-[var(--primary)]",
        headerText: "text-white",
        accent: "",
        glowColor: "",
      };
    case "tomorrow":
      return {
        headerBg: "bg-amber-600",
        headerText: "text-white",
        accent: "",
        glowColor: "",
      };
    case "this-week":
      return {
        headerBg: "bg-blue-600",
        headerText: "text-white",
        accent: "",
        glowColor: "",
      };
    case "next-week":
      return {
        headerBg: "bg-purple-600",
        headerText: "text-white",
        accent: "",
        glowColor: "",
      };
    case "this-month":
      return {
        headerBg: "bg-emerald-600",
        headerText: "text-white",
        accent: "",
        glowColor: "",
      };
    case "later":
      return {
        headerBg: "bg-[var(--surface-1)]",
        headerText: "text-[var(--text-secondary)]",
        accent: "border-l-[var(--text-muted)]",
        glowColor: "",
      };
    case "past":
      return {
        headerBg: "bg-[var(--surface-1)]",
        headerText: "text-[var(--text-muted)]",
        accent: "border-l-[var(--text-muted)]",
        glowColor: "",
      };
    default:
      return {
        headerBg: "bg-[var(--surface-1)]",
        headerText: "text-[var(--text-secondary)]",
        accent: "border-l-[var(--border)]",
        glowColor: "",
      };
  }
}

export function TimelineSection({
  group,
  showClub = true,
  defaultExpanded = true,
}: TimelineSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const styles = getGroupStyles(group.id);

  if (group.items.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Sticky Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all",
          "hover:brightness-95",
          // Sticky behavior
          "sticky top-0 z-10",
          "backdrop-blur-md",
          styles.headerBg,
          // Subtle shadow when stuck
          "shadow-sm"
        )}
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <CaretRight className={cn("w-4 h-4", styles.headerText)} />
          </motion.div>
          <span className={cn("font-semibold text-sm", styles.headerText)}>{group.label}</span>
          <span className="text-xs text-[var(--text-muted)] bg-[var(--surface-0)]/80 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
            {group.items.length}
          </span>
        </div>

        {group.dateLabel && (
          <span className="text-xs text-[var(--text-muted)]">{group.dateLabel}</span>
        )}
      </button>

      {/* Section Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: {
                height: { duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] },
                opacity: { duration: 0.25, delay: 0.05 },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { duration: 0.25, ease: [0.04, 0.62, 0.23, 0.98] },
                opacity: { duration: 0.15 },
              },
            }}
            className="overflow-hidden"
          >
            <div className="pt-3 pl-2">
              {group.items.map((item, index) => (
                <TimelineItemCard
                  key={item.id}
                  item={item}
                  isFirst={index === 0}
                  isLast={index === group.items.length - 1}
                  showClub={showClub}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

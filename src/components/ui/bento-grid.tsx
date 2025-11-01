"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "./card";

interface BentoGridProps {
  children: ReactNode[];
  className?: string;
}

// Bento grid with asymmetric layout
export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {children.map((child, index) => {
        // Create asymmetric layout
        const spans = [
          { col: "md:col-span-2", row: "md:row-span-2" }, // Large card
          { col: "", row: "" }, // Small card
          { col: "md:col-span-2", row: "" }, // Wide card
          { col: "", row: "md:row-span-2" }, // Tall card
          { col: "md:col-span-2", row: "" }, // Wide card
        ];

        const span = spans[index % spans.length];

        return (
          <div
            key={index}
            className={cn("animate-fade-in", span.col, span.row)}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "outlined" | "ghost";
  hover?: boolean;
}

export function BentoCard({
  children,
  className,
  variant = "default",
  hover = true,
}: BentoCardProps) {
  return (
    <Card variant={variant} hover={hover} className={cn("h-full", className)}>
      {children}
    </Card>
  );
}

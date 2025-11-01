"use client";

import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/typography";

interface IDCardSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * IDCardSection - A section wrapper for ID card content areas
 * Displays an uppercase label with consistent styling
 */
export function IDCardSection({ title, children, className }: IDCardSectionProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Text size="tiny" muted className="uppercase tracking-wider font-medium">
        {title}
      </Text>
      <div>{children}</div>
    </div>
  );
}

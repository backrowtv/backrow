"use client";

import { Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import type { RubricSliderIcon } from "@/types/club-settings";
import { Star, Popcorn, Ticket, FilmStrip, Circle } from "@phosphor-icons/react";

interface SliderIconSelectorProps {
  value: RubricSliderIcon;
  onChange: (icon: RubricSliderIcon) => void;
  disabled?: boolean;
}

const SLIDER_ICONS: Array<{
  id: RubricSliderIcon;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    id: "default",
    label: "Default",
    icon: <Circle weight="fill" className="h-5 w-5" />,
  },
  {
    id: "stars",
    label: "Stars",
    icon: <Star weight="fill" className="h-5 w-5" />,
  },
  {
    id: "popcorn",
    label: "Popcorn",
    icon: <Popcorn weight="fill" className="h-5 w-5" />,
  },
  {
    id: "ticket",
    label: "Ticket",
    icon: <Ticket weight="fill" className="h-5 w-5" />,
  },
  {
    id: "film",
    label: "Film",
    icon: <FilmStrip weight="fill" className="h-5 w-5" />,
  },
];

export function SliderIconSelector({ value, onChange, disabled = false }: SliderIconSelectorProps) {
  return (
    <div className="space-y-2">
      <Text size="sm" className="font-medium">
        Slider Icon Style
      </Text>
      <Text size="tiny" muted className="mb-2">
        Choose how the slider thumb looks when rating movies
      </Text>

      <div className="flex flex-wrap gap-2">
        {SLIDER_ICONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            disabled={disabled}
            className={cn(
              "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all",
              "hover:border-[var(--primary)]/50",
              value === option.id
                ? "ring-1 ring-[var(--primary)] bg-[var(--surface-3)] shadow-sm border-transparent"
                : "border-[var(--border)] bg-[var(--background)]",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <span
              style={{
                color: value === option.id ? "var(--primary)" : "var(--text-muted)",
              }}
            >
              {option.icon}
            </span>
            <Text
              size="tiny"
              style={{
                color: value === option.id ? "var(--primary)" : "var(--text-muted)",
              }}
            >
              {option.label}
            </Text>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Get the icon component for a given slider icon type
 */
export function getSliderIcon(iconType: RubricSliderIcon): React.ReactNode {
  switch (iconType) {
    case "stars":
      return <Star weight="fill" />;
    case "popcorn":
      return <Popcorn weight="fill" />;
    case "ticket":
      return <Ticket weight="fill" />;
    case "film":
      return <FilmStrip weight="fill" />;
    case "default":
    default:
      return null; // Use default circular thumb
  }
}

export default SliderIconSelector;

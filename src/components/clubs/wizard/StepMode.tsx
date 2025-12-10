"use client";

import { Fragment } from "react";
import {
  Trophy,
  Popcorn,
  Check,
  CalendarBlank,
  Medal,
  Eye,
  Lightning,
  Coffee,
  ArrowsOut,
  Info,
} from "@phosphor-icons/react";

import type { FestivalChoice } from "@/types/club-creation";
import type { StepModeProps } from "./types";

interface ModeFeature {
  icon: typeof Trophy;
  label: string;
}

interface ModeOption {
  value: FestivalChoice;
  icon: typeof Trophy;
  title: string;
  tagline: string;
  features: ModeFeature[];
}

const MODE_OPTIONS: ModeOption[] = [
  {
    value: "standard",
    icon: Trophy,
    title: "Standard",
    tagline: "Themed seasons with nominations, scoring, and reveals.",
    features: [
      { icon: CalendarBlank, label: "Seasons" },
      { icon: Medal, label: "Scoring" },
      { icon: Eye, label: "Reveals" },
    ],
  },
  {
    value: "endless",
    icon: Popcorn,
    title: "Endless",
    tagline: "A shared queue that never ends. No phases, no deadlines.",
    features: [
      { icon: Lightning, label: "Always-on" },
      { icon: Coffee, label: "Casual" },
      { icon: ArrowsOut, label: "Flexible" },
    ],
  },
];

export function StepMode({ state, selectFestivalChoice }: StepModeProps) {
  return (
    <div className="space-y-4">
      <div
        className="flex items-center gap-2 text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        <Info className="w-4 h-4 flex-shrink-0" weight="duotone" />
        <span>Everything can be modified after creation.</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
      {MODE_OPTIONS.map((option) => {
        const isSelected = state.festivalChoice === option.value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => selectFestivalChoice(option.value)}
            className="group relative text-left rounded-xl border p-6 min-h-[220px] flex flex-col justify-between transition-[box-shadow,border-color] duration-200"
            style={{
              backgroundColor: "var(--surface-1)",
              borderColor: isSelected ? "var(--primary)" : "var(--border)",
              boxShadow: isSelected
                ? "inset 0 2px 6px rgba(0,0,0,0.18), inset 0 -1px 0 rgba(255,255,255,0.03)"
                : "0 1px 0 rgba(255,255,255,0.03), 0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            {isSelected && (
              <span
                className="absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "var(--primary)" }}
              >
                <Check weight="bold" className="w-4 h-4 text-white" />
              </span>
            )}

            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: "var(--surface-2)",
                  color: isSelected ? "var(--primary)" : "var(--text-muted)",
                }}
              >
                <Icon className="w-7 h-7" weight="duotone" />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <p
                  className="text-xl font-semibold mb-1"
                  style={{
                    color: isSelected ? "var(--primary)" : "var(--text-primary)",
                  }}
                >
                  {option.title}
                </p>
                <p
                  className="text-sm leading-snug"
                  style={{ color: "var(--text-muted)" }}
                >
                  {option.tagline}
                </p>
              </div>
            </div>

            <div
              className="flex items-center gap-3 mt-5 pt-4 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              {option.features.map((feature, index) => {
                const FeatureIcon = feature.icon;
                return (
                  <Fragment key={feature.label}>
                    {index > 0 && (
                      <span
                        className="w-1 h-1 rounded-full"
                        style={{
                          backgroundColor: "var(--text-muted)",
                          opacity: 0.4,
                        }}
                      />
                    )}
                    <span
                      className="flex items-center gap-1.5 text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <FeatureIcon className="w-3.5 h-3.5" weight="duotone" />
                      {feature.label}
                    </span>
                  </Fragment>
                );
              })}
            </div>
          </button>
        );
      })}
      </div>
    </div>
  );
}

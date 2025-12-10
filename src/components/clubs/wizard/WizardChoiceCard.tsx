"use client";

import { Check } from "@phosphor-icons/react";
import type { ReactNode } from "react";

interface WizardChoiceCardProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function WizardChoiceCard({
  icon,
  title,
  description,
  selected,
  onClick,
  disabled,
}: WizardChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left rounded-lg border p-3 flex items-center gap-3 transition-[box-shadow,border-color] duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        backgroundColor: "var(--surface-1)",
        borderColor: selected ? "var(--primary)" : "var(--border)",
        boxShadow: selected
          ? "inset 0 2px 5px rgba(0,0,0,0.16), inset 0 -1px 0 rgba(255,255,255,0.03)"
          : "0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      {icon && (
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: "var(--surface-2)",
            color: selected ? "var(--primary)" : "var(--text-muted)",
          }}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium leading-tight"
          style={{ color: selected ? "var(--primary)" : "var(--text-primary)" }}
        >
          {title}
        </p>
        {description && (
          <p
            className="text-xs leading-tight mt-0.5"
            style={{ color: "var(--text-muted)" }}
          >
            {description}
          </p>
        )}
      </div>
      <Check
        weight="bold"
        aria-hidden={!selected}
        className={`w-4 h-4 flex-shrink-0 transition-opacity duration-150 ${
          selected ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ color: "var(--primary)" }}
      />
    </button>
  );
}

interface WizardSegmentProps {
  options: Array<{ value: number; label: string }>;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function WizardSegment({ options, value, onChange, disabled }: WizardSegmentProps) {
  return (
    <div className="flex gap-1.5">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            className="flex-1 h-10 rounded-md border text-sm font-medium transition-[box-shadow,border-color,color] duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "var(--surface-1)",
              borderColor: selected ? "var(--primary)" : "var(--border)",
              color: selected ? "var(--primary)" : "var(--text-primary)",
              boxShadow: selected
                ? "inset 0 2px 4px rgba(0,0,0,0.16)"
                : "0 1px 0 rgba(255,255,255,0.03)",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface WizardToggleRowProps {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function WizardToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
}: WizardToggleRowProps) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className="w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-[border-color] duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        backgroundColor: "var(--surface-1)",
        borderColor: checked ? "var(--primary)" : "var(--border)",
      }}
    >
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium leading-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </p>
        {description && (
          <p
            className="text-xs leading-tight mt-0.5"
            style={{ color: "var(--text-muted)" }}
          >
            {description}
          </p>
        )}
      </div>
      <div
        className="flex-shrink-0 inline-flex items-center w-11 h-6 rounded-full p-0.5 transition-colors duration-200"
        style={{
          backgroundColor: checked ? "var(--primary)" : "var(--surface-2)",
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.12)",
        }}
      >
        <span
          className="block w-5 h-5 rounded-full bg-white transition-transform duration-200"
          style={{
            transform: checked ? "translateX(20px)" : "translateX(0)",
            boxShadow:
              "0 1px 2px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.04)",
          }}
        />
      </div>
    </button>
  );
}

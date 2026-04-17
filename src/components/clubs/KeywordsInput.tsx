"use client";

import React, { useState, KeyboardEvent, useEffect } from "react";
import { X } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { validateKeyword } from "@/types/club-creation";

interface KeywordsInputProps {
  value: string[];
  onChange: (keywords: string[]) => void;
  disabled?: boolean;
  maxTags?: number;
  error?: string;
}

export function KeywordsInput({
  value,
  onChange,
  disabled = false,
  maxTags = 10,
  error: externalError,
}: KeywordsInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | undefined>(externalError);

  const handleAddKeyword = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setInputValue("");
      return;
    }

    // Check max tags limit
    if (value.length >= maxTags) {
      setError(`Maximum ${maxTags} keywords allowed`);
      return;
    }

    // Validate keyword
    const validation = validateKeyword(trimmed);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    // Check for duplicates
    if (value.includes(trimmed)) {
      setError("This keyword is already added");
      return;
    }

    // Add keyword
    onChange([...value, trimmed]);
    setInputValue("");
    setError(undefined);
  };

  const handleRemoveKeyword = (index: number) => {
    const newKeywords = value.filter((_, i) => i !== index);
    onChange(newKeywords);
    setError(undefined);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddKeyword();
    } else if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
      // Remove last keyword when backspace is pressed on empty input
      handleRemoveKeyword(value.length - 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Clear error when user starts typing
    if (error) {
      setError(undefined);
    }

    // Real-time validation preview (don't block input, just show feedback)
    if (newValue.trim()) {
      const validation = validateKeyword(newValue.trim());
      if (!validation.isValid && newValue.trim().length > 0) {
        // Only show error if they've typed something meaningful
        // Don't show error for empty or just spaces
      }
    }
  };

  // Update error when external error changes
  useEffect(() => {
    if (externalError) {
      setError(externalError);
    }
  }, [externalError]);

  const _remainingTags = maxTags - value.length;
  const validation = inputValue.trim() ? validateKeyword(inputValue.trim()) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor="keywords-tags-input"
          className="block text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          Keywords / Tags
        </label>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {value.length}/{maxTags} tags
        </span>
      </div>

      {/* Input field */}
      <div className="space-y-1">
        <Input
          id="keywords-tags-input"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || value.length >= maxTags}
          placeholder={
            value.length >= maxTags
              ? `Maximum ${maxTags} tags reached`
              : "Enter keyword and press Enter or comma to add"
          }
          error={error}
          helperText={
            validation && inputValue.trim()
              ? validation.isValid
                ? `${validation.charCount}/25 chars, ${validation.wordCount}/2 words`
                : validation.error
              : "Max 2 words, 25 characters per tag"
          }
        />

        {/* Real-time validation feedback */}
        {validation && inputValue.trim() && !validation.isValid && (
          <p className="text-xs" style={{ color: "var(--error)" }}>
            {validation.error}
          </p>
        )}
      </div>

      {/* Display existing keywords */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {value.map((keyword, index) => (
            <Badge
              key={index}
              variant="secondary"
              size="md"
              className="flex items-center gap-1.5 pr-1"
            >
              <span>{keyword}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveKeyword(index)}
                  className="rounded-full p-0.5 hover:bg-[var(--surface-1)] transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  aria-label={`Remove keyword "${keyword}"`}
                >
                  <X className="h-3 w-3" style={{ color: "var(--text-muted)" }} />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Helper text */}
      {value.length === 0 && !error && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Add keywords to help others discover your club (e.g., "horror", "sci-fi", "classic films")
        </p>
      )}
    </div>
  );
}

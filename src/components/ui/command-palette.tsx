"use client";

import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { Modal } from "./modal";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  keywords?: string[];
  onSelect: () => void;
  group?: string;
}

interface CommandPaletteProps {
  items: CommandItem[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommandPalette({ items, open: controlledOpen, onOpenChange }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : open;

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (isControlled && onOpenChange) {
        onOpenChange(newOpen);
      } else {
        setOpen(newOpen);
      }
      if (!newOpen) {
        setSearch("");
      }
    },
    [isControlled, onOpenChange]
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleOpenChange(!isOpen);
      }
      if (e.key === "Escape" && isOpen) {
        handleOpenChange(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isOpen, handleOpenChange]);

  // Group items by group
  const groupedItems = items.reduce(
    (acc, item) => {
      const group = item.group || "Other";
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(item);
      return acc;
    },
    {} as Record<string, CommandItem[]>
  );

  const filteredItems = search
    ? items.filter((item) => {
        const searchLower = search.toLowerCase();
        return (
          item.label.toLowerCase().includes(searchLower) ||
          item.keywords?.some((keyword) => keyword.toLowerCase().includes(searchLower))
        );
      })
    : items;

  return (
    <Modal open={isOpen} onOpenChange={handleOpenChange} size="lg">
      <Command className="bg-transparent" shouldFilter={false}>
        <div className="flex items-center px-3 m-2 rounded-md search-container-debossed">
          <svg
            className="mr-2 h-4 w-4 shrink-0 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Type a command or search..."
            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <Command.List className="max-h-[300px] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-[var(--text-muted)]">
            No results found.
          </Command.Empty>

          {Object.entries(groupedItems).map(([group, groupItems]) => {
            const visibleItems = filteredItems.filter((item) =>
              groupItems.some((gi) => gi.id === item.id)
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={group}>
                <Command.Group
                  heading={group}
                  className="px-2 py-1.5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider"
                >
                  {visibleItems.map((item) => (
                    <Command.Item
                      key={item.id}
                      value={item.id}
                      onSelect={() => {
                        item.onSelect();
                        handleOpenChange(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm cursor-pointer",
                        "aria-selected:bg-[var(--surface-3)] aria-selected:text-[var(--text-primary)]",
                        "text-[var(--text-secondary)] hover:bg-[var(--surface-2)]/50"
                      )}
                    >
                      {item.icon && <span className="text-[var(--text-muted)]">{item.icon}</span>}
                      <span>{item.label}</span>
                      {item.keywords && (
                        <span className="ml-auto text-xs text-[var(--text-muted)]">
                          {item.keywords.join(", ")}
                        </span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              </div>
            );
          })}
        </Command.List>

        <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-2 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface-2)] px-1.5 font-mono text-[10px] font-medium text-[var(--text-muted)]">
                ↑↓
              </kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface-2)] px-1.5 font-mono text-[10px] font-medium text-[var(--text-muted)]">
                ↵
              </kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface-2)] px-1.5 font-mono text-[10px] font-medium text-[var(--text-muted)]">
                esc
              </kbd>
              <span>Close</span>
            </div>
          </div>
        </div>
      </Command>
    </Modal>
  );
}

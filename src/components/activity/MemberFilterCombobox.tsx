"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { userToAvatarData } from "@/lib/avatar-helpers";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { User, CaretDown, X, Check } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

export interface MemberOption {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email?: string | null;
  social_links?: {
    avatar_icon?: string;
    avatar_color_index?: number;
    avatar_border_color_index?: number;
    [key: string]: unknown;
  } | null;
  role?: string;
}

interface MemberFilterComboboxProps {
  members: MemberOption[];
  selectedUserId: string | null;
  onSelect: (userId: string | null) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
}

export function MemberFilterCombobox({
  members,
  selectedUserId,
  onSelect,
  placeholder = "Filter by member",
  emptyMessage = "No members found",
  className,
}: MemberFilterComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle dropdown open/close with animation
  useLayoutEffect(() => {
    if (isOpen) {
      setIsDropdownVisible(true);
    } else {
      // Delay hiding to allow smooth exit animation
      const timer = setTimeout(() => setIsDropdownVisible(false), 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Sort members alphabetically by display name
  const sortedMembers = [...members].sort((a, b) => {
    const nameA = a.display_name?.toLowerCase() || "";
    const nameB = b.display_name?.toLowerCase() || "";
    return nameA.localeCompare(nameB);
  });

  // Filter members based on search query
  const filteredMembers = sortedMembers.filter((member) => {
    if (!searchQuery) return true;
    const name = member.display_name?.toLowerCase() || "";
    return name.includes(searchQuery.toLowerCase());
  });

  // Find selected member for display
  const selectedMember = members.find((m) => m.id === selectedUserId);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const handleSelect = (userId: string | null) => {
    onSelect(userId);
    setIsOpen(false);
    setSearchQuery("");
  };

  const getRoleBadge = (role?: string) => {
    if (!role) return null;
    if (role === "producer") {
      return (
        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-3)] text-[var(--text-primary)] font-semibold">
          Producer
        </span>
      );
    }
    if (role === "director") {
      return (
        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)] text-white">
          Director
        </span>
      );
    }
    return null;
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <Button
        variant={selectedUserId ? "secondary" : "outline"}
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 gap-1.5 text-xs max-w-[180px]"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {selectedMember ? (
          <>
            <EntityAvatar
              entity={userToAvatarData(selectedMember)}
              emojiSet="user"
              size="tiny"
              className="h-5 w-5"
            />
            <span className="truncate max-w-[100px]">
              {selectedMember.display_name || "Unknown"}
            </span>
          </>
        ) : (
          <>
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline truncate">{placeholder}</span>
            <span className="sm:hidden">User</span>
          </>
        )}
        <CaretDown className="w-3 h-3 ml-0.5 opacity-50 shrink-0" />
      </Button>

      {/* Clear button when selected */}
      {selectedUserId && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSelect(null);
          }}
          className="absolute -right-6 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Clear member filter"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Dropdown */}
      {isDropdownVisible && (
        <div
          className={cn(
            "absolute z-50 mt-1 w-64 bg-[var(--background)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden",
            "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] origin-top-left",
            isOpen
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
          )}
          role="listbox"
        >
          <Command shouldFilter={false} className="border-none">
            <CommandInput
              placeholder="Search members..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="h-9"
            />
            <CommandList className="max-h-[250px]">
              <CommandEmpty className="py-4 text-center text-sm text-[var(--text-muted)]">
                {emptyMessage}
              </CommandEmpty>
              <CommandGroup>
                {/* All Members option */}
                <CommandItem
                  onSelect={() => handleSelect(null)}
                  className="flex items-center gap-2 px-2 py-2 cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-[var(--surface-2)] flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  </div>
                  <span className="flex-1 text-sm">All Members</span>
                  {!selectedUserId && <Check className="w-4 h-4 text-[var(--primary)]" />}
                </CommandItem>

                {/* Member list */}
                {filteredMembers.map((member) => (
                  <CommandItem
                    key={member.id}
                    onSelect={() => handleSelect(member.id)}
                    className="flex items-center gap-2 px-2 py-2 cursor-pointer"
                  >
                    <EntityAvatar
                      entity={userToAvatarData(member)}
                      emojiSet="user"
                      size="tiny"
                      className="h-6 w-6"
                    />
                    <span className="flex-1 text-sm truncate">
                      {member.display_name || "Unknown"}
                    </span>
                    {getRoleBadge(member.role)}
                    {selectedUserId === member.id && (
                      <Check className="w-4 h-4 text-[var(--primary)] shrink-0" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}

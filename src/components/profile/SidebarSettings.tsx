"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  Lightning,
  User,
  ArrowCounterClockwise,
  Check,
  CalendarBlank,
  CaretUp,
  CaretDown,
} from "@phosphor-icons/react";
import { House, FilmSlate, Compass } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  type SidebarNavItemId,
  type SidebarNavPreferences,
  DEFAULT_SIDEBAR_PREFERENCES,
} from "@/lib/navigation-constants";
import {
  updateSidebarPreferences,
  resetSidebarPreferences,
} from "@/app/actions/navigation-preferences";

const SIDEBAR_ITEM_CONFIG: Record<SidebarNavItemId, { icon: React.ElementType; label: string }> = {
  home: { icon: House, label: "Home" },
  clubs: { icon: FilmSlate, label: "Clubs" },
  search: { icon: MagnifyingGlass, label: "Search" },
  discover: { icon: Compass, label: "Discover" },
  activity: { icon: Lightning, label: "Activity" },
  timeline: { icon: CalendarBlank, label: "Timeline" },
  profile: { icon: User, label: "Profile" },
};

// Selectable sidebar item
function SidebarItem({
  id,
  index,
  isSelected,
  onClick,
}: {
  id: SidebarNavItemId;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const config = SIDEBAR_ITEM_CONFIG[id];
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md w-full text-left",
        "select-none transition-colors",
        isSelected
          ? "bg-[var(--primary)]/10 border border-[var(--primary)]/50"
          : "hover:bg-[var(--hover)] border border-transparent"
      )}
    >
      <span className="text-[10px] text-[var(--text-muted)] w-3 tabular-nums">{index + 1}</span>
      <Icon
        className={cn(
          "w-3.5 h-3.5",
          isSelected ? "text-[var(--primary)]" : "text-[var(--text-muted)]"
        )}
        weight={isSelected ? "fill" : "regular"}
      />
      <span
        className={cn(
          "text-xs",
          isSelected ? "text-[var(--primary)]" : "text-[var(--text-primary)]"
        )}
      >
        {config.label}
      </span>
    </button>
  );
}

interface SidebarSettingsProps {
  initialPreferences: SidebarNavPreferences;
}

export function SidebarSettings({ initialPreferences }: SidebarSettingsProps) {
  const router = useRouter();
  const [itemOrder, setItemOrder] = useState<SidebarNavItemId[]>(initialPreferences.itemOrder);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<SidebarNavItemId | null>(null);

  useEffect(() => {
    setItemOrder(initialPreferences.itemOrder);
  }, [initialPreferences]);

  // Derived state for selected item
  const selectedIndex = selectedItem ? itemOrder.indexOf(selectedItem) : -1;
  const canMoveUp = selectedItem !== null && selectedIndex > 0;
  const canMoveDown = selectedItem !== null && selectedIndex < itemOrder.length - 1;

  const handleSelect = (id: SidebarNavItemId) => {
    setSelectedItem((prev) => (prev === id ? null : id));
  };

  const handleMoveUp = () => {
    if (!selectedItem || !canMoveUp) return;
    const newItems = [...itemOrder];
    const idx = newItems.indexOf(selectedItem);
    [newItems[idx - 1], newItems[idx]] = [newItems[idx], newItems[idx - 1]];
    setItemOrder(newItems);
  };

  const handleMoveDown = () => {
    if (!selectedItem || !canMoveDown) return;
    const newItems = [...itemOrder];
    const idx = newItems.indexOf(selectedItem);
    [newItems[idx], newItems[idx + 1]] = [newItems[idx + 1], newItems[idx]];
    setItemOrder(newItems);
  };

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    setErrorMessage(null);

    const result = await updateSidebarPreferences({
      itemOrder,
    });

    setIsSaving(false);
    if (result.success) {
      setSaveStatus("success");
      router.refresh();
      window.dispatchEvent(new Event("sidebar-preferences-updated"));
      setTimeout(() => setSaveStatus("idle"), 2000);
    } else {
      setSaveStatus("error");
      setErrorMessage(result.error || "Failed to save");
      setTimeout(() => {
        setSaveStatus("idle");
        setErrorMessage(null);
      }, 4000);
    }
  }, [itemOrder, router]);

  const handleReset = useCallback(async () => {
    setIsResetting(true);
    const result = await resetSidebarPreferences();
    if (result.success) {
      setItemOrder(DEFAULT_SIDEBAR_PREFERENCES.itemOrder);
      setSelectedItem(null);
      router.refresh();
      window.dispatchEvent(new Event("sidebar-preferences-updated"));
    }
    setIsResetting(false);
  }, [router]);

  const hasChanges = JSON.stringify(itemOrder) !== JSON.stringify(initialPreferences.itemOrder);

  return (
    <div className="space-y-3 w-full">
      {/* Item List */}
      <div className="space-y-0.5 p-1 rounded-lg border border-[var(--border)] bg-[var(--surface-1)]/50">
        {itemOrder.map((item, index) => (
          <SidebarItem
            key={item}
            id={item}
            index={index}
            isSelected={selectedItem === item}
            onClick={() => handleSelect(item)}
          />
        ))}
      </div>

      {/* Action Panel */}
      <div className="min-h-[28px] flex items-center justify-center rounded-lg bg-[var(--surface-1)]/50 border border-[var(--border)]/50">
        {selectedItem ? (
          <div className="flex items-center gap-2 py-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMoveUp}
              disabled={!canMoveUp}
              className="h-7 w-7 p-0"
              title="Move up"
            >
              <CaretUp className="w-4 h-4" weight="bold" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMoveDown}
              disabled={!canMoveDown}
              className="h-7 w-7 p-0"
              title="Move down"
            >
              <CaretDown className="w-4 h-4" weight="bold" />
            </Button>
          </div>
        ) : (
          <span className="text-[10px] text-[var(--text-muted)]">Tap an item to reorder</span>
        )}
      </div>

      {errorMessage && <div className="text-[10px] text-[var(--error)]">{errorMessage}</div>}

      <div className="flex items-center gap-1.5">
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          size="sm"
          className={cn(
            "h-6 px-2 text-[10px]",
            saveStatus === "success" && "bg-[var(--success)] hover:bg-[var(--success)]"
          )}
        >
          {isSaving ? "..." : saveStatus === "success" ? <Check className="w-3 h-3" /> : "Save"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={isResetting}
          className="h-6 w-6 p-0 text-[var(--text-muted)]"
        >
          <ArrowCounterClockwise className={cn("w-3 h-3", isResetting && "animate-spin")} />
        </Button>
      </div>
    </div>
  );
}

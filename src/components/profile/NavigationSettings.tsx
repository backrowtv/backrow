"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  Lightning,
  User,
  ArrowCounterClockwise,
  Check,
  WarningCircle,
  CaretLeft,
  CaretRight,
  Plus,
  Minus,
} from "@phosphor-icons/react";
import { House, FilmSlate, Compass, CalendarDots, Star } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  type NavItemId,
  type MobileNavPreferences,
  type MenuPosition,
  VALID_NAV_ITEMS,
  DEFAULT_NAV_PREFERENCES,
} from "@/lib/navigation-constants";
import { updateNavPreferences, resetNavPreferences } from "@/app/actions/navigation-preferences";

const NAV_ITEM_CONFIG: Record<NavItemId, { icon: React.ElementType; label: string }> = {
  home: { icon: House, label: "Home" },
  clubs: { icon: FilmSlate, label: "Clubs" },
  search: { icon: MagnifyingGlass, label: "Search" },
  discover: { icon: Compass, label: "Discover" },
  profile: { icon: User, label: "Profile" },
  activity: { icon: Lightning, label: "Activity" },
  favorite_club: { icon: Star, label: "Fav" },
  timeline: { icon: CalendarDots, label: "Timeline" },
};

// Tappable nav item
function NavBarItem({
  id,
  hideLabels,
  isSelected,
  onClick,
}: {
  id: NavItemId;
  hideLabels: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const config = NAV_ITEM_CONFIG[id];
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center py-1",
        "select-none transition-all duration-150",
        "w-12 rounded-lg border",
        isSelected
          ? "border-solid border-[var(--primary)] bg-[var(--primary)]/20"
          : "border-dashed border-white/20 hover:border-white/40 hover:bg-white/5"
      )}
    >
      <Icon
        className={cn(hideLabels ? "w-5 h-5" : "w-4 h-4")}
        style={{ color: isSelected ? "var(--primary)" : "var(--glass-icon)" }}
        weight="fill"
      />
      {!hideLabels && (
        <span
          className="text-[9px] mt-0.5"
          style={{ color: isSelected ? "var(--primary)" : "var(--glass-text)" }}
        >
          {config.label}
        </span>
      )}
    </button>
  );
}

// Pool item
function PoolItem({
  id,
  isSelected,
  onClick,
  disabled,
}: {
  id: NavItemId;
  isSelected: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  const config = NAV_ITEM_CONFIG[id];
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={disabled && !isSelected ? undefined : onClick}
      className={cn(
        "flex flex-col items-center justify-center w-11 h-11 rounded-lg",
        "select-none border transition-all duration-150",
        disabled && !isSelected
          ? "border-[var(--border)]/20 text-[var(--text-muted)]/20 cursor-not-allowed"
          : isSelected
            ? "border-solid border-[var(--primary)] bg-[var(--surface-3)] text-[var(--text-primary)] ring-1 ring-[var(--primary)] shadow-sm"
            : "border-dashed border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5"
      )}
    >
      <Icon className="w-4 h-4" weight={isSelected ? "fill" : "regular"} />
      <span className="text-[8px] mt-0.5">{config.label}</span>
    </button>
  );
}

interface NavigationSettingsProps {
  initialPreferences: MobileNavPreferences;
  userClubs: Array<{ id: string; name: string; slug: string | null }>;
}

export function NavigationSettings({ initialPreferences, userClubs }: NavigationSettingsProps) {
  const router = useRouter();
  const [activeItems, setActiveItems] = useState<NavItemId[]>(initialPreferences.items);
  const [favoriteClubId, setFavoriteClubId] = useState<string | null>(
    initialPreferences.favoriteClubId || null
  );
  const [hideLabels, setHideLabels] = useState<boolean>(initialPreferences.hideLabels ?? false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>(
    initialPreferences.menuPosition ?? "right"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showClubModal, setShowClubModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<NavItemId | null>(null);

  const availableItems = VALID_NAV_ITEMS.filter((item) => !activeItems.includes(item));
  const isFull = activeItems.length >= 5;
  const isMinimum = activeItems.length <= 3;

  // Derived state for selected item
  const isSelectedInNavbar = selectedItem ? activeItems.includes(selectedItem) : false;
  const selectedIndex = selectedItem ? activeItems.indexOf(selectedItem) : -1;
  const canMoveLeft = isSelectedInNavbar && selectedIndex > 0;
  const canMoveRight = isSelectedInNavbar && selectedIndex < activeItems.length - 1;
  const canRemove = isSelectedInNavbar && !isMinimum;
  const canAdd = selectedItem && !isSelectedInNavbar && !isFull;

  useEffect(() => {
    if (activeItems.includes("favorite_club") && !favoriteClubId && userClubs.length === 1) {
      setFavoriteClubId(userClubs[0].id);
    }
  }, [activeItems, favoriteClubId, userClubs]);

  useEffect(() => {
    setActiveItems(initialPreferences.items);
    setFavoriteClubId(initialPreferences.favoriteClubId || null);
    setHideLabels(initialPreferences.hideLabels ?? false);
    setMenuPosition(initialPreferences.menuPosition ?? "right");
  }, [initialPreferences]);

  // Clear selection if the selected item is no longer valid
  useEffect(() => {
    if (selectedItem && !VALID_NAV_ITEMS.includes(selectedItem)) {
      setSelectedItem(null);
    }
  }, [selectedItem]);

  const handleSelect = (id: NavItemId) => {
    setSelectedItem((prev) => (prev === id ? null : id));
  };

  const handleMoveLeft = () => {
    if (!selectedItem || !canMoveLeft) return;
    const newItems = [...activeItems];
    const idx = newItems.indexOf(selectedItem);
    [newItems[idx - 1], newItems[idx]] = [newItems[idx], newItems[idx - 1]];
    setActiveItems(newItems);
  };

  const handleMoveRight = () => {
    if (!selectedItem || !canMoveRight) return;
    const newItems = [...activeItems];
    const idx = newItems.indexOf(selectedItem);
    [newItems[idx], newItems[idx + 1]] = [newItems[idx + 1], newItems[idx]];
    setActiveItems(newItems);
  };

  const handleRemove = () => {
    if (!selectedItem || !canRemove) return;
    setActiveItems(activeItems.filter((item) => item !== selectedItem));
    if (selectedItem === "favorite_club") {
      setFavoriteClubId(null);
    }
    setSelectedItem(null);
  };

  const handleAdd = () => {
    if (!selectedItem || !canAdd) return;
    if (selectedItem === "favorite_club") {
      if (userClubs.length === 1) {
        setFavoriteClubId(userClubs[0].id);
        setActiveItems([...activeItems, selectedItem]);
      } else if (userClubs.length > 1) {
        setActiveItems([...activeItems, selectedItem]);
        setShowClubModal(true);
      }
    } else {
      setActiveItems([...activeItems, selectedItem]);
    }
    setSelectedItem(null);
  };

  const handleSelectClub = (clubId: string) => {
    setFavoriteClubId(clubId);
    setShowClubModal(false);
  };

  const handleSave = useCallback(async () => {
    if (activeItems.length < 3) return;
    setIsSaving(true);
    setSaveStatus("idle");
    setErrorMessage(null);

    const result = await updateNavPreferences({
      items: activeItems,
      itemCount: activeItems.length,
      favoriteClubId: activeItems.includes("favorite_club") ? favoriteClubId : null,
      hideLabels,
      menuPosition,
    });

    setIsSaving(false);
    if (result.success) {
      setSaveStatus("success");
      router.refresh();
      // Dispatch custom event with new preferences for immediate update
      window.dispatchEvent(
        new CustomEvent("nav-preferences-updated", {
          detail: {
            items: activeItems,
            itemCount: activeItems.length,
            favoriteClubId: activeItems.includes("favorite_club") ? favoriteClubId : null,
            hideLabels,
            menuPosition,
          },
        })
      );
      setTimeout(() => setSaveStatus("idle"), 2000);
    } else {
      setSaveStatus("error");
      setErrorMessage(result.error || "Failed to save");
      setTimeout(() => {
        setSaveStatus("idle");
        setErrorMessage(null);
      }, 4000);
    }
  }, [activeItems, favoriteClubId, hideLabels, menuPosition, router]);

  const handleReset = useCallback(async () => {
    setIsResetting(true);
    const result = await resetNavPreferences();
    if (result.success) {
      setActiveItems(DEFAULT_NAV_PREFERENCES.items);
      setFavoriteClubId(null);
      setHideLabels(false);
      setMenuPosition("right");
      setSelectedItem(null);
      router.refresh();
    }
    setIsResetting(false);
  }, [router]);

  const hasChanges =
    JSON.stringify(activeItems) !== JSON.stringify(initialPreferences.items) ||
    favoriteClubId !== initialPreferences.favoriteClubId ||
    hideLabels !== (initialPreferences.hideLabels ?? false) ||
    menuPosition !== (initialPreferences.menuPosition ?? "right");

  const canSave = activeItems.length >= 3 && hasChanges;

  return (
    <div className="space-y-4">
      {/* Nav Bar Preview */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[var(--text-muted)]">Your nav bar</span>
          <span
            className={cn(
              "text-[10px]",
              activeItems.length < 3 ? "text-[var(--warning)]" : "text-[var(--text-muted)]"
            )}
          >
            {activeItems.length}/5
          </span>
        </div>
        <div className="flex justify-center">
          <div
            className={cn(
              "inline-flex rounded-2xl backdrop-blur-xl transition-all duration-200",
              hideLabels ? "h-10" : "h-11",
              activeItems.length === 0 && "px-8"
            )}
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              boxShadow: "var(--glass-shadow)",
            }}
          >
            <div className="flex items-center h-full gap-1 px-1.5">
              {activeItems.length === 0 ? (
                <span className="text-[10px] text-[var(--text-muted)]">Add icons below</span>
              ) : (
                activeItems.map((item) => (
                  <NavBarItem
                    key={item}
                    id={item}
                    hideLabels={hideLabels}
                    isSelected={selectedItem === item}
                    onClick={() => handleSelect(item)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Available Pool */}
      <div className="space-y-1">
        <span className="text-[10px] text-[var(--text-muted)]">Available</span>
        <div
          className={cn(
            "flex flex-wrap gap-1.5 p-1.5 rounded-xl transition-all duration-200",
            "border border-dashed border-[var(--border)] bg-[var(--surface-1)]/30",
            availableItems.length === 0 && "px-4 py-2"
          )}
        >
          {availableItems.length === 0 ? (
            <span className="text-[10px] text-[var(--text-muted)]">All in use</span>
          ) : (
            availableItems.map((item) => (
              <PoolItem
                key={item}
                id={item}
                isSelected={selectedItem === item}
                onClick={() => handleSelect(item)}
                disabled={isFull}
              />
            ))
          )}
        </div>
      </div>

      {/* Action Panel */}
      <div className="min-h-[52px] flex items-center justify-center rounded-lg bg-[var(--surface-1)]/50 border border-[var(--border)]/50">
        {selectedItem ? (
          <div className="flex items-center gap-2 py-2">
            {isSelectedInNavbar ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMoveLeft}
                  disabled={!canMoveLeft}
                  className="h-8 w-8 p-0"
                  title="Move left"
                >
                  <CaretLeft className="w-4 h-4" weight="bold" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemove}
                  disabled={!canRemove}
                  className="h-8 px-3 text-xs"
                >
                  <Minus className="w-3.5 h-3.5 mr-1.5" />
                  Remove
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMoveRight}
                  disabled={!canMoveRight}
                  className="h-8 w-8 p-0"
                  title="Move right"
                >
                  <CaretRight className="w-4 h-4" weight="bold" />
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAdd}
                disabled={!canAdd}
                className="h-8 px-3 text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add to navbar
              </Button>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-[var(--text-muted)]">Tap an icon to select</span>
        )}
      </div>

      {/* Options */}
      <div className="space-y-2 pt-3 border-t border-[var(--border)]">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-primary)]">Compact mode</span>
          <Switch checked={hideLabels} onCheckedChange={setHideLabels} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-primary)]">Menu position</span>
          <div className="flex rounded-lg overflow-hidden border border-[var(--border)]">
            <button
              type="button"
              onClick={() => setMenuPosition("left")}
              className={cn(
                "h-7 px-3 text-[11px] transition-colors",
                menuPosition === "left"
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "bg-[var(--surface-1)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
              )}
            >
              Left
            </button>
            <button
              type="button"
              onClick={() => setMenuPosition("right")}
              className={cn(
                "h-7 px-3 text-[11px] transition-colors border-l border-[var(--border)]",
                menuPosition === "right"
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "bg-[var(--surface-1)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
              )}
            >
              Right
            </button>
          </div>
        </div>
        {/* Favorite Club Selector - only show when favorite_club is in nav */}
        {activeItems.includes("favorite_club") && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-[var(--primary)]" weight="fill" />
              <span className="text-xs text-[var(--text-primary)]">Favorite club</span>
            </div>
            <select
              value={favoriteClubId || ""}
              onChange={(e) => setFavoriteClubId(e.target.value || null)}
              className="h-7 px-2 text-[11px] rounded bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-primary)] cursor-pointer max-w-[140px] truncate"
            >
              {userClubs.length === 0 ? (
                <option value="">No favorites</option>
              ) : (
                <>
                  <option value="">Select club...</option>
                  {userClubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        )}
      </div>

      {/* Warning */}
      {activeItems.length < 3 && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-[var(--warning)] text-white text-[11px]">
          <WarningCircle className="w-3 h-3" />
          Add {3 - activeItems.length} more
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-[var(--error)] text-white text-[11px]">
          <WarningCircle className="w-3 h-3" />
          {errorMessage}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-1.5">
        <Button
          onClick={handleSave}
          disabled={isSaving || !canSave}
          size="sm"
          className={cn(
            "h-7 px-3 text-[11px]",
            saveStatus === "success" && "bg-[var(--success)] hover:bg-[var(--success)]"
          )}
        >
          {isSaving ? (
            "Saving..."
          ) : saveStatus === "success" ? (
            <>
              <Check className="w-3 h-3 mr-1" />
              Saved
            </>
          ) : (
            "Save"
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={isResetting}
          className="h-7 px-2 text-[var(--text-muted)]"
        >
          <ArrowCounterClockwise className={cn("w-3 h-3", isResetting && "animate-spin")} />
        </Button>
      </div>

      {/* Club Modal */}
      <Dialog open={showClubModal} onOpenChange={setShowClubModal}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base">Choose Club</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {userClubs.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-3 text-center">
                Join a club first.
              </p>
            ) : (
              userClubs.map((club) => (
                <button
                  key={club.id}
                  onClick={() => handleSelectClub(club.id)}
                  className={cn(
                    "flex items-center gap-2 w-full px-2 py-1.5 rounded text-left text-sm transition-colors",
                    favoriteClubId === club.id
                      ? "bg-[var(--surface-3)] text-[var(--text-primary)]"
                      : "hover:bg-[var(--surface-2)]"
                  )}
                >
                  <Star
                    className="w-3.5 h-3.5"
                    weight={favoriteClubId === club.id ? "fill" : "regular"}
                  />
                  <span className="flex-1 truncate">{club.name}</span>
                  {favoriteClubId === club.id && <Check className="w-3.5 h-3.5" />}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

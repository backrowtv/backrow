"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useCallback, forwardRef } from "react";
import { X, CaretDown, Check } from "@phosphor-icons/react";
import { ActivityTabs } from "./ActivityTabs";
import { MemberFilterCombobox, type MemberOption } from "./MemberFilterCombobox";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  parseActivityFiltersFromURL,
  serializeActivityFiltersToURL,
  type ActivityFiltersState,
  type ActivityFilterCategory,
  type ClubActivitySubFilter,
  type MemberActivitySubFilter,
  type DateRangePreset,
  CLUB_SUBFILTER_LABELS,
  MEMBER_SUBFILTER_LABELS,
  CLUB_SUB_FILTERS,
  MEMBER_SUB_FILTERS,
  DATE_RANGE_PRESETS,
  countActiveFilters,
} from "@/lib/activity/activity-filters";

const STORAGE_KEY = "activityFilters";

interface ActivityFiltersV2Props {
  clubs?: Array<{ id: string; name: string }>;
  /** Whether current user is admin of any currently selected club */
  isAdminOfSelectedClub?: boolean;
  /** All members of the selected clubs (for member activity filter) */
  clubMembers?: MemberOption[];
  /** Admin members only of the selected clubs (for club activity filter) */
  clubAdmins?: MemberOption[];
}

/** Shared trigger button styles for filter dropdowns */
const FilterTrigger = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isActive: boolean;
  }
>(({ children, isActive, className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
      "border border-[var(--border)]",
      isActive
        ? "bg-[var(--surface-2)] text-[var(--text-primary)] border-[var(--border-hover)]"
        : "bg-[var(--surface-1)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]",
      className
    )}
    {...props}
  >
    {children}
    <CaretDown className="w-3 h-3 opacity-50" />
  </button>
));
FilterTrigger.displayName = "FilterTrigger";

export function ActivityFiltersV2({
  clubs = [],
  isAdminOfSelectedClub = false,
  clubMembers = [],
  clubAdmins = [],
}: ActivityFiltersV2Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse filters from URL
  const urlSearchParams = new URLSearchParams(searchParams.toString());
  const initialFilters = parseActivityFiltersFromURL(urlSearchParams);

  const [selectedCategory, setSelectedCategory] = useState<ActivityFilterCategory | null>(
    initialFilters.category
  );
  const [selectedSubFilters, setSelectedSubFilters] = useState<string[]>(initialFilters.subFilters);
  const [selectedClubIds, setSelectedClubIds] = useState<string[]>(initialFilters.clubIds);
  const [selectedUser, setSelectedUser] = useState<string | null>(initialFilters.userId);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangePreset>(
    initialFilters.dateRange
  );

  // Member filter dropdown state
  const [memberOpen, setMemberOpen] = useState(false);

  // Track if filters have changed from initial URL values
  const [hasFilterChanged, setHasFilterChanged] = useState(false);
  const [initialUrlValues] = useState({
    ...initialFilters,
    page: searchParams.get("page"),
    size: searchParams.get("size"),
  });

  // Determine if member filter should be shown
  const shouldShowMemberFilter = selectedClubIds.length > 0 && isAdminOfSelectedClub;

  // Build current filter state
  const buildFilterState = useCallback(
    (): ActivityFiltersState => ({
      category: selectedCategory,
      subFilters: selectedSubFilters,
      clubIds: selectedClubIds,
      userId: selectedUser,
      dateRange: selectedDateRange,
    }),
    [selectedCategory, selectedSubFilters, selectedClubIds, selectedUser, selectedDateRange]
  );

  // Update URL when filters change
  const updateUrl = useCallback(
    (resetPagination: boolean = true) => {
      const filters = buildFilterState();
      const params = serializeActivityFiltersToURL(filters);

      if (!resetPagination) {
        if (initialUrlValues.page) params.set("page", initialUrlValues.page);
        if (initialUrlValues.size) params.set("size", initialUrlValues.size);
      }

      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(newUrl, { scroll: false });
    },
    [buildFilterState, initialUrlValues, pathname, router]
  );

  // Update URL when any filter changes
  useEffect(() => {
    const currentState = buildFilterState();
    const matchesInitial =
      currentState.category === initialUrlValues.category &&
      currentState.subFilters.join(",") === initialUrlValues.subFilters.join(",") &&
      currentState.clubIds.join(",") === initialUrlValues.clubIds.join(",") &&
      currentState.userId === initialUrlValues.userId &&
      currentState.dateRange === initialUrlValues.dateRange;

    if (matchesInitial && !hasFilterChanged) return;
    updateUrl(hasFilterChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Deps are the filter values that should trigger URL updates
  }, [selectedCategory, selectedSubFilters, selectedClubIds, selectedUser, selectedDateRange]);

  // Clear stale localStorage on mount
  useEffect(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // ============================================
  // FILTER HANDLERS
  // ============================================

  const selectCategory = (category: ActivityFilterCategory | null) => {
    setHasFilterChanged(true);
    setSelectedCategory(category);
    setSelectedSubFilters([]);
    setSelectedUser(null);
  };

  const toggleSubFilter = (filter: string) => {
    setHasFilterChanged(true);
    setSelectedSubFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );
  };

  const toggleClub = (clubId: string) => {
    setHasFilterChanged(true);
    setSelectedClubIds((prev) =>
      prev.includes(clubId) ? prev.filter((id) => id !== clubId) : [...prev, clubId]
    );
    setSelectedUser(null);
  };

  const clearClubFilter = () => {
    setHasFilterChanged(true);
    setSelectedClubIds([]);
    setSelectedUser(null);
  };

  const handleDateRangeChange = (value: string) => {
    setHasFilterChanged(true);
    setSelectedDateRange(value as DateRangePreset);
  };

  const handleUserChange = (userId: string | null) => {
    setHasFilterChanged(true);
    setSelectedUser(userId);
    setMemberOpen(false);
  };

  const clearFilters = () => {
    setHasFilterChanged(true);
    setSelectedSubFilters([]);
    setSelectedClubIds([]);
    setSelectedUser(null);
    setSelectedDateRange("all_time");
    localStorage.removeItem(STORAGE_KEY);
  };

  // ============================================
  // UI STATE
  // ============================================

  const currentFilters = buildFilterState();
  const activeCount = countActiveFilters(currentFilters);
  const hasActiveFilters = activeCount > 0;

  const currentSubFilters =
    selectedCategory === "club_activity"
      ? CLUB_SUB_FILTERS
      : selectedCategory === "member_activity"
        ? MEMBER_SUB_FILTERS
        : [];

  const subFilterLabels =
    selectedCategory === "club_activity" ? CLUB_SUBFILTER_LABELS : MEMBER_SUBFILTER_LABELS;

  const clubFilterCount = selectedClubIds.length;
  const timeFilterActive = selectedDateRange !== "all_time";
  const typesFilterCount = selectedSubFilters.length;
  const memberFilterActive = !!selectedUser;

  // Get display label for time filter
  const timeLabel = timeFilterActive
    ? DATE_RANGE_PRESETS[selectedDateRange].label
    : "Time";

  // Get club name for single selection display
  const clubLabel =
    clubFilterCount === 1
      ? clubs.find((c) => c.id === selectedClubIds[0])?.name || "1 club"
      : clubFilterCount > 1
        ? `${clubFilterCount} clubs`
        : "Club";

  // Get type label for display
  const typeLabel =
    typesFilterCount === 1
      ? subFilterLabels[selectedSubFilters[0] as keyof typeof subFilterLabels] || "1 type"
      : typesFilterCount > 1
        ? `${typesFilterCount} types`
        : "Type";

  // Get member label
  const selectedMember =
    selectedUser && selectedCategory === "club_activity"
      ? clubAdmins.find((m) => m.id === selectedUser)
      : selectedUser
        ? clubMembers.find((m) => m.id === selectedUser)
        : null;
  const memberLabel = selectedMember?.display_name || "Member";

  return (
    <div className="space-y-3">
      {/* Category Tabs */}
      <ActivityTabs value={selectedCategory} onChange={selectCategory} />

      {/* Filter Dropdowns Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Club Filter Dropdown */}
        {clubs.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <FilterTrigger isActive={clubFilterCount > 0}>
                {clubLabel}
              </FilterTrigger>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {clubs.map((club) => (
                <DropdownMenuCheckboxItem
                  key={club.id}
                  checked={selectedClubIds.includes(club.id)}
                  onCheckedChange={() => toggleClub(club.id)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {club.name}
                </DropdownMenuCheckboxItem>
              ))}
              {clubFilterCount > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={clearClubFilter}
                    className="text-[var(--text-muted)] justify-center text-xs"
                  >
                    Clear
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Time Period Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <FilterTrigger isActive={timeFilterActive}>
              {timeLabel}
            </FilterTrigger>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuRadioGroup
              value={selectedDateRange}
              onValueChange={handleDateRangeChange}
            >
              {Object.entries(DATE_RANGE_PRESETS).map(([key, config]) => (
                <DropdownMenuRadioItem key={key} value={key}>
                  {config.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Activity Type Dropdown (only when category selected) */}
        {selectedCategory && currentSubFilters.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <FilterTrigger isActive={typesFilterCount > 0}>
                {typeLabel}
              </FilterTrigger>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {currentSubFilters.map((filter) => {
                const label =
                  selectedCategory === "club_activity"
                    ? CLUB_SUBFILTER_LABELS[filter as ClubActivitySubFilter]
                    : MEMBER_SUBFILTER_LABELS[filter as MemberActivitySubFilter];
                return (
                  <DropdownMenuCheckboxItem
                    key={filter}
                    checked={selectedSubFilters.includes(filter)}
                    onCheckedChange={() => toggleSubFilter(filter)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {label}
                  </DropdownMenuCheckboxItem>
                );
              })}
              {typesFilterCount > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      setHasFilterChanged(true);
                      setSelectedSubFilters([]);
                    }}
                    className="text-[var(--text-muted)] justify-center text-xs"
                  >
                    Clear
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Member Filter Dropdown (admin only, clubs selected) */}
        {shouldShowMemberFilter && (
          <DropdownMenu open={memberOpen} onOpenChange={setMemberOpen}>
            <DropdownMenuTrigger asChild>
              <FilterTrigger isActive={memberFilterActive}>
                {memberLabel}
              </FilterTrigger>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="p-2 min-w-[220px]">
              <MemberFilterCombobox
                members={selectedCategory === "club_activity" ? clubAdmins : clubMembers}
                selectedUserId={selectedUser}
                onSelect={handleUserChange}
                placeholder={
                  selectedCategory === "club_activity" ? "Search admins..." : "Search members..."
                }
                emptyMessage={
                  selectedCategory === "club_activity" ? "No admins found" : "No members found"
                }
              />
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Clear All Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}

// Re-export types and constants from activity-filters for backward compatibility
export {
  type ActivityFilterCategory,
  type ClubActivitySubFilter,
  type MemberActivitySubFilter,
  type DateRangePreset,
  CATEGORY_LABELS,
  CLUB_SUBFILTER_LABELS,
  MEMBER_SUBFILTER_LABELS,
} from "@/lib/activity/activity-filters";

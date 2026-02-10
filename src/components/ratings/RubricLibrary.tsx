"use client";

import { useState, useMemo, useTransition, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { RubricEditor } from "./RubricEditor";
import type { RatingRubric } from "@/types/club-settings";
import { PRESET_RUBRICS, createRubricsFromPreset } from "@/types/club-settings";
import {
  createRubric,
  updateRubric,
  deleteRubric,
  duplicateRubric,
  setDefaultRubric,
} from "@/app/actions/rubrics";
import type { UserRubric } from "@/app/actions/rubrics.types";
import toast from "react-hot-toast";
import {
  MagnifyingGlass,
  Plus,
  Star,
  Copy,
  Trash,
  Pencil,
  SortAscending,
  CaretDown,
  Scales,
  CaretRight,
  DotsThree,
} from "@phosphor-icons/react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// Theme-based color palette for pie chart slices (up to 10 categories)
const SLICE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--warning)",
  "var(--link)",
  "hsl(var(--primary-300))",
  "hsl(var(--secondary-300))",
  "hsl(var(--accent-300))",
];

// Custom tooltip for pie chart hover
function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div
      className="px-2 py-1 rounded text-xs font-medium shadow-lg"
      style={{
        backgroundColor: "var(--surface-2)",
        color: "var(--text-primary)",
        border: "1px solid var(--border)",
      }}
    >
      {name} {value}%
    </div>
  );
}

interface RubricLibraryProps {
  initialRubrics: UserRubric[];
  onRubricSelect?: (rubric: UserRubric) => void;
  onRubricsChange?: (rubrics: UserRubric[]) => void; // Notify parent of rubric list changes
  selectionMode?: boolean; // If true, clicking a rubric selects it instead of editing
  selectedRubricId?: string | null;
}

type SortOption = "name" | "created" | "updated";

export function RubricLibrary({
  initialRubrics,
  onRubricSelect,
  onRubricsChange,
  selectionMode = false,
  selectedRubricId,
}: RubricLibraryProps) {
  const [rubrics, setRubrics] = useState<UserRubric[]>(initialRubrics);
  const isInitialMount = useRef(true);

  // Notify parent when rubrics change (after initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onRubricsChange?.(rubrics);
  }, [rubrics]); // eslint-disable-line react-hooks/exhaustive-deps -- onRubricsChange is a callback prop; including it would fire on every parent re-render
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("created");
  const [sortAsc, setSortAsc] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Editor modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRubric, setEditingRubric] = useState<UserRubric | null>(null);
  const [editorName, setEditorName] = useState("");
  const [editorCategories, setEditorCategories] = useState<RatingRubric[]>([]);

  // Preset selector state
  const [showPresets, setShowPresets] = useState(false);

  const [isPending, startTransition] = useTransition();

  // Filter and sort rubrics
  const filteredRubrics = useMemo(() => {
    let result = [...rubrics];

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.categories.some((c) => c.name.toLowerCase().includes(query))
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "created":
          comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          break;
        case "updated":
          comparison = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          break;
      }
      return sortAsc ? -comparison : comparison;
    });

    // Always put default first
    const defaultIndex = result.findIndex((r) => r.is_default);
    if (defaultIndex > 0) {
      const [defaultRubric] = result.splice(defaultIndex, 1);
      result.unshift(defaultRubric);
    }

    return result;
  }, [rubrics, searchQuery, sortBy, sortAsc]);

  // Open editor for new rubric
  const handleCreateNew = () => {
    setEditingRubric(null);
    setEditorName("");
    setEditorCategories([]);
    setEditorOpen(true);
  };

  // Open editor for existing rubric
  const handleEdit = (rubric: UserRubric) => {
    setEditingRubric(rubric);
    setEditorName(rubric.name);
    setEditorCategories(rubric.categories);
    setEditorOpen(true);
  };

  // Save rubric (create or update)
  const handleSave = () => {
    const totalWeight = editorCategories.reduce((sum, c) => sum + c.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      toast.error("Category weights must total 100%");
      return;
    }

    if (!editorName.trim()) {
      toast.error("Rubric name is required");
      return;
    }

    if (editorCategories.some((c) => !c.name.trim())) {
      toast.error("All categories must have a name");
      return;
    }

    startTransition(async () => {
      if (editingRubric) {
        // Update existing
        const result = await updateRubric(editingRubric.id, {
          name: editorName,
          categories: editorCategories,
        });

        if ("error" in result && result.error) {
          toast.error(result.error);
        } else if (result.data) {
          setRubrics((prev) => prev.map((r) => (r.id === editingRubric.id ? result.data! : r)));
          toast.success("Rubric updated");
          setEditorOpen(false);
        }
      } else {
        // Create new
        const result = await createRubric(editorName, editorCategories, rubrics.length === 0);

        if ("error" in result && result.error) {
          toast.error(result.error);
        } else if (result.data) {
          setRubrics((prev) => [result.data!, ...prev]);
          toast.success("Rubric created");
          setEditorOpen(false);
        }
      }
    });
  };

  // Delete rubric
  const handleDelete = (rubric: UserRubric) => {
    if (!confirm(`Delete "${rubric.name}"? This cannot be undone.`)) return;

    startTransition(async () => {
      const result = await deleteRubric(rubric.id);

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        setRubrics((prev) => prev.filter((r) => r.id !== rubric.id));
        toast.success("Rubric deleted");
      }
    });
  };

  // Duplicate rubric
  const handleDuplicate = (rubric: UserRubric) => {
    startTransition(async () => {
      const result = await duplicateRubric(rubric.id);

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else if (result.data) {
        setRubrics((prev) => [result.data!, ...prev]);
        toast.success("Rubric duplicated");
      }
    });
  };

  // Set as default
  const handleSetDefault = (rubric: UserRubric) => {
    startTransition(async () => {
      const result = await setDefaultRubric(rubric.id);

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        setRubrics((prev) =>
          prev.map((r) => ({
            ...r,
            is_default: r.id === rubric.id,
          }))
        );
        toast.success("Default rubric updated");
      }
    });
  };

  // Create from preset
  const handleCreateFromPreset = (presetId: string) => {
    const preset = PRESET_RUBRICS.find((p) => p.id === presetId);
    if (!preset) return;

    setEditingRubric(null);
    setEditorName(preset.name);
    setEditorCategories(createRubricsFromPreset(preset));
    setShowPresets(false);
    setEditorOpen(true);
  };

  // Handle rubric selection in selection mode
  const handleSelect = (rubric: UserRubric) => {
    if (selectionMode && onRubricSelect) {
      onRubricSelect(rubric);
    } else {
      handleEdit(rubric);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header: Search + Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <MagnifyingGlass
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: "var(--text-muted)" }}
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rubrics..."
            className="pl-9 h-9 search-input-debossed"
          />
        </div>

        {/* Sort */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="gap-1.5"
          >
            <SortAscending className="h-4 w-4" />
            <span className="hidden sm:inline">Sort</span>
            <CaretDown className="h-3 w-3" />
          </Button>

          {showSortMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
              <div
                className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-lg border shadow-lg py-1"
                style={{
                  backgroundColor: "var(--surface-1)",
                  borderColor: "var(--border)",
                }}
              >
                {[
                  { value: "created", label: "Date Created" },
                  { value: "updated", label: "Last Updated" },
                  { value: "name", label: "Name" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      if (sortBy === option.value) {
                        setSortAsc(!sortAsc);
                      } else {
                        setSortBy(option.value as SortOption);
                        setSortAsc(false);
                      }
                      setShowSortMenu(false);
                    }}
                    className={cn(
                      "w-full px-3 py-1.5 text-left text-sm transition-colors",
                      "hover:bg-[var(--hover)]",
                      sortBy === option.value && "text-[var(--primary)] font-medium"
                    )}
                  >
                    {option.label}
                    {sortBy === option.value && (sortAsc ? " ↑" : " ↓")}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Create New */}
        <Button variant="primary" size="sm" onClick={handleCreateNew} disabled={isPending}>
          <Plus className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">New Rubric</span>
        </Button>
      </div>

      {/* Preset Templates */}
      <div>
        <button
          onClick={() => setShowPresets(!showPresets)}
          className="flex items-center gap-2 text-sm transition-colors hover:text-[var(--primary)]"
          style={{ color: "var(--text-muted)" }}
        >
          <CaretRight className={cn("h-4 w-4 transition-transform", showPresets && "rotate-90")} />
          Start from a template
        </button>

        {showPresets && (
          <div
            className="mt-2 rounded-lg border-2 border-dashed p-3 space-y-2"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface-0)",
            }}
          >
            <Text size="tiny" muted className="mb-1">
              Pick a template to pre-fill the editor — you can customize everything after.
            </Text>
            {PRESET_RUBRICS.map((preset) => {
              const pieData = preset.rubrics.map((c) => ({
                name: c.name,
                value: c.weight,
              }));
              return (
                <button
                  key={preset.id}
                  onClick={() => handleCreateFromPreset(preset.id)}
                  disabled={isPending}
                  className="w-full p-3 rounded-lg border text-left transition-all cursor-pointer hover:border-[var(--primary)]/50 opacity-75 hover:opacity-100"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--surface-1)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Mini Pie Chart */}
                    <div className="flex-shrink-0 w-[56px] h-[56px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={10}
                            outerRadius={26}
                            dataKey="value"
                            strokeWidth={1}
                            stroke="var(--surface-1)"
                            isAnimationActive={false}
                          >
                            {pieData.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={SLICE_COLORS[index % SLICE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<PieTooltip />} position={{ x: 56, y: 16 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Name + Categories */}
                    <div className="flex-1 min-w-0">
                      <Text className="font-medium truncate">{preset.name}</Text>

                      {/* Category labels with color dots */}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        {preset.rubrics.map((c, i) => (
                          <span
                            key={i}
                            className="flex items-center gap-1 text-[11px]"
                            style={{ color: "var(--text-muted)" }}
                          >
                            <span
                              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length],
                              }}
                            />
                            {c.name} <span style={{ color: "var(--border-hover)" }}>·</span>{" "}
                            {c.weight}%
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Rubric List */}
      {filteredRubrics.length === 0 ? (
        <div
          className="p-8 rounded-lg border-2 border-dashed text-center"
          style={{ borderColor: "var(--border)" }}
        >
          <Scales
            className="h-10 w-10 mx-auto mb-3 opacity-30"
            style={{ color: "var(--text-muted)" }}
          />
          <Text size="sm" muted className="mb-1">
            {searchQuery ? "No rubrics match your search" : "No rubrics yet"}
          </Text>
          <Text size="tiny" muted>
            {searchQuery
              ? "Try a different search term"
              : "Create your first rubric or start from a template"}
          </Text>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRubrics.map((rubric) => (
            <RubricCard
              key={rubric.id}
              rubric={rubric}
              isSelected={selectedRubricId === rubric.id}
              selectionMode={selectionMode}
              disabled={isPending}
              onClick={() => handleSelect(rubric)}
              onEdit={() => handleEdit(rubric)}
              onDelete={() => handleDelete(rubric)}
              onDuplicate={() => handleDuplicate(rubric)}
              onSetDefault={() => handleSetDefault(rubric)}
            />
          ))}
        </div>
      )}

      {/* Editor Modal */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRubric ? "Edit Rubric" : "Create New Rubric"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <RubricEditor
              rubrics={editorCategories}
              rubricName={editorName}
              onChange={setEditorCategories}
              onNameChange={setEditorName}
              disabled={isPending}
            />

            <div
              className="flex justify-end gap-2 pt-4 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={isPending}>
                {isPending ? "Saving..." : editingRubric ? "Save Changes" : "Create Rubric"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Rubric Card Component
interface RubricCardProps {
  rubric: UserRubric;
  isSelected?: boolean;
  selectionMode?: boolean;
  disabled?: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSetDefault: () => void;
}

function RubricCard({
  rubric,
  isSelected,
  selectionMode,
  disabled,
  onClick,
  onEdit,
  onDelete,
  onDuplicate,
  onSetDefault,
}: RubricCardProps) {
  const pieData = rubric.categories.map((c) => ({
    name: c.name,
    value: c.weight,
  }));

  return (
    <div
      onClick={onClick}
      className={cn(
        "group p-3 rounded-lg border transition-all cursor-pointer",
        "hover:border-[var(--primary)]/50",
        isSelected &&
          "ring-1 ring-[var(--primary)] bg-[var(--surface-3)] shadow-sm border-transparent",
        disabled && "opacity-50 pointer-events-none"
      )}
      style={{
        borderColor: isSelected ? undefined : "var(--border)",
        backgroundColor: isSelected ? undefined : "var(--surface-1)",
      }}
    >
      <div className="flex items-center gap-3">
        {/* Mini Pie Chart */}
        <div className="flex-shrink-0 w-[56px] h-[56px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={10}
                outerRadius={26}
                dataKey="value"
                strokeWidth={1}
                stroke="var(--surface-1)"
                isAnimationActive={false}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={SLICE_COLORS[index % SLICE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} position={{ x: 56, y: 16 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Name + Categories */}
        <div className="flex-1 min-w-0">
          {/* Name + Default Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <Text className="font-medium truncate">{rubric.name}</Text>
            {rubric.is_default && (
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded"
                style={{ backgroundColor: "var(--primary)/10", color: "var(--primary)" }}
              >
                <Star weight="fill" className="h-3 w-3" />
                Default
              </span>
            )}
          </div>

          {/* Category labels with color dots */}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            {rubric.categories.map((c, i) => (
              <span
                key={c.id}
                className="flex items-center gap-1 text-[11px]"
                style={{ color: "var(--text-muted)" }}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }}
                />
                {c.name} <span style={{ color: "var(--border-hover)" }}>·</span> {c.weight}%
              </span>
            ))}
          </div>
        </div>

        {/* Three-dot menu */}
        {!selectionMode && (
          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-60 group-hover:opacity-100 transition-opacity"
                >
                  <DotsThree weight="bold" className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit} className="gap-2">
                  <Pencil className="h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate} className="gap-2">
                  <Copy className="h-4 w-4" />
                  Copy
                </DropdownMenuItem>
                {!rubric.is_default && (
                  <DropdownMenuItem onClick={onSetDefault} className="gap-2">
                    <Star className="h-4 w-4" />
                    Set as Default
                  </DropdownMenuItem>
                )}
                {rubric.is_default && (
                  <DropdownMenuItem disabled className="gap-2">
                    <Star weight="fill" className="h-4 w-4" />
                    Default
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="gap-2 text-[var(--destructive)] focus:text-[var(--destructive)] focus:bg-[var(--destructive)]/10"
                >
                  <Trash className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}

export default RubricLibrary;

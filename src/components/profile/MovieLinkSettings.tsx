"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ArrowCounterClockwise,
  WarningCircle,
  DotsSixVertical,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IMDbLogo,
  LetterboxdLogo,
  TraktLogo,
  TMDbLogo,
  WikipediaLogo,
} from "@/components/ui/external-logos";
import {
  MOVIE_LINK_TYPES,
  MOVIE_LINK_CONFIG,
  type MovieLinkType,
  type MovieLinkPreferences,
} from "@/lib/navigation-constants";
import {
  updateMovieLinkPreferences,
  resetMovieLinkPreferences,
} from "@/app/actions/navigation-preferences";

// Logo components for each link type
const LOGO_COMPONENTS: Record<MovieLinkType, React.ComponentType<{ size?: number }>> = {
  imdb: ({ size = 20 }) => <IMDbLogo size={size} />,
  letterboxd: ({ size = 18 }) => <LetterboxdLogo size={size} />,
  trakt: ({ size = 18 }) => <TraktLogo size={size} />,
  tmdb: ({ size = 14 }) => <TMDbLogo size={size} />,
  wikipedia: ({ size = 18 }) => <WikipediaLogo size={size} />,
};

interface SortableItemProps {
  linkType: MovieLinkType;
  isEnabled: boolean;
  onToggle: (linkType: MovieLinkType, enabled: boolean) => void;
}

function SortableItem({ linkType, isEnabled, onToggle }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: linkType,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const config = MOVIE_LINK_CONFIG[linkType];
  const Logo = LOGO_COMPONENTS[linkType];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex-1 min-w-0 flex flex-col items-center gap-1 py-1.5 rounded-lg transition-colors",
        isDragging && "z-50 shadow-lg bg-[var(--surface-1)]",
        !isEnabled && "opacity-40"
      )}
      title={config.label}
    >
      <button
        type="button"
        className="touch-none cursor-grab active:cursor-grabbing text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        {...attributes}
        {...listeners}
      >
        <DotsSixVertical className="w-3 h-3 rotate-90" weight="bold" />
      </button>
      <div className="w-6 h-6 flex items-center justify-center">
        <Logo />
      </div>
      <span className="text-[9px] font-medium text-[var(--text-muted)] leading-none">
        {config.label}
      </span>
      <Switch
        checked={isEnabled}
        onCheckedChange={(checked) => onToggle(linkType, checked)}
        className="scale-[0.6] -my-1"
      />
    </div>
  );
}

interface MovieLinkSettingsProps {
  initialPreferences: MovieLinkPreferences;
}

export function MovieLinkSettings({ initialPreferences }: MovieLinkSettingsProps) {
  const router = useRouter();

  // Build initial order: visible links first (in their order), then hidden ones
  const getInitialOrder = (): MovieLinkType[] => {
    const visible = initialPreferences.visibleLinks;
    const hidden = MOVIE_LINK_TYPES.filter((t) => !visible.includes(t));
    return [...visible, ...hidden];
  };

  const [linkOrder, setLinkOrder] = useState<MovieLinkType[]>(getInitialOrder);
  const [enabledLinks, setEnabledLinks] = useState<Set<MovieLinkType>>(
    new Set(initialPreferences.visibleLinks)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLinkOrder((items) => {
        const oldIndex = items.indexOf(active.id as MovieLinkType);
        const newIndex = items.indexOf(over.id as MovieLinkType);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleToggle = (linkType: MovieLinkType, enabled: boolean) => {
    setEnabledLinks((prev) => {
      const next = new Set(prev);
      if (enabled) {
        next.add(linkType);
      } else {
        next.delete(linkType);
      }
      return next;
    });
  };

  // Get visible links in the current order
  const getVisibleLinksInOrder = useCallback((): MovieLinkType[] => {
    return linkOrder.filter((t) => enabledLinks.has(t));
  }, [linkOrder, enabledLinks]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    setErrorMessage(null);

    const result = await updateMovieLinkPreferences({
      visibleLinks: getVisibleLinksInOrder(),
    });

    setIsSaving(false);
    if (result.success) {
      setSaveStatus("success");
      router.refresh();
      setTimeout(() => setSaveStatus("idle"), 2000);
    } else {
      setSaveStatus("error");
      setErrorMessage(result.error || "Failed to save");
      setTimeout(() => {
        setSaveStatus("idle");
        setErrorMessage(null);
      }, 4000);
    }
  }, [getVisibleLinksInOrder, router]);

  const handleReset = useCallback(async () => {
    setIsResetting(true);
    const result = await resetMovieLinkPreferences();
    if (result.success) {
      setLinkOrder([...MOVIE_LINK_TYPES]);
      setEnabledLinks(new Set(MOVIE_LINK_TYPES));
      router.refresh();
    }
    setIsResetting(false);
  }, [router]);

  // Check if anything has changed
  const currentVisible = getVisibleLinksInOrder();
  const hasChanges =
    JSON.stringify(currentVisible) !== JSON.stringify(initialPreferences.visibleLinks);

  return (
    <div className="space-y-2">
      {/* Horizontal sortable row */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={linkOrder} strategy={horizontalListSortingStrategy}>
          <div className="flex items-start justify-evenly">
            {linkOrder.map((linkType) => (
              <SortableItem
                key={linkType}
                linkType={linkType}
                isEnabled={enabledLinks.has(linkType)}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Footer row with warnings and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {enabledLinks.size === 0 && (
            <div className="flex items-center gap-1 text-amber-500 text-[10px]">
              <WarningCircle className="w-3 h-3" />
              None selected
            </div>
          )}
          {errorMessage && (
            <div className="flex items-center gap-1 text-[var(--error)] text-[10px]">
              <WarningCircle className="w-3 h-3" />
              {errorMessage}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
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
            title="Reset to default order"
          >
            <ArrowCounterClockwise className={cn("w-3 h-3", isResetting && "animate-spin")} />
          </Button>
        </div>
      </div>
    </div>
  );
}

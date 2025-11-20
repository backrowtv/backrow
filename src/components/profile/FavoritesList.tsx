"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { DebossedTabs } from "@/components/ui/debossed-tabs";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  DotsSixVertical,
  Star,
  X,
  Plus,
  FilmReel,
  User,
  List,
  SquaresFour,
  CaretUp,
  CaretDown,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";
import {
  addFavorite,
  removeFavorite,
  toggleFeatured,
  reorderFavorites,
} from "@/app/actions/profile/favorites";
import { AddFavoriteDialog } from "./AddFavoriteDialog";
import type { UserFavorite, FavoriteItemType } from "@/types/favorites";

type TabType = "featured" | "movie" | "person";
type ViewMode = "list" | "card";
type SortDirection = "asc" | "desc";

const MOVIE_SORT_OPTIONS = [
  { value: "date_added", label: "Date Added", defaultDir: "desc" as const },
  { value: "name", label: "Title", defaultDir: "asc" as const },
  { value: "year", label: "Year", defaultDir: "desc" as const },
  { value: "director", label: "Director", defaultDir: "asc" as const },
  { value: "runtime", label: "Runtime", defaultDir: "desc" as const },
] as const;

const PERSON_SORT_OPTIONS = [
  { value: "date_added", label: "Date Added", defaultDir: "desc" as const },
  { value: "name", label: "Name", defaultDir: "asc" as const },
  { value: "known_for", label: "Title", defaultDir: "asc" as const },
  { value: "birthday", label: "Born", defaultDir: "asc" as const },
] as const;

type SortField = string;

/** Normalize TMDB image paths — handles both raw paths and full URLs */
function normalizeTmdbImageUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `https://image.tmdb.org/t/p/w500${path}`;
}

/** Map TMDB department to a proper title */
function departmentToTitle(dept: string | null | undefined): string {
  if (!dept) return "";
  const map: Record<string, string> = {
    Acting: "Actor",
    Directing: "Director",
    Writing: "Writer",
    Production: "Producer",
    Sound: "Composer",
    Camera: "Cinematographer",
    Editing: "Editor",
    Art: "Production Designer",
    "Costume & Make-Up": "Costume Designer",
    "Visual Effects": "VFX Supervisor",
    Lighting: "Gaffer",
    Crew: "Crew",
  };
  return map[dept] || dept;
}

interface FavoritesListProps {
  initialFavorites: UserFavorite[];
}

// ── Star button (shared) ────────────────────────────────────

function FeaturedStarButton({
  favorite,
  featuredCount,
  onToggle,
  isPending,
}: {
  favorite: UserFavorite;
  featuredCount: number;
  onToggle: (id: string, featured: boolean) => void;
  isPending: boolean;
}) {
  const canFeature = favorite.is_featured || featuredCount < 4;
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle(favorite.id, !favorite.is_featured);
      }}
      disabled={isPending || (!favorite.is_featured && !canFeature)}
      className={cn(
        "flex-shrink-0 p-1 rounded transition-colors",
        favorite.is_featured
          ? "text-yellow-400 hover:text-yellow-300"
          : "text-[var(--text-muted)] hover:text-yellow-400",
        !canFeature && !favorite.is_featured && "opacity-30 cursor-not-allowed"
      )}
      title={
        favorite.is_featured
          ? "Remove from ID card"
          : canFeature
            ? "Feature on ID card"
            : "Maximum 4 featured"
      }
    >
      <Star className="h-4 w-4" weight={favorite.is_featured ? "fill" : "regular"} />
    </button>
  );
}

// ── Thumbnail (shared) ──────────────────────────────────────

function FavoriteThumbnail({ favorite }: { favorite: UserFavorite }) {
  const isMovie = favorite.item_type === "movie";
  const imgSrc = normalizeTmdbImageUrl(favorite.image_path);
  if (isMovie) {
    return (
      <div className="relative w-6 h-9 flex-shrink-0 rounded-sm overflow-hidden bg-[var(--surface-2)]">
        {imgSrc ? (
          <Image
            src={imgSrc}
            alt={favorite.title}
            fill
            className="object-cover"
            sizes="24px"
            placeholder="blur"
            blurDataURL={getTMDBBlurDataURL()}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
            <FilmReel className="h-3 w-3" />
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="relative w-7 h-7 flex-shrink-0 rounded-full overflow-hidden bg-[var(--surface-2)]">
      {imgSrc ? (
        <Image
          src={imgSrc}
          alt={favorite.title}
          fill
          className="object-cover"
          sizes="28px"
          placeholder="blur"
          blurDataURL={getTMDBBlurDataURL()}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
          <User className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}

// ── Sortable item for Featured tab ──────────────────────────

function SortableFavoriteItem({
  favorite,
  onToggleFeatured,
  onRemove,
  isPending,
  featuredCount,
}: {
  favorite: UserFavorite;
  onToggleFeatured: (id: string, featured: boolean) => void;
  onRemove: (id: string) => void;
  isPending: boolean;
  featuredCount: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: favorite.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors group/item",
        isDragging && "z-50 shadow-lg bg-[var(--surface-1)]",
        "hover:bg-[var(--surface-1)]"
      )}
    >
      <button
        type="button"
        className="touch-none cursor-grab active:cursor-grabbing text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors flex-shrink-0"
        {...attributes}
        {...listeners}
      >
        <DotsSixVertical className="w-4 h-4" weight="bold" />
      </button>
      <FavoriteThumbnail favorite={favorite} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
          {favorite.title || "Unknown"}
          {favorite.subtitle && (
            <span className="text-[var(--text-muted)] font-normal"> · {favorite.subtitle}</span>
          )}
        </p>
      </div>
      <FeaturedStarButton
        favorite={favorite}
        featuredCount={featuredCount}
        onToggle={onToggleFeatured}
        isPending={isPending}
      />
      <button
        onClick={() => onRemove(favorite.id)}
        disabled={isPending}
        className="flex-shrink-0 p-1 rounded text-[var(--text-muted)] opacity-0 group-hover/item:opacity-100 hover:text-[var(--destructive)] transition-all"
        title="Remove favorite"
      >
        <X className="h-3.5 w-3.5" weight="bold" />
      </button>
    </div>
  );
}

// ── Static list item (Movies/People tabs) ───────────────────

function FavoriteListItem({
  favorite,
  onRemove,
  onToggleFeatured,
  isPending,
  featuredCount,
}: {
  favorite: UserFavorite;
  onRemove: (id: string) => void;
  onToggleFeatured: (id: string, featured: boolean) => void;
  isPending: boolean;
  featuredCount: number;
}) {
  const href =
    favorite.item_type === "movie" ? `/movies/${favorite.tmdb_id}` : `/person/${favorite.tmdb_id}`;
  const isMovie = favorite.item_type === "movie";

  const formatDate = (d: string | null | undefined) => {
    if (!d) return null;
    const parts = d.split("-");
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${months[parseInt(parts[1]) - 1]} ${parseInt(parts[2])}, ${parts[0]}`;
  };

  const addedDate = new Date(favorite.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Build metadata string for desktop subtitle line
  let metadata: string;
  if (isMovie) {
    metadata = [
      favorite.director,
      favorite.certification,
      favorite.runtime ? `${favorite.runtime}m` : null,
      favorite.genres?.slice(0, 2).join(", "),
    ]
      .filter(Boolean)
      .join(" · ");
  } else {
    metadata = [
      favorite.place_of_birth?.split(",").slice(-1)[0]?.trim(),
      formatDate(favorite.birthday),
      favorite.deathday ? `d. ${formatDate(favorite.deathday)}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--surface-1)] transition-colors group/item">
      <Link href={href} className="flex items-center gap-2 flex-1 min-w-0">
        <FavoriteThumbnail favorite={favorite} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
            {favorite.title || "Unknown"}
            {favorite.subtitle && (
              <span className="text-[var(--text-muted)] font-normal">
                {" "}
                · {isMovie ? favorite.subtitle : departmentToTitle(favorite.subtitle)}
              </span>
            )}
          </p>
          {metadata && (
            <p className="hidden md:block text-[11px] text-[var(--text-muted)] truncate mt-0.5">
              {metadata}
            </p>
          )}
        </div>
      </Link>
      <span
        className="text-[9px] text-[var(--text-muted)] tabular-nums flex-shrink-0"
        suppressHydrationWarning
      >
        Added {addedDate}
      </span>
      <FeaturedStarButton
        favorite={favorite}
        featuredCount={featuredCount}
        onToggle={onToggleFeatured}
        isPending={isPending}
      />
      <button
        onClick={() => onRemove(favorite.id)}
        disabled={isPending}
        className="flex-shrink-0 p-1 rounded text-[var(--text-muted)] opacity-0 group-hover/item:opacity-100 hover:text-[var(--destructive)] transition-all"
        title="Remove favorite"
      >
        <X className="h-3.5 w-3.5" weight="bold" />
      </button>
    </div>
  );
}

// ── Card view (horizontal scroll) ───────────────────────────

function FavoriteCardView({
  favorites,
  onRemove,
  isPending,
}: {
  favorites: UserFavorite[];
  onRemove: (id: string) => void;
  isPending: boolean;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide overscroll-x-contain pb-2 -mx-1 px-1">
      {favorites.map((fav) => {
        const href =
          fav.item_type === "movie" ? `/movies/${fav.tmdb_id}` : `/person/${fav.tmdb_id}`;
        const imgSrc = normalizeTmdbImageUrl(fav.image_path);
        return (
          <div key={fav.id} className="flex-shrink-0 group/card relative">
            <Link href={href}>
              <div className="w-[80px] aspect-[2/3] overflow-hidden bg-[var(--surface-2)] transition-transform group-hover/card:scale-[1.03] rounded-lg">
                {imgSrc ? (
                  <Image
                    src={imgSrc}
                    alt={fav.title}
                    width={80}
                    height={120}
                    className="w-full h-full object-cover"
                    placeholder="blur"
                    blurDataURL={getTMDBBlurDataURL()}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                    {fav.item_type === "movie" ? (
                      <FilmReel className="h-5 w-5" />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </div>
                )}
              </div>
            </Link>
            <button
              onClick={() => onRemove(fav.id)}
              disabled={isPending}
              className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover/card:opacity-100 hover:bg-[var(--destructive)] transition-all"
              title="Remove"
            >
              <X className="h-3 w-3" weight="bold" />
            </button>
            <p className="mt-1.5 text-[10px] font-medium text-[var(--text-primary)] line-clamp-2 w-[80px]">
              {fav.title}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────

export function FavoritesList({ initialFavorites }: FavoritesListProps) {
  const router = useRouter();
  const [favorites, setFavorites] = useState<UserFavorite[]>(initialFavorites);
  const [activeTab, setActiveTab] = useState<TabType>("featured");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortBy, setSortBy] = useState<SortField>("date_added");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const featuredCount = favorites.filter((f) => f.is_featured).length;

  const handleSortChange = (value: string) => {
    setPage(0);
    if (sortBy === value) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      const options = activeTab === "movie" ? MOVIE_SORT_OPTIONS : PERSON_SORT_OPTIONS;
      const option = options.find((o) => o.value === value);
      setSortBy(value);
      setSortDirection(option?.defaultDir || "asc");
    }
  };

  // Filter by tab
  const tabFavorites = useMemo(() => {
    if (activeTab === "featured") return favorites.filter((f) => f.is_featured);
    return favorites.filter((f) => f.item_type === activeTab);
  }, [favorites, activeTab]);

  // Sort (only for movie/person tabs)
  const sortedFavorites = useMemo(() => {
    if (activeTab === "featured") return tabFavorites;
    const sorted = [...tabFavorites];
    const dir = sortDirection === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return dir * a.title.localeCompare(b.title);
        case "year":
          return dir * ((parseInt(a.subtitle || "0") || 0) - (parseInt(b.subtitle || "0") || 0));
        case "director":
          return dir * (a.director || "ZZZ").localeCompare(b.director || "ZZZ");
        case "runtime":
          return dir * ((a.runtime || 0) - (b.runtime || 0));
        case "certification":
          return dir * (a.certification || "ZZZ").localeCompare(b.certification || "ZZZ");
        case "birthday":
          return dir * (a.birthday || "9999").localeCompare(b.birthday || "9999");
        case "known_for":
          return (
            dir *
            departmentToTitle(a.known_for_department || a.subtitle).localeCompare(
              departmentToTitle(b.known_for_department || b.subtitle)
            )
          );
        case "date_added":
        default:
          return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
    });
    return sorted;
  }, [tabFavorites, sortBy, sortDirection, activeTab]);

  // Pagination (movies/people tabs only, list view only)
  const PAGE_SIZE = 5;
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(sortedFavorites.length / PAGE_SIZE);
  const paginatedFavorites =
    activeTab !== "featured" && viewMode === "list"
      ? sortedFavorites.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
      : sortedFavorites;

  const existingTmdbIds = new Set(favorites.map((f) => `${f.item_type}:${f.tmdb_id}`));

  // ── Handlers ────────────────────────────────────────────

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = favorites.findIndex((f) => f.id === active.id);
    const newIndex = favorites.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(favorites, oldIndex, newIndex);
    setFavorites(newOrder);
    startTransition(async () => {
      const result = await reorderFavorites(newOrder.map((f) => f.id));
      if (result.error) {
        toast.error(result.error);
        setFavorites(favorites);
      }
    });
  };

  const handleToggleFeatured = (id: string, featured: boolean) => {
    if (featured && featuredCount >= 4) {
      toast.error("Maximum 4 featured items for your ID card");
      return;
    }
    setFavorites((prev) => prev.map((f) => (f.id === id ? { ...f, is_featured: featured } : f)));
    startTransition(async () => {
      const result = await toggleFeatured(id, featured);
      if (result.error) {
        toast.error(result.error);
        setFavorites((prev) =>
          prev.map((f) => (f.id === id ? { ...f, is_featured: !featured } : f))
        );
      } else {
        router.refresh();
      }
    });
  };

  const handleRemove = (id: string) => {
    const removed = favorites.find((f) => f.id === id);
    setFavorites((prev) => prev.filter((f) => f.id !== id));
    startTransition(async () => {
      const result = await removeFavorite(id);
      if (result.error) {
        toast.error(result.error);
        if (removed)
          setFavorites((prev) => [...prev, removed].sort((a, b) => a.sort_order - b.sort_order));
      } else {
        router.refresh();
      }
    });
  };

  const handleAdd = (
    tmdbId: number,
    itemType: FavoriteItemType,
    title: string,
    imagePath: string | null,
    subtitle: string | null
  ) => {
    startTransition(async () => {
      const result = await addFavorite(tmdbId, itemType, title, imagePath, subtitle);
      if (result.error) {
        toast.error(result.error);
      } else if (result.data) {
        setFavorites((prev) => [...prev, result.data!]);
        toast.success(`Added ${title} to favorites`);
        setDialogOpen(false);
        router.refresh();
      }
    });
  };

  const tabOptions = [
    { value: "featured", label: "Featured" },
    { value: "movie", label: "Movies" },
    { value: "person", label: "People" },
  ];

  const sortOptions = activeTab === "movie" ? MOVIE_SORT_OPTIONS : PERSON_SORT_OPTIONS;
  const currentSortLabel = sortOptions.find((o) => o.value === sortBy)?.label || "Date Added";
  const dialogDefaultType: FavoriteItemType | undefined =
    activeTab === "movie" ? "movie" : activeTab === "person" ? "person" : undefined;

  return (
    <>
      {/* Tabs */}
      <DebossedTabs
        options={tabOptions}
        value={activeTab}
        onChange={(val) => {
          setActiveTab(val as TabType);
          setSortBy("date_added");
          setSortDirection("desc");
          setPage(0);
        }}
        compact
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between mt-3 mb-2">
        <div className="flex items-center gap-2">
          {activeTab !== "featured" ? (
            <>
              {/* Sort dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px] shrink-0">
                    Sort: {currentSortLabel}
                    {sortDirection === "asc" ? (
                      <CaretUp className="w-3 h-3 opacity-50" />
                    ) : (
                      <CaretDown className="w-3 h-3 opacity-50" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {sortOptions.map((option) => (
                    <DropdownMenuCheckboxItem
                      key={option.value}
                      checked={sortBy === option.value}
                      onCheckedChange={() => handleSortChange(option.value)}
                    >
                      {option.label}
                      {sortBy === option.value && (
                        <span className="ml-auto text-[var(--text-muted)]">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* View mode toggle */}
              <div className="flex gap-0.5 p-0.5 rounded-md bg-[var(--surface-1)]">
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-1 rounded transition-colors",
                    viewMode === "list"
                      ? "bg-[var(--surface-2)] text-[var(--text-primary)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  )}
                  title="List view"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("card")}
                  className={cn(
                    "p-1 rounded transition-colors",
                    viewMode === "card"
                      ? "bg-[var(--surface-2)] text-[var(--text-primary)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  )}
                  title="Card view"
                >
                  <SquaresFour className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          ) : (
            <p className="text-[10px] text-[var(--text-muted)]">{featuredCount}/4 on ID card</p>
          )}
        </div>

        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" weight="bold" />
          Add
        </button>
      </div>

      {/* Content */}
      {sortedFavorites.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            {activeTab === "featured"
              ? "Star items from Movies or People to feature on your ID card"
              : favorites.length === 0
                ? "Add your favorite movies and people"
                : `No ${activeTab === "movie" ? "movies" : "people"} added yet`}
          </p>
          {activeTab !== "featured" && (
            <button
              onClick={() => setDialogOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" weight="bold" />
              Add {activeTab === "movie" ? "a movie" : "a person"}
            </button>
          )}
        </div>
      ) : activeTab === "featured" ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={sortedFavorites.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-0.5">
              {sortedFavorites.map((favorite) => (
                <SortableFavoriteItem
                  key={favorite.id}
                  favorite={favorite}
                  onToggleFeatured={handleToggleFeatured}
                  onRemove={handleRemove}
                  isPending={isPending}
                  featuredCount={featuredCount}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : viewMode === "card" ? (
        <FavoriteCardView
          favorites={sortedFavorites}
          onRemove={handleRemove}
          isPending={isPending}
        />
      ) : (
        <div>
          <div className="space-y-0.5" style={{ minHeight: `${PAGE_SIZE * 40}px` }}>
            {paginatedFavorites.map((favorite) => (
              <FavoriteListItem
                key={favorite.id}
                favorite={favorite}
                onRemove={handleRemove}
                onToggleFeatured={handleToggleFeatured}
                isPending={isPending}
                featuredCount={featuredCount}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-[var(--border)]">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="text-xs font-medium px-2 py-1 rounded transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="text-xs text-[var(--text-muted)] tabular-nums min-w-[4rem] text-center">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="text-xs font-medium px-2 py-1 rounded transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      <AddFavoriteDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSelect={handleAdd}
        existingTmdbIds={existingTmdbIds}
        defaultType={dialogDefaultType}
      />
    </>
  );
}

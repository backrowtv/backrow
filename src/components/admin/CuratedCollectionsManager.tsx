"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FilmStrip,
  Plus,
  Trash,
  Eye,
  EyeSlash,
  MagnifyingGlass,
  X,
  CaretUp,
  CaretDown,
  PencilSimple,
  FloppyDisk,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
// TMDB Search Result type
interface TMDBSearchResult {
  id: number;
  title: string;
  release_date?: string;
  poster_path: string | null;
  overview?: string;
}

import {
  createCuratedCollection,
  updateCuratedCollection,
  deleteCuratedCollection,
  addMovieToCollection,
  removeMovieFromCollection,
  refreshAllCollectionPosters,
  refreshCollectionPosters,
} from "@/app/actions/curated-collections";
import type { CuratedCollection, CuratedMovie } from "@/app/actions/curated-collections.types";

interface CuratedCollectionsManagerProps {
  collections: CuratedCollection[];
}

export function CuratedCollectionsManager({
  collections: initialCollections,
}: CuratedCollectionsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [collections, setCollections] = useState(initialCollections);
  useEffect(() => {
    setCollections(initialCollections);
  }, [initialCollections]);
  const [editingCollection, setEditingCollection] = useState<CuratedCollection | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TMDBSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCollectionForAdd, setSelectedCollectionForAdd] = useState<string | null>(null);
  const [managingCollectionId, setManagingCollectionId] = useState<string | null>(null);

  // Get the collection being managed
  const managingCollection = managingCollectionId
    ? collections.find((c) => c.id === managingCollectionId)
    : null;

  // Ref for add movie dialog
  const addMovieInputRef = useRef<HTMLInputElement>(null);

  // New collection form
  const [newCollection, setNewCollection] = useState({
    name: "",
    title: "",
    subtitle: "",
    emoji: "",
  });

  const handleCreateCollection = () => {
    if (!newCollection.name || !newCollection.title) {
      toast.error("Name and title are required");
      return;
    }

    startTransition(async () => {
      const result = await createCuratedCollection({
        name: newCollection.name,
        title: newCollection.emoji
          ? `${newCollection.emoji} ${newCollection.title}`
          : newCollection.title,
        subtitle: newCollection.subtitle || undefined,
        emoji: newCollection.emoji || undefined,
        movies: [],
        showOnSearch: true,
      });

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Collection created!");
        setNewCollection({ name: "", title: "", subtitle: "", emoji: "" });
        setIsCreating(false);
        router.refresh();
      }
    });
  };

  const handleToggleActive = (collection: CuratedCollection) => {
    startTransition(async () => {
      const result = await updateCuratedCollection(collection.id, {
        isActive: !collection.is_active,
      });

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(collection.is_active ? "Collection hidden" : "Collection visible");
        router.refresh();
      }
    });
  };

  const handleDeleteCollection = (id: string) => {
    startTransition(async () => {
      const result = await deleteCuratedCollection(id);

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Collection deleted");
        router.refresh();
      }
    });
  };

  const handleMoveUp = (collection: CuratedCollection, index: number) => {
    if (index === 0) return;

    const prevCollection = collections[index - 1];
    startTransition(async () => {
      await Promise.all([
        updateCuratedCollection(collection.id, { displayOrder: prevCollection.display_order }),
        updateCuratedCollection(prevCollection.id, { displayOrder: collection.display_order }),
      ]);
      router.refresh();
    });
  };

  const handleMoveDown = (collection: CuratedCollection, index: number) => {
    if (index === collections.length - 1) return;

    const nextCollection = collections[index + 1];
    startTransition(async () => {
      await Promise.all([
        updateCuratedCollection(collection.id, { displayOrder: nextCollection.display_order }),
        updateCuratedCollection(nextCollection.id, { displayOrder: collection.display_order }),
      ]);
      router.refresh();
    });
  };

  const handleSearchMovies = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/tmdb/search?query=${encodeURIComponent(searchQuery)}&type=movie`
      );
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch {
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMovie = (collectionId: string, movie: TMDBSearchResult) => {
    const curatedMovie: CuratedMovie = {
      tmdbId: movie.id,
      title: movie.title,
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : 0,
      posterPath: movie.poster_path,
      overview: movie.overview,
    };

    startTransition(async () => {
      const result = await addMovieToCollection(collectionId, curatedMovie);

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Added "${movie.title}"`);
        router.refresh();
      }
    });
  };

  const handleRemoveMovie = (collectionId: string, tmdbId: number, title: string) => {
    startTransition(async () => {
      const result = await removeMovieFromCollection(collectionId, tmdbId);

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Removed "${title}"`);
        router.refresh();
      }
    });
  };

  const handleMoveMovieInCollection = (
    collectionId: string,
    movieIndex: number,
    direction: "up" | "down"
  ) => {
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) return;

    const newIndex = direction === "up" ? movieIndex - 1 : movieIndex + 1;
    if (newIndex < 0 || newIndex >= collection.movies.length) return;

    // Create a new array with swapped movies
    const newMovies = [...collection.movies];
    const temp = newMovies[movieIndex];
    newMovies[movieIndex] = newMovies[newIndex];
    newMovies[newIndex] = temp;

    startTransition(async () => {
      const result = await updateCuratedCollection(collectionId, { movies: newMovies });

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        // Update local state immediately for better UX
        setCollections((prev) =>
          prev.map((c) => (c.id === collectionId ? { ...c, movies: newMovies } : c))
        );
      }
    });
  };

  const handleUpdateCollection = (
    collection: CuratedCollection,
    updates: Parameters<typeof updateCuratedCollection>[1]
  ) => {
    startTransition(async () => {
      const result = await updateCuratedCollection(collection.id, updates);

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Collection updated");
        setEditingCollection(null);
        router.refresh();
      }
    });
  };

  const handleRefreshAllPosters = () => {
    startTransition(async () => {
      const result = await refreshAllCollectionPosters();

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Refreshed ${result.collections} collection(s): ${result.updated} posters updated, ${result.failed} failed`
        );
        router.refresh();
      }
    });
  };

  const handleRefreshCollectionPosters = (collectionId: string, collectionName: string) => {
    startTransition(async () => {
      const result = await refreshCollectionPosters(collectionId);

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Refreshed "${collectionName}": ${result.updated} posters updated, ${result.failed} failed`
        );
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Create New Collection */}
      <Card className="bg-[var(--surface-1)] border-[var(--border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="w-5 h-5 text-[var(--primary)]" weight="bold" />
            Create Collection
          </CardTitle>
          <CardDescription>
            Create a new curated movie collection for the search page
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isCreating ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Collection Name</Label>
                  <Input
                    placeholder="e.g., Holiday Favorites"
                    value={newCollection.name}
                    onChange={(e) =>
                      setNewCollection((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Emoji (optional)</Label>
                  <Input
                    placeholder="🎄"
                    value={newCollection.emoji}
                    onChange={(e) =>
                      setNewCollection((prev) => ({ ...prev, emoji: e.target.value }))
                    }
                    className="w-24"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Display Title</Label>
                <Input
                  placeholder="Holiday\nFavorites (use \\n for line breaks)"
                  value={newCollection.title}
                  onChange={(e) => setNewCollection((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Subtitle (optional)</Label>
                <Input
                  placeholder="Staff picks for the season"
                  value={newCollection.subtitle}
                  onChange={(e) =>
                    setNewCollection((prev) => ({ ...prev, subtitle: e.target.value }))
                  }
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateCollection} disabled={isPending}>
                  <FloppyDisk className="w-4 h-4 mr-2" weight="fill" />
                  Create Collection
                </Button>
                <Button variant="ghost" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-2" weight="bold" />
              New Collection
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Existing Collections */}
      <Card className="bg-[var(--surface-1)] border-[var(--border)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FilmStrip className="w-5 h-5 text-[var(--primary)]" weight="fill" />
              Collections
              <Badge variant="secondary">{collections.length}</Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAllPosters}
              disabled={isPending || collections.length === 0}
              className="gap-1.5"
            >
              <ArrowsClockwise className={cn("w-4 h-4", isPending && "animate-spin")} />
              Refresh All Posters
            </Button>
          </div>
          <CardDescription>Refresh posters to update any broken TMDB images</CardDescription>
        </CardHeader>
        <CardContent>
          {collections.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)]">
              <FilmStrip className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No collections yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {collections.map((collection, index) => (
                <div
                  key={collection.id}
                  className={cn(
                    "p-4 rounded-xl border transition-all",
                    collection.is_active
                      ? "bg-[var(--surface-2)] border-[var(--border)]"
                      : "bg-[var(--surface-1)] border-[var(--border)]/50 opacity-60"
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {collection.name}
                        </span>
                        {collection.emoji && <span className="text-lg">{collection.emoji}</span>}
                        <Badge variant="outline" className="text-xs">
                          {collection.movies.length} movies
                        </Badge>
                        {!collection.is_active && (
                          <Badge variant="outline" className="text-xs text-[var(--text-muted)]">
                            Hidden
                          </Badge>
                        )}
                      </div>
                      {collection.subtitle && (
                        <p className="text-sm text-[var(--text-muted)]">{collection.subtitle}</p>
                      )}

                      {/* Movie thumbnails */}
                      <div className="flex gap-1 mt-3 overflow-x-auto pb-2">
                        {collection.movies.slice(0, 8).map((movie) => (
                          <div key={movie.tmdbId} className="relative group flex-shrink-0">
                            <div className="w-16 h-24 sm:w-12 sm:h-[72px] rounded overflow-hidden bg-[var(--surface-1)]">
                              {movie.posterPath ? (
                                <Image
                                  src={`https://image.tmdb.org/t/p/w92${movie.posterPath}`}
                                  alt={movie.title}
                                  width={64}
                                  height={96}
                                  className="object-cover w-full h-full"
                                  placeholder="blur"
                                  blurDataURL={getTMDBBlurDataURL()}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[8px] text-[var(--text-muted)]">
                                  No img
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() =>
                                handleRemoveMovie(collection.id, movie.tmdbId, movie.title)
                              }
                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--error)] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              disabled={isPending}
                            >
                              <X className="w-2.5 h-2.5" weight="bold" />
                            </button>
                          </div>
                        ))}
                        {collection.movies.length > 8 && (
                          <button
                            onClick={() => setManagingCollectionId(collection.id)}
                            className="w-16 h-24 sm:w-12 sm:h-[72px] rounded bg-[var(--surface-1)] flex items-center justify-center text-xs text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                            title="Click to manage all movies"
                          >
                            +{collection.movies.length - 8}
                          </button>
                        )}

                        {/* Add movie button */}
                        <button
                          onClick={() => setSelectedCollectionForAdd(collection.id)}
                          className="w-16 h-24 sm:w-12 sm:h-[72px] rounded border-2 border-dashed border-[var(--border)] flex items-center justify-center hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors"
                        >
                          <Plus className="w-4 h-4 text-[var(--text-muted)]" />
                        </button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 self-end sm:self-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveUp(collection, index)}
                        disabled={isPending || index === 0}
                        className="h-8 w-8 p-0"
                        title="Move up"
                      >
                        <CaretUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveDown(collection, index)}
                        disabled={isPending || index === collections.length - 1}
                        className="h-8 w-8 p-0"
                        title="Move down"
                      >
                        <CaretDown className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleRefreshCollectionPosters(collection.id, collection.name)
                        }
                        disabled={isPending}
                        className="h-8 w-8 p-0"
                        title="Refresh posters from TMDB"
                      >
                        <ArrowsClockwise className={cn("w-4 h-4", isPending && "animate-spin")} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCollection(collection)}
                        disabled={isPending}
                        className="h-8 w-8 p-0"
                        title="Edit collection"
                      >
                        <PencilSimple className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(collection)}
                        disabled={isPending}
                        className="h-8 w-8 p-0"
                        title={collection.is_active ? "Hide collection" : "Show collection"}
                      >
                        {collection.is_active ? (
                          <EyeSlash className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-[var(--error)] hover:text-[var(--error)] hover:bg-[var(--destructive)]/10"
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Collection</AlertDialogTitle>
                            <AlertDialogDescription>
                              Delete "{collection.name}"? This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteCollection(collection.id)}
                              className="bg-[var(--error)] hover:opacity-90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Movie Dialog */}
      <Dialog
        open={!!selectedCollectionForAdd}
        onOpenChange={(open) => !open && setSelectedCollectionForAdd(null)}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Movie to Collection</DialogTitle>
            <DialogDescription>Search for a movie to add</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                ref={addMovieInputRef as React.Ref<HTMLInputElement>}
                placeholder="Search movies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchMovies()}
                className="search-input-debossed"
              />
              <Button onClick={handleSearchMovies} disabled={isSearching}>
                <MagnifyingGlass className="w-4 h-4" />
              </Button>
            </div>

            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {searchResults.map((movie) => (
                  <div
                    key={movie.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-1)] transition-colors"
                  >
                    <div className="w-10 h-15 rounded overflow-hidden bg-[var(--surface-1)] flex-shrink-0">
                      {movie.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                          alt={movie.title}
                          width={40}
                          height={60}
                          className="object-cover"
                          placeholder="blur"
                          blurDataURL={getTMDBBlurDataURL()}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px]">
                          No img
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{movie.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {movie.release_date ? new Date(movie.release_date).getFullYear() : "N/A"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() =>
                        selectedCollectionForAdd && handleAddMovie(selectedCollectionForAdd, movie)
                      }
                      disabled={isPending}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedCollectionForAdd(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Collection Dialog */}
      <Dialog
        open={!!editingCollection}
        onOpenChange={(open) => !open && setEditingCollection(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
          </DialogHeader>

          {editingCollection && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editingCollection.name}
                  onChange={(e) =>
                    setEditingCollection({ ...editingCollection, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Display Title</Label>
                <Textarea
                  value={editingCollection.title}
                  onChange={(e) =>
                    setEditingCollection({ ...editingCollection, title: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Subtitle</Label>
                <Input
                  value={editingCollection.subtitle || ""}
                  onChange={(e) =>
                    setEditingCollection({ ...editingCollection, subtitle: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Emoji</Label>
                <Input
                  value={editingCollection.emoji || ""}
                  onChange={(e) =>
                    setEditingCollection({ ...editingCollection, emoji: e.target.value })
                  }
                  className="w-24"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingCollection(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                editingCollection &&
                handleUpdateCollection(editingCollection, {
                  name: editingCollection.name,
                  title: editingCollection.title,
                  subtitle: editingCollection.subtitle,
                  emoji: editingCollection.emoji,
                })
              }
              disabled={isPending}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage All Movies Dialog */}
      <Dialog
        open={!!managingCollectionId}
        onOpenChange={(open) => !open && setManagingCollectionId(null)}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Manage Movies {managingCollection && `- ${managingCollection.name}`}
            </DialogTitle>
            <DialogDescription>
              {managingCollection?.movies.length || 0} movies in this collection. Drag to reorder.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px]">
            <div className="space-y-2 p-1">
              {managingCollection?.movies.map((movie, index) => (
                <div
                  key={movie.tmdbId}
                  className="flex items-center gap-3 p-2 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-1)] transition-colors"
                >
                  {/* Position number */}
                  <span className="text-sm font-medium text-[var(--text-muted)] w-6 text-center">
                    {index + 1}
                  </span>

                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() =>
                        managingCollectionId &&
                        handleMoveMovieInCollection(managingCollectionId, index, "up")
                      }
                      disabled={isPending || index === 0}
                      className="p-0.5 rounded hover:bg-[var(--surface-3)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Move up"
                    >
                      <CaretUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        managingCollectionId &&
                        handleMoveMovieInCollection(managingCollectionId, index, "down")
                      }
                      disabled={isPending || index === (managingCollection?.movies.length || 0) - 1}
                      className="p-0.5 rounded hover:bg-[var(--surface-3)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Move down"
                    >
                      <CaretDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Poster */}
                  <div className="w-10 h-15 rounded overflow-hidden bg-[var(--surface-1)] flex-shrink-0">
                    {movie.posterPath ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w92${movie.posterPath}`}
                        alt={movie.title}
                        width={40}
                        height={60}
                        className="object-cover"
                        placeholder="blur"
                        blurDataURL={getTMDBBlurDataURL()}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] text-[var(--text-muted)]">
                        No img
                      </div>
                    )}
                  </div>

                  {/* Movie info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate text-[var(--text-primary)]">
                      {movie.title}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">{movie.year || "N/A"}</p>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() =>
                      managingCollectionId &&
                      handleRemoveMovie(managingCollectionId, movie.tmdbId, movie.title)
                    }
                    className="p-1.5 rounded-full text-[var(--error)] hover:text-[var(--error)] hover:bg-[var(--destructive)]/10 transition-colors"
                    disabled={isPending}
                    title={`Remove ${movie.title}`}
                  >
                    <X className="w-4 h-4" weight="bold" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-row justify-between sm:justify-between">
            <Button
              variant="outline"
              onClick={() => {
                if (managingCollectionId) {
                  setSelectedCollectionForAdd(managingCollectionId);
                }
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Movie
            </Button>
            <Button variant="ghost" onClick={() => setManagingCollectionId(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

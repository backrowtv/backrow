"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MovieSearchInput } from "@/components/movies/MovieSearchInput";
import { MovieSearchResultItem } from "@/components/movies/MovieSearchResultItem";
import { useMovieSearch } from "@/hooks/useMovieSearch";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";
import {
  FilmReel,
  FileText,
  Plus,
  Trash,
  CircleNotch,
  CheckCircle,
  WarningCircle,
  XCircle,
  ArrowLeft,
  UploadSimple,
  CalendarBlank,
} from "@phosphor-icons/react";
import {
  importClubWatchHistory,
  searchMovieForImport,
  verifyTmdbId,
} from "@/app/actions/import-history";
import type { TMDBMovieSearchResult } from "@/lib/tmdb/client";

interface ImportMovie {
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  dateWatched: string;
  matchStatus: "verified" | "matched" | "ambiguous" | "manual";
}

type WizardStep = "choose" | "csv" | "manual" | "review";

interface ImportHistoryWizardProps {
  clubId: string;
  clubSlug: string;
}

export function ImportHistoryWizard({ clubId, clubSlug }: ImportHistoryWizardProps) {
  const [step, setStep] = useState<WizardStep>("choose");
  const [movies, setMovies] = useState<ImportMovie[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
  } | null>(null);

  const addMovie = useCallback((movie: ImportMovie) => {
    setMovies((prev) => {
      if (prev.some((m) => m.tmdbId === movie.tmdbId)) return prev;
      return [...prev, movie];
    });
  }, []);

  const removeMovie = useCallback((tmdbId: number) => {
    setMovies((prev) => prev.filter((m) => m.tmdbId !== tmdbId));
  }, []);

  const updateMovieDate = useCallback((tmdbId: number, date: string) => {
    setMovies((prev) => prev.map((m) => (m.tmdbId === tmdbId ? { ...m, dateWatched: date } : m)));
  }, []);

  const handleImport = async () => {
    if (movies.length === 0) return;
    setIsImporting(true);

    const result = await importClubWatchHistory(
      clubId,
      movies.map((m) => ({
        tmdbId: m.tmdbId,
        dateWatched: m.dateWatched || undefined,
      }))
    );

    setIsImporting(false);

    if ("error" in result) {
      alert(result.error);
      return;
    }

    setImportResult({ imported: result.imported, skipped: result.skipped });
  };

  if (importResult) {
    return (
      <div className="text-center py-12 space-y-4">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto" weight="fill" />
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Import Complete</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {importResult.imported} movie{importResult.imported !== 1 ? "s" : ""} imported
            {importResult.skipped > 0 && (
              <span> · {importResult.skipped} skipped (already in club history)</span>
            )}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => (window.location.href = `/club/${clubSlug}`)}
        >
          Back to Club
        </Button>
      </div>
    );
  }

  if (step === "choose") {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setStep("csv")}
          className="w-full flex items-center gap-3 p-4 rounded-lg border border-[var(--border)] transition-colors hover:bg-[var(--surface-1)] text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-[var(--text-muted)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)]">Import from CSV</p>
            <p className="text-xs text-[var(--text-muted)]">
              Upload or paste a list of movies with optional year, TMDB ID, and date watched
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStep("manual")}
          className="w-full flex items-center gap-3 p-4 rounded-lg border border-[var(--border)] transition-colors hover:bg-[var(--surface-1)] text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0">
            <Plus className="h-5 w-5 text-[var(--text-muted)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)]">Add Manually</p>
            <p className="text-xs text-[var(--text-muted)]">Search and add movies one at a time</p>
          </div>
        </button>
      </div>
    );
  }

  if (step === "csv") {
    return (
      <CSVImportStep
        movies={movies}
        addMovie={addMovie}
        removeMovie={removeMovie}
        onBack={() => setStep("choose")}
        onContinue={() => setStep("review")}
      />
    );
  }

  if (step === "manual") {
    return (
      <ManualAddStep
        movies={movies}
        addMovie={addMovie}
        removeMovie={removeMovie}
        updateMovieDate={updateMovieDate}
        onBack={() => setStep("choose")}
        onContinue={() => setStep("review")}
      />
    );
  }

  // Review step
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setStep("choose")}
          className="p-1.5 rounded-md hover:bg-[var(--surface-1)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--text-muted)]" />
        </button>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Review Import ({movies.length} movie{movies.length !== 1 ? "s" : ""})
        </h2>
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        These movies will be added to your club&apos;s watch history. This cannot be undone in bulk.
      </p>

      <div className="space-y-1 max-h-[400px] overflow-y-auto">
        {movies.map((movie) => (
          <div key={movie.tmdbId} className="flex items-center gap-3 p-2 rounded-lg">
            <div className="relative w-8 aspect-[2/3] rounded overflow-hidden flex-shrink-0 bg-[var(--surface-2)]">
              {movie.posterPath ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w200${movie.posterPath}`}
                  alt={movie.title}
                  fill
                  className="object-cover"
                  sizes="32px"
                  placeholder="blur"
                  blurDataURL={getTMDBBlurDataURL()}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FilmReel className="w-3 h-3 text-[var(--text-muted)]" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">
                {movie.title}
                {movie.year && (
                  <span className="text-[var(--text-muted)] font-normal"> ({movie.year})</span>
                )}
              </p>
              {movie.dateWatched && (
                <p className="text-xs text-[var(--text-muted)]">
                  Watched {new Date(movie.dateWatched).toLocaleDateString()}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeMovie(movie.tmdbId)}
              className="p-1 rounded hover:bg-[var(--surface-1)] transition-colors flex-shrink-0"
            >
              <Trash className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => setStep("choose")}>
          Add More
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleImport}
          isLoading={isImporting}
          disabled={movies.length === 0 || isImporting}
        >
          Import {movies.length} Movie{movies.length !== 1 ? "s" : ""}
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// CSV Import Step
// ============================================================

interface CSVRow {
  title: string;
  year?: number;
  tmdbId?: number;
  dateWatched?: string;
}

interface CSVMatch {
  row: CSVRow;
  status: "loading" | "verified" | "matched" | "ambiguous" | "not_found";
  results: Array<{ id: number; title: string; year: number | null; poster_path: string | null }>;
  selectedId: number | null;
}

function parseCSV(text: string): CSVRow[] {
  const lines = text.trim().split("\n");
  if (lines.length === 0) return [];

  const rows: CSVRow[] = [];

  // Detect if first line is a header
  const firstLine = lines[0].toLowerCase().trim();
  const hasHeader =
    firstLine.includes("title") ||
    firstLine.includes("movie") ||
    firstLine.includes("name") ||
    firstLine.includes("tmdb");
  const startIndex = hasHeader ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split by comma, respecting quoted fields
    const fields = splitCSVLine(line);
    const title = fields[0]?.trim().replace(/^["']|["']$/g, "");
    if (!title) continue;

    const row: CSVRow = { title };

    // Try to detect which columns are year, tmdb_id, date
    for (let j = 1; j < fields.length; j++) {
      const val = fields[j]?.trim().replace(/^["']|["']$/g, "");
      if (!val) continue;

      // 4-digit number between 1888-2030 is likely a year
      const num = parseInt(val, 10);
      if (/^\d{4}$/.test(val) && num >= 1888 && num <= 2030 && !row.year) {
        row.year = num;
      }
      // Larger numbers are TMDB IDs
      else if (/^\d+$/.test(val) && num > 2030 && !row.tmdbId) {
        row.tmdbId = num;
      }
      // Date-like strings
      else if (/\d{4}-\d{2}-\d{2}/.test(val) || /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(val)) {
        const parsed = new Date(val);
        if (!isNaN(parsed.getTime())) {
          row.dateWatched = parsed.toISOString();
        }
      }
    }

    rows.push(row);
  }

  return rows;
}

function splitCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

function CSVImportStep({
  movies,
  addMovie,
  removeMovie,
  onBack,
  onContinue,
}: {
  movies: ImportMovie[];
  addMovie: (m: ImportMovie) => void;
  removeMovie: (tmdbId: number) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [csvText, setCsvText] = useState("");
  const [matches, setMatches] = useState<CSVMatch[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasProcessed, setHasProcessed] = useState(false);

  const processCSV = async () => {
    const rows = parseCSV(csvText);
    if (rows.length === 0) return;

    setIsProcessing(true);
    setHasProcessed(true);

    // Initialize all matches as loading
    const initial: CSVMatch[] = rows.map((row) => ({
      row,
      status: "loading",
      results: [],
      selectedId: null,
    }));
    setMatches(initial);

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let match: Partial<CSVMatch>;

      if (row.tmdbId) {
        // Verify TMDB ID directly
        const result = await verifyTmdbId(row.tmdbId);
        if ("error" in result) {
          match = { status: "not_found", results: [], selectedId: null };
        } else {
          match = {
            status: "verified",
            results: [result],
            selectedId: result.id,
          };
        }
      } else {
        // Search by title + optional year
        const results = await searchMovieForImport(row.title, row.year);
        if ("error" in results || results.length === 0) {
          match = { status: "not_found", results: [], selectedId: null };
        } else if (results.length === 1) {
          match = {
            status: "matched",
            results,
            selectedId: results[0].id,
          };
        } else {
          // Check if the top result is a strong match (title matches closely)
          const topResult = results[0];
          const titleMatch =
            topResult.title.toLowerCase().trim() === row.title.toLowerCase().trim();
          if (titleMatch) {
            match = {
              status: "matched",
              results,
              selectedId: topResult.id,
            };
          } else {
            match = {
              status: "ambiguous",
              results,
              selectedId: null,
            };
          }
        }
      }

      setMatches((prev) => {
        const updated = [...prev];
        updated[i] = { ...updated[i], ...match };
        return updated;
      });
    }

    setIsProcessing(false);
  };

  const handleSelectMatch = (index: number, movieId: number) => {
    setMatches((prev) => {
      const updated = [...prev];
      const movie = updated[index].results.find((r) => r.id === movieId);
      if (movie) {
        updated[index] = {
          ...updated[index],
          selectedId: movieId,
          status: "matched",
        };
      }
      return updated;
    });
  };

  const handleAddAllMatched = () => {
    for (const match of matches) {
      if (match.selectedId && (match.status === "verified" || match.status === "matched")) {
        const movie = match.results.find((r) => r.id === match.selectedId);
        if (movie) {
          addMovie({
            tmdbId: movie.id,
            title: movie.title,
            year: movie.year,
            posterPath: movie.poster_path,
            dateWatched: match.row.dateWatched || "",
            matchStatus: match.status,
          });
        }
      }
    }
  };

  const alreadyAddedIds = new Set(movies.map((m) => m.tmdbId));
  const matchedCount = matches.filter(
    (m) =>
      m.selectedId &&
      (m.status === "verified" || m.status === "matched") &&
      !alreadyAddedIds.has(m.selectedId)
  ).length;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(event.target?.result as string);
      setHasProcessed(false);
      setMatches([]);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 rounded-md hover:bg-[var(--surface-1)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--text-muted)]" />
        </button>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Import from CSV</h2>
      </div>

      {!hasProcessed ? (
        <>
          <div className="space-y-2">
            <p className="text-xs text-[var(--text-muted)]">
              Paste or upload a CSV with columns: <strong>title</strong> (required), year, tmdb_id,
              date_watched (YYYY-MM-DD)
            </p>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`The Raid, 2011\nFearless, 2006\nDrunken Master, 1978, , 2025-09-20`}
              rows={8}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
              <UploadSimple className="w-4 h-4" />
              Upload CSV file
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={processCSV}
            disabled={!csvText.trim() || isProcessing}
          >
            {isProcessing ? "Processing..." : "Process CSV"}
          </Button>
        </>
      ) : (
        <>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {matches.map((match, index) => (
              <CSVMatchRow
                key={index}
                match={match}
                isAdded={match.selectedId ? alreadyAddedIds.has(match.selectedId) : false}
                onSelect={(movieId) => handleSelectMatch(index, movieId)}
                onAdd={() => {
                  if (!match.selectedId) return;
                  const movie = match.results.find((r) => r.id === match.selectedId);
                  if (movie) {
                    addMovie({
                      tmdbId: movie.id,
                      title: movie.title,
                      year: movie.year,
                      posterPath: movie.poster_path,
                      dateWatched: match.row.dateWatched || "",
                      matchStatus: match.status === "verified" ? "verified" : "matched",
                    });
                  }
                }}
                onRemove={() => {
                  if (match.selectedId) removeMovie(match.selectedId);
                }}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setHasProcessed(false);
                setMatches([]);
              }}
            >
              Edit CSV
            </Button>
            {matchedCount > 0 && (
              <Button type="button" variant="secondary" size="sm" onClick={handleAddAllMatched}>
                Add All Matched ({matchedCount})
              </Button>
            )}
            {movies.length > 0 && (
              <Button type="button" size="sm" onClick={onContinue}>
                Review ({movies.length})
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CSVMatchRow({
  match,
  isAdded,
  onSelect,
  onAdd,
  onRemove,
}: {
  match: CSVMatch;
  isAdded: boolean;
  onSelect: (movieId: number) => void;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const StatusIcon = {
    loading: () => <CircleNotch className="w-4 h-4 animate-spin text-[var(--text-muted)]" />,
    verified: () => <CheckCircle className="w-4 h-4 text-green-500" weight="fill" />,
    matched: () => <CheckCircle className="w-4 h-4 text-green-500" weight="fill" />,
    ambiguous: () => <WarningCircle className="w-4 h-4 text-yellow-500" weight="fill" />,
    not_found: () => <XCircle className="w-4 h-4 text-red-400" weight="fill" />,
  }[match.status];

  const selectedMovie = match.selectedId
    ? match.results.find((r) => r.id === match.selectedId)
    : null;

  return (
    <div className="border border-[var(--border)] rounded-lg p-2.5">
      <div className="flex items-center gap-2">
        <StatusIcon />
        <div className="flex-1 min-w-0">
          {selectedMovie ? (
            <p className="text-sm text-[var(--text-primary)] line-clamp-1">
              {selectedMovie.title}
              {selectedMovie.year && (
                <span className="text-[var(--text-muted)]"> ({selectedMovie.year})</span>
              )}
            </p>
          ) : (
            <p className="text-sm text-[var(--text-muted)] line-clamp-1">
              {match.row.title}
              {match.row.year && <span> ({match.row.year})</span>}
            </p>
          )}
          {match.status === "not_found" && <p className="text-xs text-red-400">No match found</p>}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {match.status === "ambiguous" && !isAdded && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-[var(--primary)] hover:underline px-1"
            >
              {expanded ? "Hide" : "Pick"}
            </button>
          )}
          {match.selectedId && !isAdded && (
            <button
              type="button"
              onClick={onAdd}
              className="p-1 rounded hover:bg-[var(--surface-1)] transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-[var(--primary)]" />
            </button>
          )}
          {isAdded && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1 rounded hover:bg-[var(--surface-1)] transition-colors"
            >
              <Trash className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </button>
          )}
        </div>
      </div>

      {expanded && match.status === "ambiguous" && (
        <div className="mt-2 space-y-0.5 pl-6">
          {match.results.slice(0, 5).map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={() => {
                onSelect(result.id);
                setExpanded(false);
              }}
              className="w-full flex items-center gap-2 p-1.5 rounded text-left hover:bg-[var(--surface-1)] transition-colors"
            >
              <div className="relative w-6 aspect-[2/3] rounded overflow-hidden flex-shrink-0 bg-[var(--surface-2)]">
                {result.poster_path ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w200${result.poster_path}`}
                    alt={result.title}
                    fill
                    className="object-cover"
                    sizes="24px"
                    placeholder="blur"
                    blurDataURL={getTMDBBlurDataURL()}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FilmReel className="w-2.5 h-2.5 text-[var(--text-muted)]" />
                  </div>
                )}
              </div>
              <span className="text-xs text-[var(--text-primary)] line-clamp-1">
                {result.title}
                {result.year && <span className="text-[var(--text-muted)]"> ({result.year})</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Manual Add Step
// ============================================================

function ManualAddStep({
  movies,
  addMovie,
  removeMovie,
  updateMovieDate,
  onBack,
  onContinue,
}: {
  movies: ImportMovie[];
  addMovie: (m: ImportMovie) => void;
  removeMovie: (tmdbId: number) => void;
  updateMovieDate: (tmdbId: number, date: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const { query, setQuery, results, isSearching, clear } = useMovieSearch({ maxResults: 6 });
  const addedIds = new Set(movies.map((m) => m.tmdbId));

  const handleSelect = (movie: TMDBMovieSearchResult) => {
    addMovie({
      tmdbId: movie.id,
      title: movie.title,
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
      posterPath: movie.poster_path,
      dateWatched: "",
      matchStatus: "manual",
    });
    clear();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 rounded-md hover:bg-[var(--surface-1)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--text-muted)]" />
        </button>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Add Movies</h2>
      </div>

      {/* Search */}
      <div className="space-y-1">
        <MovieSearchInput
          value={query}
          onChange={setQuery}
          isSearching={isSearching}
          placeholder="Search for a movie to add..."
        />
        {results.length > 0 && (
          <div className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--background)]">
            {results.map((movie) => (
              <MovieSearchResultItem
                key={movie.id}
                movie={movie}
                onSelect={handleSelect}
                alreadySelected={addedIds.has(movie.id)}
                compact
              />
            ))}
          </div>
        )}
      </div>

      {/* Added movies list */}
      {movies.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-[var(--text-muted)]">Added ({movies.length})</h3>
          <div className="space-y-1">
            {movies.map((movie) => (
              <div
                key={movie.tmdbId}
                className="flex items-center gap-2.5 p-2 rounded-lg border border-[var(--border)]"
              >
                <div className="relative w-8 aspect-[2/3] rounded overflow-hidden flex-shrink-0 bg-[var(--surface-2)]">
                  {movie.posterPath ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w200${movie.posterPath}`}
                      alt={movie.title}
                      fill
                      className="object-cover"
                      sizes="32px"
                      placeholder="blur"
                      blurDataURL={getTMDBBlurDataURL()}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FilmReel className="w-3 h-3 text-[var(--text-muted)]" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">
                    {movie.title}
                    {movie.year && (
                      <span className="text-[var(--text-muted)] font-normal"> ({movie.year})</span>
                    )}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <CalendarBlank className="w-3 h-3 text-[var(--text-muted)]" />
                    <Input
                      type="date"
                      value={movie.dateWatched}
                      onChange={(e) => updateMovieDate(movie.tmdbId, e.target.value)}
                      className="h-5 text-xs border-0 p-0 bg-transparent shadow-none focus-visible:ring-0 w-[120px] text-[var(--text-muted)]"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeMovie(movie.tmdbId)}
                  className="p-1 rounded hover:bg-[var(--surface-1)] transition-colors flex-shrink-0"
                >
                  <Trash className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {movies.length > 0 && (
        <Button type="button" size="sm" onClick={onContinue}>
          Review ({movies.length})
        </Button>
      )}
    </div>
  );
}

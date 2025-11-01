"use server";

import { createClient } from "@/lib/supabase/server";
import { handleActionError } from "@/lib/errors/handler";
import { processLetterboxdImport, type LetterboxdCsvRow } from "@/lib/letterboxd/import";
import Papa from "papaparse";
import type { ImportLetterboxdDataResult } from "./letterboxd-import.types";

/**
 * Import Letterboxd data from CSV file
 */
export async function importLetterboxdData(
  formData: FormData
): Promise<ImportLetterboxdDataResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be signed in" };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  // Validate file type
  if (!file.name.endsWith(".csv")) {
    return { success: false, error: "File must be a CSV file" };
  }

  // Validate file size (max 10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: "File size must be less than 10MB" };
  }

  try {
    // Read file content
    const fileContent = await file.text();

    // Parse CSV
    const parseResult = Papa.parse<LetterboxdCsvRow>(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        // Normalize header names (case-insensitive)
        const normalized = header.trim();
        const headerMap: Record<string, string> = {
          letterboxduri: "LetterboxdURI",
          tmdbid: "tmdbID",
          tmdb_id: "tmdbID",
          imdbid: "imdbID",
          imdb_id: "imdbID",
          title: "Title",
          year: "Year",
          rating: "Rating",
          watcheddate: "WatchedDate",
          watched_date: "WatchedDate",
          date: "WatchedDate",
        };
        return headerMap[normalized.toLowerCase()] || normalized;
      },
    });

    if (parseResult.errors.length > 0) {
      console.error("CSV parsing errors:", parseResult.errors);
      // Continue anyway if we have some data
      if (parseResult.data.length === 0) {
        return {
          success: false,
          error: `Failed to parse CSV: ${parseResult.errors[0].message}`,
        };
      }
    }

    // Validate required columns
    const requiredColumns = ["Title"];
    const firstRow = parseResult.data[0];
    const hasRequiredColumns = requiredColumns.every((col) => {
      return firstRow && firstRow[col as keyof LetterboxdCsvRow] !== undefined;
    });

    if (!hasRequiredColumns) {
      return {
        success: false,
        error: 'CSV must contain at least a "Title" column',
      };
    }

    // Process import
    const result = await processLetterboxdImport(parseResult.data, user.id);

    return {
      success: true,
      result,
    };
  } catch (error) {
    return {
      success: false,
      ...handleActionError(error, "importLetterboxdData"),
    };
  }
}

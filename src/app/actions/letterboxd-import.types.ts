import type { ImportResult } from "@/lib/letterboxd/import";

export interface ImportLetterboxdDataResult {
  success: boolean;
  result?: ImportResult;
  error?: string;
}

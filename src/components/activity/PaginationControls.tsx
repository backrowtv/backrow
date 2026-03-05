"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CaretDoubleLeft,
  CaretDoubleRight,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react/dist/ssr";

const DEFAULT_PAGE_SIZE_OPTIONS = [15, 25, 50, 100];

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  /** Base URL path without pagination params (e.g., "/activity") */
  basePath: string;
  /** Current filter params to preserve when navigating (as query string) */
  filterParams?: string;
  /** Custom page size options (default: [15, 25, 50, 100]) */
  pageSizeOptions?: number[];
}

export function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  basePath,
  filterParams,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: PaginationControlsProps) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState(currentPage.toString());

  // Sync input value when currentPage changes (e.g., from URL navigation)
  useEffect(() => {
    setInputValue(currentPage.toString());
  }, [currentPage]);

  /**
   * Build URL with page and size params, preserving filter params
   */
  const buildUrl = (page: number, size: number = pageSize): string => {
    const params = new URLSearchParams(filterParams || "");

    // Set pagination params
    if (page > 1) {
      params.set("page", page.toString());
    } else {
      params.delete("page");
    }

    if (size !== pageSizeOptions[0]) {
      params.set("size", size.toString());
    } else {
      params.delete("size");
    }

    const queryString = params.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    router.push(buildUrl(page), { scroll: false });
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers
    const value = e.target.value.replace(/[^0-9]/g, "");
    setInputValue(value);
  };

  const handlePageInputSubmit = () => {
    const page = parseInt(inputValue, 10);
    if (isNaN(page) || page < 1) {
      setInputValue(currentPage.toString());
      return;
    }
    if (page > totalPages) {
      goToPage(totalPages);
      return;
    }
    goToPage(page);
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handlePageInputSubmit();
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    // Reset to page 1 when changing page size
    router.push(buildUrl(1, newSize), { scroll: false });
  };

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage >= totalPages;

  // Don't render if there's only one page and default page size
  if (totalPages <= 1 && pageSize === pageSizeOptions[0]) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
      {/* Navigation Buttons */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        {/* First Page */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => goToPage(1)}
          disabled={isFirstPage}
          className="h-8 w-8 p-0"
          title="First page"
        >
          <CaretDoubleLeft className="h-4 w-4" />
          <span className="sr-only">First page</span>
        </Button>

        {/* Previous Page */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => goToPage(currentPage - 1)}
          disabled={isFirstPage}
          className="h-8 w-8 p-0"
          title="Previous page"
        >
          <CaretLeft className="h-4 w-4" />
          <span className="sr-only">Previous page</span>
        </Button>
      </div>

      {/* Page Input */}
      <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
        <span className="hidden sm:inline">Page</span>
        <Input
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={handlePageInputChange}
          onBlur={handlePageInputSubmit}
          onKeyDown={handlePageInputKeyDown}
          className="h-8 w-12 text-center px-1 text-sm"
          aria-label="Page number"
        />
        <span className="whitespace-nowrap">of {totalPages}</span>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        {/* Next Page */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => goToPage(currentPage + 1)}
          disabled={isLastPage}
          className="h-8 w-8 p-0"
          title="Next page"
        >
          <CaretRight className="h-4 w-4" />
          <span className="sr-only">Next page</span>
        </Button>

        {/* Last Page */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => goToPage(totalPages)}
          disabled={isLastPage}
          className="h-8 w-8 p-0"
          title="Last page"
        >
          <CaretDoubleRight className="h-4 w-4" />
          <span className="sr-only">Last page</span>
        </Button>
      </div>

      {/* Page Size Selector - native select */}
      <div className="flex items-center gap-1.5 ml-2 sm:ml-4">
        <select
          value={pageSize.toString()}
          onChange={handlePageSizeChange}
          className="h-8 px-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-primary)] cursor-pointer hover:border-[var(--border-hover)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)] transition-colors"
          aria-label="Items per page"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size.toString()}>
              {size}
            </option>
          ))}
        </select>
        <span className="hidden sm:inline text-xs text-[var(--text-muted)]">per page</span>
      </div>

      {/* Item count indicator */}
      {totalItems > 0 && (
        <span className="hidden md:inline text-xs text-[var(--text-muted)] ml-2">
          ({totalItems} total)
        </span>
      )}
    </div>
  );
}

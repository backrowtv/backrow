"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SortAscending, Check } from "@phosphor-icons/react";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "members", label: "Most Members" },
  { value: "festivals", label: "Most Festivals" },
  { value: "movies", label: "Most Movies" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export function DiscoverSortDropdown() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = (searchParams.get("sort") as SortValue) || "newest";

  const handleSort = useCallback(
    (sort: SortValue) => {
      const params = new URLSearchParams(searchParams.toString());
      if (sort === "newest") {
        params.delete("sort");
      } else {
        params.set("sort", sort);
      }
      router.push(`/discover?${params.toString()}`);
    },
    [router, searchParams]
  );

  const currentLabel = SORT_OPTIONS.find((o) => o.value === currentSort)?.label || "Newest";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          <SortAscending className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{currentLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {SORT_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleSort(option.value)}
            className="text-xs flex items-center justify-between"
          >
            {option.label}
            {currentSort === option.value && (
              <Check className="w-3.5 h-3.5 text-[var(--primary)]" weight="bold" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

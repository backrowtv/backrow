"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { DiscussionThreadList, CreateThreadModal } from "@/components/discussions";
import type { DiscussionThread, DiscussionTagType, SpoilerState } from "@/app/actions/discussions";

interface DiscussClientProps {
  threads: DiscussionThread[];
  spoilerStates: Record<string, SpoilerState>;
  clubId: string;
  clubSlug: string;
  currentUserId: string;
  activeFilter: DiscussionTagType | "all";
  isEndlessFestival: boolean;
}

export function DiscussClient({
  threads,
  spoilerStates,
  clubId,
  clubSlug,
  currentUserId,
  activeFilter,
  isEndlessFestival,
}: DiscussClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [showCreateModal, setShowCreateModal] = useState(false);

  // Handle filter change — update URL and reset to page 1
  const handleFilterChange = (filter: DiscussionTagType | "all") => {
    const params = new URLSearchParams(searchParams.toString());
    if (filter === "all") {
      params.delete("filter");
    } else {
      params.set("filter", filter);
    }
    params.delete("page"); // Reset to page 1 on filter change
    const queryString = params.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ""}`, { scroll: false });
  };

  return (
    <>
      <DiscussionThreadList
        threads={threads}
        spoilerStates={spoilerStates}
        clubSlug={clubSlug}
        currentUserId={currentUserId}
        onCreateThread={() => setShowCreateModal(true)}
        emptyMessage="No discussions yet. Be the first to start a conversation!"
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        showFilterBar={true}
        isEndlessFestival={isEndlessFestival}
      />

      <CreateThreadModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        clubId={clubId}
        clubSlug={clubSlug}
      />
    </>
  );
}

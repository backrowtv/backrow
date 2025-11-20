import { Skeleton } from "@/components/ui/skeleton";

export default function NominationsLoading() {
  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Header - Hidden on mobile since TopNav shows "Profile" */}
        <div className="hidden lg:block mb-6">
          <Skeleton className="h-5 w-28 mb-1" />
          <Skeleton className="h-3 w-56" />
        </div>

        {/* Suspense fallback matches: <Skeleton className="h-48 w-full rounded-lg" /> */}
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    </div>
  );
}

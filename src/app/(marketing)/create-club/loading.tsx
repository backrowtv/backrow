import { Skeleton } from "@/components/ui/skeleton";

export default function CreateClubLoading() {
  return (
    <div className="relative" style={{ backgroundColor: "var(--background)" }}>
      {/* Content - matches pt-16 sm:pt-24 pb-12 px-4 sm:px-6 */}
      <div className="relative z-10 pt-16 sm:pt-24 pb-12 px-4 sm:px-6">
        <div className="max-w-xl mx-auto">
          {/* ClubCreationWizard skeleton */}
          <div className="rounded-lg bg-[var(--surface-1)] p-6 space-y-6">
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-2 w-8 rounded-full" />
              ))}
            </div>

            {/* Step title */}
            <Skeleton className="h-7 w-48 mx-auto" />
            <Skeleton className="h-4 w-72 mx-auto" />

            {/* Club name field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>

            {/* Description field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-24 w-full rounded-md" />
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between pt-4">
              <Skeleton className="h-10 w-24 rounded-md" />
              <Skeleton className="h-10 w-24 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

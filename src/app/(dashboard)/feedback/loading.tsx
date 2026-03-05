import { Skeleton } from "@/components/ui/skeleton";

export default function FeedbackLoading() {
  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-2xl mx-auto px-4 lg:px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <Skeleton className="h-7 w-28 mb-2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-64 mt-1" />
        </div>

        {/* Tabs */}
        <div className="mb-4">
          <div className="w-full grid grid-cols-2 h-10 bg-[var(--surface-1)] rounded-lg p-1">
            <Skeleton className="h-full rounded-md" />
            <Skeleton className="h-full rounded-md" />
          </div>
        </div>

        {/* Content */}
        <div
          className="rounded-lg border"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-1)" }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-8 rounded-full" />
              </div>
              <Skeleton className="h-7 w-24 rounded-md" />
            </div>
          </div>

          {/* Items */}
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-3 py-3">
                <div className="flex items-start gap-3">
                  {/* Vote button */}
                  <div className="flex flex-col items-center gap-0.5 px-2 py-1">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-3 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-full mt-2" />
                    <Skeleton className="h-3 w-3/4 mt-1" />
                    <div className="flex items-center gap-2 mt-2">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add form */}
          <div className="border-t px-3 py-3" style={{ borderColor: "var(--border)" }}>
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        </div>

        {/* Guidelines */}
        <div
          className="mt-8 p-4 rounded-lg border"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-1)" }}
        >
          <Skeleton className="h-4 w-40 mb-2" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export default function BlogLoading() {
  return (
    <>
      {/* Section: variant="default" fullWidth -> py-8 md:py-12 w-full */}
      <section className="py-8 md:py-12 w-full">
        {/* Container: size="md" -> max-w-4xl, className="p-6 md:p-8" */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 p-6 md:p-8">
          {/* Header */}
          <div className="mb-6">
            <Skeleton className="h-7 w-32 mb-2" />
            <Skeleton className="h-5 w-96 max-w-full" />
          </div>

          {/* Empty state card */}
          <div className="space-y-6 md:space-y-8">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)]">
              <div className="p-6">
                <div className="flex flex-col items-center text-center py-8">
                  <Skeleton className="h-12 w-12 rounded-full mb-4" />
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-80 max-w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

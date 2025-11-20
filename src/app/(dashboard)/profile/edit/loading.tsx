import { Skeleton } from "@/components/ui/skeleton";

export default function EditProfileLoading() {
  return (
    <>
      {/* Section: variant="default" fullWidth -> py-8 md:py-12 w-full */}
      <section className="py-8 md:py-12 w-full">
        {/* Container: size="md" -> max-w-4xl, className="p-6 md:p-8" */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 p-6 md:p-8">
          {/* Header */}
          <div className="mb-6">
            <div className="mb-4">
              <Skeleton className="h-7 w-28" />
            </div>
            <Skeleton className="h-4 w-44" />
          </div>

          {/* ProfileEditForm skeleton */}
          <div className="space-y-6">
            {/* Profile Picture section header */}
            <div>
              <Skeleton className="h-2.5 w-28 mb-3" />
              {/* AvatarEditor placeholder */}
              <div className="flex items-center gap-4">
                <Skeleton className="w-20 h-20 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-24 rounded-md" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            </div>

            {/* Display Name field */}
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>

            {/* Username field */}
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>

            {/* Bio field (taller) */}
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-12" />
              <Skeleton className="h-24 w-full rounded-md" />
            </div>

            {/* Submit button */}
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
        </div>
      </section>
    </>
  );
}

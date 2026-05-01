import { Skeleton } from "@/components/ui/skeleton";

export default function SignInLoading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="w-full max-w-[450px]">
        <div className="rounded-lg bg-[var(--surface-1)]">
          {/* CardHeader */}
          <div className="text-center space-y-1 px-4 sm:px-6 pt-5 pb-2">
            <Skeleton className="h-7 w-40 mx-auto" />
            <Skeleton className="h-4 w-52 mx-auto" />
          </div>

          {/* CardContent */}
          <div className="px-4 sm:px-6 pb-5 space-y-3">
            {/* OAuth buttons */}
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1 rounded-md" />
              <Skeleton className="h-9 flex-1 rounded-md" />
            </div>

            {/* Separator */}
            <div className="relative py-1">
              <Skeleton className="h-px w-full" />
            </div>

            {/* Email field */}
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3 w-28" />
            </div>

            {/* Sign In button */}
            <Skeleton className="h-9 w-full rounded-md" />

            {/* Email link button */}
            <Skeleton className="h-9 w-full rounded-md" />

            {/* Footer link */}
            <Skeleton className="h-3 w-40 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

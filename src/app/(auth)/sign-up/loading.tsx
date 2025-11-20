import { Skeleton } from "@/components/ui/skeleton";

export default function SignUpLoading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="w-full max-w-sm">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)]">
          {/* CardHeader */}
          <div className="text-center space-y-1 p-6 pb-2">
            <Skeleton className="h-6 w-32 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>

          {/* CardContent */}
          <div className="p-6 pt-2 space-y-3">
            {/* "Sign up with" text */}
            <Skeleton className="h-3 w-16 mx-auto" />

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

            {/* Username field */}
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>

            {/* Agreement checkboxes */}
            <div className="space-y-2 pt-1">
              <div className="flex items-start gap-2.5">
                <Skeleton className="h-4 w-4 rounded mt-0.5" />
                <Skeleton className="h-3 w-52" />
              </div>
              <div className="flex items-start gap-2.5">
                <Skeleton className="h-4 w-4 rounded mt-0.5" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>

            {/* Create Account button */}
            <Skeleton className="h-9 w-full rounded-md" />

            {/* Footer link */}
            <Skeleton className="h-3 w-48 mx-auto" />
          </div>
        </div>

        {/* Terms text below card */}
        <div className="mt-6 text-center">
          <Skeleton className="h-3 w-72 mx-auto" />
        </div>
      </div>
    </div>
  );
}

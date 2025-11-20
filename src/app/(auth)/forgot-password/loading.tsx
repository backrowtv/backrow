import { Skeleton } from "@/components/ui/skeleton";

export default function ForgotPasswordLoading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="w-full max-w-[450px] rounded-lg border border-[var(--border)] bg-[var(--surface-1)]">
        {/* CardHeader - text-center space-y-2 */}
        <div className="text-center space-y-2 p-6">
          <Skeleton className="h-12 w-12 mx-auto rounded-full" />
          <Skeleton className="h-7 w-48 mx-auto" />
          <Skeleton className="h-4 w-72 mx-auto" />
        </div>
        {/* CardContent */}
        <div className="p-6 pt-0 space-y-4">
          {/* Email field */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          {/* Submit button */}
          <Skeleton className="h-10 w-full rounded-md" />
          {/* Back to sign in link */}
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    </div>
  );
}

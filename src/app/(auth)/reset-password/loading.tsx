import { Skeleton } from "@/components/ui/skeleton";

export default function ResetPasswordLoading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="w-full max-w-[450px] rounded-lg border border-[var(--border)] bg-[var(--surface-1)]">
        {/* CardHeader - text-center space-y-2 */}
        <div className="text-center space-y-2 p-6">
          <Skeleton className="h-12 w-12 mx-auto rounded-full" />
          <Skeleton className="h-7 w-40 mx-auto" />
          <Skeleton className="h-4 w-56 mx-auto" />
        </div>
        {/* CardContent */}
        <div className="p-6 pt-0 space-y-4">
          {/* New password field */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          {/* Confirm password field */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          {/* Submit button */}
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}

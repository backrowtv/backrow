import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { ClubActivityFeed, ClubActivityFeedSkeleton } from "./ClubActivityFeed";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

async function getUserInfo() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return { id: user.id };
}

export async function HomeFeed() {
  const userInfo = await getUserInfo();

  if (!userInfo) {
    return null;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
          Recent Activity
        </h2>
        <Link
          href="/activity"
          className="flex items-center gap-0.5 text-sm text-[var(--primary)] transition-colors"
        >
          All
          <CaretRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Activity Feed - limited to 5 items on home page */}
      <Suspense fallback={<ClubActivityFeedSkeleton />}>
        <ClubActivityFeed userId={userInfo.id} limit={5} />
      </Suspense>
    </div>
  );
}

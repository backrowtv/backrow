import { Trophy } from "@phosphor-icons/react/dist/ssr";
import { getUserBadges } from "@/app/actions/badges";
import { BadgeDisplay } from "./BadgeDisplay";
import { EmptyState } from "@/components/shared/EmptyState";
import { Heading } from "@/components/ui/typography";

interface DisplayCaseBadgesProps {
  userId: string;
  clubId?: string;
}

export async function DisplayCaseBadges({ userId, clubId }: DisplayCaseBadgesProps) {
  const badgesResult = await getUserBadges(userId, clubId);

  if ("error" in badgesResult) {
    return (
      <div className="p-6 rounded-xl border border-[var(--border)]">
        <p className="text-sm text-[var(--destructive)]">{badgesResult.error}</p>
      </div>
    );
  }

  const badges = badgesResult.data || [];

  if (badges.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No badges yet"
        message="Complete milestones to earn badges and achievements."
        variant="card"
      />
    );
  }

  // Separate earned and in-progress badges
  const earnedBadges = badges.filter((b) => b.earned_at);
  const inProgressBadges = badges.filter((b) => !b.earned_at);

  return (
    <div className="space-y-6">
      {earnedBadges.length > 0 && (
        <div>
          <Heading level={3} className="mb-4">
            Earned Badges
          </Heading>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
            {earnedBadges.map((userBadge) => (
              <BadgeDisplay
                key={`${userBadge.badge_id}-${userBadge.club_id || "site"}`}
                badge={userBadge.badge}
                earned={true}
                size="md"
              />
            ))}
          </div>
        </div>
      )}

      {inProgressBadges.length > 0 && (
        <div>
          <Heading level={3} className="mb-4">
            In Progress
          </Heading>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
            {inProgressBadges.map((userBadge) => {
              const progress = userBadge.progress_jsonb as {
                current?: number;
                target?: number;
              } | null;

              return (
                <BadgeDisplay
                  key={`${userBadge.badge_id}-${userBadge.club_id || "site"}`}
                  badge={userBadge.badge}
                  earned={false}
                  progress={
                    progress?.current && progress?.target
                      ? {
                          current: progress.current,
                          target: progress.target,
                          progress: (progress.current / progress.target) * 100,
                        }
                      : undefined
                  }
                  showProgress={true}
                  size="md"
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

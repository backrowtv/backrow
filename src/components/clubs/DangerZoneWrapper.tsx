"use client";

import { DangerZoneSection } from "@/components/shared/DangerZoneSection";
import { ArchiveClubButton } from "./ArchiveClubButton";
import { DeleteClubButton } from "./DeleteClubButton";
import { Text } from "@/components/ui/typography";

interface DangerZoneWrapperProps {
  clubId: string;
  clubName: string;
  archived: boolean;
}

export function DangerZoneWrapper({ clubId, clubName, archived }: DangerZoneWrapperProps) {
  return (
    <DangerZoneSection description="Archive and delete club">
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <Text size="sm" className="font-medium">
              Archive Club
            </Text>
            <Text size="sm" muted>
              Hide from most views. Can be reversed.
            </Text>
          </div>
          <ArchiveClubButton clubId={clubId} archived={archived} />
        </div>

        <div className="border-t border-[var(--error)]/20 pt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <Text size="sm" className="font-medium">
                Delete Club
              </Text>
              <Text size="sm" muted>
                Permanently delete. Cannot be undone.
              </Text>
            </div>
            <DeleteClubButton clubId={clubId} clubName={clubName} />
          </div>
        </div>
      </div>
    </DangerZoneSection>
  );
}

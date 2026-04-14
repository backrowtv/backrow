import { Metadata } from "next";
import { ClubCreationWizard } from "@/components/clubs/ClubCreationWizard";

export const metadata: Metadata = {
  title: "Create a Club - BackRow",
  description:
    "Start your movie club journey. Create a club, invite friends, and run film festivals together.",
};

export default function CreateClubPage() {
  return (
    <div className="relative" style={{ backgroundColor: "var(--background)" }}>
      {/* Content */}
      <div className="relative z-10 pt-16 sm:pt-24 pb-12 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <ClubCreationWizard />
        </div>
      </div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsForm } from "./SettingsForm";
import type { ClubSettings } from "@/types/club-settings";

interface SettingsTabProps {
  clubId: string;
}

export async function SettingsTab({ clubId }: SettingsTabProps) {
  const supabase = await createClient();

  const { data: club } = await supabase
    .from("clubs")
    .select("settings, theme_submissions_locked")
    .eq("id", clubId)
    .single();

  const settings = (club?.settings as Partial<ClubSettings>) || {};
  // Derive festival type from settings — the source of truth
  const festivalType = (settings.festival_type as string) || "standard";

  return (
    <div className="space-y-6">
      <Tabs defaultValue="themes" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="themes">Themes</TabsTrigger>
          <TabsTrigger value="nomination">Nomination</TabsTrigger>
          <TabsTrigger value="festival">Festival Style</TabsTrigger>
          <TabsTrigger value="guessing">Guessing</TabsTrigger>
          <TabsTrigger value="rubric">Rubrics</TabsTrigger>
          <TabsTrigger value="points">Points</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="themes">
          <SettingsForm
            clubId={clubId}
            section="themes"
            settings={settings}
            festivalType={festivalType}
            themeSubmissionsLocked={club?.theme_submissions_locked || false}
          />
        </TabsContent>

        <TabsContent value="nomination">
          <SettingsForm
            clubId={clubId}
            section="nomination"
            settings={settings}
            festivalType={festivalType}
          />
        </TabsContent>

        <TabsContent value="festival">
          <SettingsForm
            clubId={clubId}
            section="festival"
            settings={settings}
            festivalType={festivalType}
          />
        </TabsContent>

        <TabsContent value="guessing">
          <SettingsForm
            clubId={clubId}
            section="guessing"
            settings={settings}
            festivalType={festivalType}
          />
        </TabsContent>

        <TabsContent value="rubric">
          <SettingsForm
            clubId={clubId}
            section="rubric"
            settings={settings}
            festivalType={festivalType}
          />
        </TabsContent>

        <TabsContent value="points">
          <SettingsForm
            clubId={clubId}
            section="points"
            settings={settings}
            festivalType={festivalType}
          />
        </TabsContent>

        <TabsContent value="results">
          <SettingsForm
            clubId={clubId}
            section="results"
            settings={settings}
            festivalType={festivalType}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

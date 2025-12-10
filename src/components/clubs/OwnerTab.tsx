import { createClient } from "@/lib/supabase/server";
import { TransferOwnershipForm } from "./TransferOwnershipForm";
import { ClubNameForm } from "./ClubNameForm";
import { ClubImageryForm } from "./ClubImageryForm";
import { AgeRestrictionForm } from "./AgeRestrictionForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/typography";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DangerZoneWrapper } from "./DangerZoneWrapper";

interface OwnerTabProps {
  clubId: string;
}

export async function OwnerTab({ clubId }: OwnerTabProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: club } = await supabase.from("clubs").select("*").eq("id", clubId).single();

  if (!club) return null;

  // Check user is producer
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role !== "producer") {
    return (
      <Card>
        <CardContent className="p-6">
          <Text size="sm" muted>
            Only the club owner can access these settings.
          </Text>
        </CardContent>
      </Card>
    );
  }

  // Get members for transfer ownership
  const { data: members } = await supabase
    .from("club_members")
    .select(
      `
      user_id,
      role,
      user:user_id (id, display_name, avatar_url)
    `
    )
    .eq("club_id", clubId)
    .neq("user_id", user.id);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="ownership">Ownership</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <ClubNameForm clubId={clubId} currentName={club.name} />
          <ClubImageryForm
            clubId={clubId}
            clubSlug={club.slug}
            clubName={club.name}
            currentPictureUrl={club.picture_url}
            currentAvatarIcon={club.avatar_icon || null}
            currentAvatarColorIndex={club.avatar_color_index ?? null}
            currentAvatarBorderColorIndex={club.avatar_border_color_index ?? null}
          />
          <AgeRestrictionForm
            clubId={clubId}
            settings={(club.settings as Record<string, unknown>) || {}}
          />
        </TabsContent>

        <TabsContent value="ownership" className="space-y-6">
          <TransferOwnershipForm
            clubId={clubId}
            members={(members || []).map((m) => {
              const userData = Array.isArray(m.user) ? m.user[0] : m.user;
              return {
                id: (userData as { id: string } | null)?.id || m.user_id,
                display_name:
                  (userData as { display_name: string | null } | null)?.display_name || "Unknown",
              };
            })}
          />
          <Card>
            <CardHeader>
              <CardTitle>Pro Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Text size="sm" className="font-medium mb-2">
                  Advanced Analytics
                </Text>
                <Text size="sm" muted>
                  Coming soon. Get detailed insights into your club's activity, member engagement,
                  and festival performance with advanced analytics and reporting.
                </Text>
              </div>
              <div>
                <Text size="sm" className="font-medium mb-2">
                  Custom Branding
                </Text>
                <Text size="sm" muted>
                  Coming soon. Customize your club's appearance with custom themes, colors, and
                  branding options to make your club unique.
                </Text>
              </div>
              <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                <Text size="tiny" muted>
                  Pro features are coming soon. Upgrade to unlock advanced club features and
                  customization options.
                </Text>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="pt-4">
          <DangerZoneWrapper
            clubId={clubId}
            clubName={club.name}
            archived={club.archived || false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

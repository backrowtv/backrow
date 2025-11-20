import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { Section, Container } from "@/components/ui/section";
import { Heading, Text } from "@/components/ui/typography";

export default async function ProfileEditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();

  return (
    <Section variant="default" fullWidth>
      <Container size="md" className="p-6 md:p-8">
        <div className="mb-6">
          <div className="mb-4">
            <Heading level={1}>Edit Profile</Heading>
          </div>
          <Text size="small" muted>
            Update profile information
          </Text>
        </div>

        <ProfileEditForm profile={profile} />
      </Container>
    </Section>
  );
}

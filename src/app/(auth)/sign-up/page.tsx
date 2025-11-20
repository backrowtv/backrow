import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SignUpFormFields } from "@/components/auth/SignUpFormFields";
import { Heading, Text } from "@/components/ui/typography";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

interface SignUpPageProps {
  searchParams: Promise<{ redirectTo?: string }>;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  const params = await searchParams;
  const redirectTo = params.redirectTo || undefined;

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <Heading level={1} className="text-xl">
              Join{" "}
              <span style={{ fontFamily: "var(--font-brand)" }} className="text-[var(--primary)]">
                BackRow
              </span>
            </Heading>
            <Text size="sm" muted className="mt-1">
              Create an account to start your movie journey
            </Text>
          </CardHeader>
          <CardContent>
            <SignUpFormFields redirectTo={redirectTo} />
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}

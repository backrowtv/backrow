import { SignInForm } from "./SignInForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface SignInPageProps {
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  const params = await searchParams;
  const error = params.error ? decodeURIComponent(params.error) : undefined;
  const redirectTo = params.redirectTo || undefined;

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="w-full max-w-[450px]">
        <SignInForm initialError={error} redirectTo={redirectTo} />
      </div>
    </div>
  );
}

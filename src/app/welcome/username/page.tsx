import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { ChooseUsernameForm } from "./ChooseUsernameForm";
import { BrandText } from "@/components/ui/brand-text";

export const metadata: Metadata = {
  title: "Choose your username · BackRow",
  robots: { index: false, follow: false },
};

export default async function WelcomeUsernamePage() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?redirectTo=/welcome/username");

  const { data: profile } = await supabase
    .from("users")
    .select("username, username_auto_derived")
    .eq("id", user.id)
    .maybeSingle();

  // If the user has already picked an explicit username, don't gate them here —
  // bounce to the app. The middleware shouldn't have sent them here in the
  // first place, but handle it defensively.
  if (!profile?.username_auto_derived) redirect("/");

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[var(--background)]">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            <BrandText>Welcome to BackRow</BrandText>
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Pick a username. It&apos;s how other members will find and mention you.
          </p>
        </div>
        <ChooseUsernameForm currentDerivedUsername={profile.username ?? ""} />
      </div>
    </div>
  );
}

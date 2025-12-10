import { getBackgroundsByType } from "@/app/actions/backgrounds";
import { FooterClient } from "./FooterClient";
import type { BackgroundImage } from "@/lib/backgrounds";
import { createClient } from "@/lib/supabase/server";

// Fallback credits for when database doesn't have entries yet
const FALLBACK_CREDITS: Record<
  string,
  { movie: string; year: number; studio: string; actor?: string }
> = {
  "/": {
    movie: "Once Upon a Time in Hollywood",
    year: 2019,
    studio: "Sony Pictures",
    actor: "Leonardo DiCaprio",
  },
  "/faq": {
    movie: "Batman Forever",
    year: 1995,
    studio: "Warner Bros.",
    actor: "Jim Carrey",
  },
};

export async function FooterWithCredits() {
  // Fetch auth state and background credits in parallel
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data: backgrounds },
  ] = await Promise.all([supabase.auth.getUser(), getBackgroundsByType("site_page")]);

  // Build credits map from database
  const dbCredits: Record<string, { movie: string; year: number; studio: string; actor?: string }> =
    {};

  backgrounds?.forEach((bg: BackgroundImage) => {
    if (bg.credit_title && bg.is_active) {
      dbCredits[bg.entity_id] = {
        movie: bg.credit_title,
        year: bg.credit_year || 0,
        studio: bg.credit_studio || "",
        actor: bg.credit_actor || undefined,
      };
    }
  });

  // Merge with fallbacks (database takes priority)
  const allCredits = { ...FALLBACK_CREDITS, ...dbCredits };

  return <FooterClient movieCredits={allCredits} isAuthenticated={!!user} />;
}

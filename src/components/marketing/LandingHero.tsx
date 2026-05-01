import { getTrendingBackdrop } from "@/lib/tmdb/client";
import { LandingHeroClient } from "./LandingHeroClient";

export async function LandingHero() {
  const backdrop = await getTrendingBackdrop();

  return (
    <LandingHeroClient
      backdropUrl={backdrop?.url ?? null}
      backdropTitle={backdrop?.title ?? null}
      backdropYear={backdrop?.year ?? null}
    />
  );
}

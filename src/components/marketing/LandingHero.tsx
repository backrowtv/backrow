import { getTrendingBackdropUrl } from "@/lib/tmdb/client";
import { LandingHeroClient } from "./LandingHeroClient";

export async function LandingHero() {
  const backdropUrl = await getTrendingBackdropUrl();

  return <LandingHeroClient backdropUrl={backdropUrl} />;
}

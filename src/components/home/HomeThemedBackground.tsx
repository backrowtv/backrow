import { getBackground } from "@/app/actions/backgrounds";
import { TheaterFrame } from "@/components/shared/TheaterFrame";

// Fallback: Once Upon a Time in Hollywood (2019)
// Source: Film-Grab
const HOME_FALLBACK = "/images/backgrounds/home-background.jpg";

interface HomeThemedBackgroundProps {
  children?: React.ReactNode;
}

export async function HomeThemedBackground({ children }: HomeThemedBackgroundProps) {
  const { data: background } = await getBackground("site_page", "/");
  const imageUrl = background?.image_url || HOME_FALLBACK;

  if (!imageUrl) {
    return null;
  }

  return (
    <TheaterFrame image={imageUrl} priority>
      {children}
    </TheaterFrame>
  );
}

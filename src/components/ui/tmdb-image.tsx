import Image, { type ImageProps } from "next/image";
import { generateBlurDataURL } from "@/lib/utils/blur-generator";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

type TMDBSize = "w92" | "w185" | "w300" | "w500" | "w780" | "w1280" | "original";

interface TMDBImageProps extends Omit<ImageProps, "src" | "placeholder" | "blurDataURL"> {
  /** The TMDB image path, e.g. "/abc123.jpg" */
  tmdbPath: string;
  /** Image type for blur generation and default sizing */
  type?: "poster" | "profile" | "backdrop";
  /** TMDB image size. Defaults based on type: poster=w500, profile=w500, backdrop=w1280 */
  tmdbSize?: TMDBSize;
}

const DEFAULT_SIZES: Record<string, TMDBSize> = {
  poster: "w500",
  profile: "w500",
  backdrop: "w1280",
};

/**
 * Server component that wraps Next.js Image with automatic TMDB blur placeholders.
 * Generates an image-specific blur data URL from the w92 thumbnail.
 *
 * For client components, use generateBlurDataURL() directly and pass blurDataURL as a prop.
 */
export async function TMDBImage({
  tmdbPath,
  type = "poster",
  tmdbSize,
  alt,
  ...props
}: TMDBImageProps) {
  const size = tmdbSize || DEFAULT_SIZES[type] || "w500";
  const src = `${TMDB_IMAGE_BASE}/${size}${tmdbPath}`;
  const blurDataURL = await generateBlurDataURL(tmdbPath, type);

  return <Image src={src} alt={alt} placeholder="blur" blurDataURL={blurDataURL} {...props} />;
}

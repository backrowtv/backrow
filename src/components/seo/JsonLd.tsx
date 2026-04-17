import { absoluteUrl, SITE_URL } from "@/lib/seo/absolute-url";

const baseUrl = SITE_URL;

// Escape </script> and other HTML-sensitive chars in JSON to prevent tag-break injection
// from user-supplied club names, movie titles, bios, etc.
function serializeLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

const rootSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "BackRow",
      url: baseUrl,
      description:
        "The best view is from the BackRow. Where movie clubs come together. Discover great films, compete together, and celebrate cinema.",
      applicationCategory: "SocialNetworkingApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
    {
      "@type": "Organization",
      name: "BackRow",
      url: baseUrl,
      logo: `${baseUrl}/icon-512.png`,
    },
  ],
};

function Script({ data }: { data: unknown }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeLd(data) }} />
  );
}

// Root JSON-LD (WebApplication + Organization) — mounted in root layout via default export.
export function JsonLd() {
  return <Script data={rootSchema} />;
}

// -----------------------------------------------------------------------------
// Per-page schemas
// -----------------------------------------------------------------------------

type ClubLd = {
  name: string;
  slug: string | null;
  description?: string | null;
  picture_url?: string | null;
};

type FestivalLd = {
  theme: string | null;
  slug: string | null;
  start_date: string | null;
  results_date?: string | null;
  watch_deadline?: string | null;
  picture_url?: string | null;
  poster_url?: string | null;
};

export function ClubJsonLd({
  club,
  festivals,
}: {
  club: ClubLd;
  festivals?: Array<{ theme: string | null; slug: string | null }>;
}) {
  const clubUrl = absoluteUrl(`/club/${club.slug ?? ""}`);
  const graph: Array<Record<string, unknown>> = [
    {
      "@type": "Organization",
      name: club.name,
      url: clubUrl,
      description: club.description ?? undefined,
      logo: club.picture_url ?? undefined,
    },
  ];

  if (festivals && festivals.length > 0) {
    graph.push({
      "@type": "ItemList",
      name: `${club.name} festivals`,
      itemListElement: festivals
        .filter((f) => f.slug)
        .map((f, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: f.theme ?? "Festival",
          url: absoluteUrl(`/club/${club.slug ?? ""}/festival/${f.slug}`),
        })),
    });
  }

  return <Script data={{ "@context": "https://schema.org", "@graph": graph }} />;
}

export function FestivalJsonLd({ club, festival }: { club: ClubLd; festival: FestivalLd }) {
  const clubUrl = absoluteUrl(`/club/${club.slug ?? ""}`);
  const festivalUrl = absoluteUrl(`/club/${club.slug ?? ""}/festival/${festival.slug ?? ""}`);
  const endDate = festival.results_date ?? festival.watch_deadline ?? undefined;

  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "Event",
        name: festival.theme ?? "Film Festival",
        url: festivalUrl,
        startDate: festival.start_date ?? undefined,
        endDate,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
        location: {
          "@type": "VirtualLocation",
          url: festivalUrl,
        },
        organizer: {
          "@type": "Organization",
          name: club.name,
          url: clubUrl,
        },
        image: festival.poster_url ?? festival.picture_url ?? undefined,
        description: festival.theme
          ? `${festival.theme} — a themed film festival hosted by ${club.name} on BackRow.`
          : `A film festival hosted by ${club.name} on BackRow.`,
      }}
    />
  );
}

type MovieLd = {
  tmdb_id: number;
  slug: string | null;
  title: string;
  year: number | null;
  director?: string | null;
  poster_url?: string | null;
  overview?: string | null;
  cast?: string[] | null;
  genres?: string[] | null;
};

export function MovieJsonLd({ movie }: { movie: MovieLd }) {
  const url = absoluteUrl(`/movies/${movie.slug ?? movie.tmdb_id}`);
  const actors = (movie.cast ?? []).slice(0, 10).map((name) => ({ "@type": "Person", name }));
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "Movie",
        name: movie.title,
        url,
        datePublished: movie.year ? `${movie.year}-01-01` : undefined,
        image: movie.poster_url ?? undefined,
        description: movie.overview ?? undefined,
        genre: movie.genres ?? undefined,
        director: movie.director ? { "@type": "Person", name: movie.director } : undefined,
        actor: actors.length > 0 ? actors : undefined,
      }}
    />
  );
}

type PersonLd = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
};

export function PersonJsonLd({ user }: { user: PersonLd }) {
  const url = absoluteUrl(`/profile/${user.id}`);
  const name = user.display_name ?? user.username ?? "BackRow Member";
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "Person",
        name,
        url,
        image: user.avatar_url ?? undefined,
        description: user.bio ?? undefined,
      }}
    />
  );
}

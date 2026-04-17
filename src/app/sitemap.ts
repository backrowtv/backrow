import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/seo/absolute-url";

// Single sitemap at /sitemap.xml. When total URLs approach ~5k, swap to
// `generateSitemaps` + `/sitemap/[id].xml` with a sitemap index. Not needed at launch.

type SitemapEntry = MetadataRoute.Sitemap[number];

function staticEntries(): SitemapEntry[] {
  const now = new Date();
  return [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: absoluteUrl("/discover"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/blog"), lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: absoluteUrl("/faq"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    {
      url: absoluteUrl("/create-club"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/contact"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: absoluteUrl("/subscriptions"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: absoluteUrl("/terms-of-use"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: absoluteUrl("/user-agreement"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: absoluteUrl("/privacy-policy"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}

async function clubEntries(): Promise<{ entries: SitemapEntry[]; publicClubIds: string[] }> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("clubs")
    .select("id, slug, updated_at, created_at")
    .neq("privacy", "private")
    .eq("archived", false)
    .not("slug", "is", null);

  if (error || !data) return { entries: [], publicClubIds: [] };

  const entries: SitemapEntry[] = data
    .filter((c) => c.slug)
    .map((c) => ({
      url: absoluteUrl(`/club/${c.slug}`),
      lastModified: c.updated_at ? new Date(c.updated_at) : new Date(c.created_at ?? Date.now()),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  return { entries, publicClubIds: data.map((c) => c.id) };
}

async function festivalEntries(publicClubIds: string[]): Promise<SitemapEntry[]> {
  if (publicClubIds.length === 0) return [];
  const supabase = createPublicClient();

  // Map festival.club_id → club.slug for URL construction
  const { data: clubs } = await supabase.from("clubs").select("id, slug").in("id", publicClubIds);
  const clubSlugById = new Map<string, string>();
  for (const c of clubs ?? []) {
    if (c.slug) clubSlugById.set(c.id, c.slug);
  }

  const { data, error } = await supabase
    .from("festivals")
    .select("slug, club_id, updated_at, created_at, results_date")
    .in("club_id", Array.from(clubSlugById.keys()))
    .is("deleted_at", null)
    .not("slug", "is", null);

  if (error || !data) return [];

  return data
    .filter((f) => f.slug && clubSlugById.has(f.club_id))
    .map<SitemapEntry>((f) => ({
      url: absoluteUrl(`/club/${clubSlugById.get(f.club_id)}/festival/${f.slug}`),
      lastModified: f.updated_at ? new Date(f.updated_at) : new Date(f.created_at ?? Date.now()),
      changeFrequency: "monthly",
      priority: 0.7,
    }));
}

async function movieEntries(): Promise<SitemapEntry[]> {
  const supabase = createPublicClient();

  // Movies engaged by the community (≥1 nomination). Ratings always point to
  // a nomination, so nominations captures both cases.
  const { data: nominations } = await supabase
    .from("nominations")
    .select("tmdb_id")
    .is("deleted_at", null);

  const tmdbIds = Array.from(new Set((nominations ?? []).map((n) => n.tmdb_id))).filter(
    (n): n is number => Number.isFinite(n)
  );
  if (tmdbIds.length === 0) return [];

  const { data: movies } = await supabase
    .from("movies")
    .select("slug, tmdb_id, cached_at")
    .in("tmdb_id", tmdbIds)
    .not("slug", "is", null);

  if (!movies) return [];

  return movies
    .filter((m) => m.slug)
    .map<SitemapEntry>((m) => ({
      url: absoluteUrl(`/movies/${m.slug}`),
      lastModified: m.cached_at ? new Date(m.cached_at) : new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { entries: clubs, publicClubIds } = await clubEntries();
  const [festivals, movies] = await Promise.all([festivalEntries(publicClubIds), movieEntries()]);

  return [...staticEntries(), ...clubs, ...festivals, ...movies];
}

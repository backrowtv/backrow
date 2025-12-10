/**
 * Helper to check if a club should use the BackRow Featured avatar
 * This can be used in both server and client components
 */
export function isBackRowFeaturedClub(clubSlug?: string | null, clubName?: string | null): boolean {
  return clubSlug === 'backrow-featured' || clubName === 'BackRow - Featured'
}


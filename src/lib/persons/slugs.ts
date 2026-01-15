/**
 * Generate person slug from name and birth year
 * Used for creating URLs like /person/tom-hanks-1956
 */
export function generatePersonSlug(name: string, birthday: string | null): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens

  // Extract birth year from birthday (YYYY-MM-DD format)
  const birthYear = birthday ? birthday.split('-')[0] : null

  return birthYear ? `${slug}-${birthYear}` : slug
}

/**
 * Get person URL path - prefers TMDB ID for reliability (never 404s)
 * The person page will auto-cache and redirect to SEO-friendly slug
 *
 * @param tmdbId - TMDB ID (preferred, always works)
 * @param slug - Database slug (optional, for already-cached persons)
 */
export function getPersonUrl(tmdbId: number | null | undefined, slug?: string | null): string {
  // Prefer TMDB ID - it always works (person page caches and redirects to slug)
  if (tmdbId) {
    return `/person/${tmdbId}`
  }
  // Fallback to slug if available
  if (slug) {
    return `/person/${slug}`
  }
  // Should never happen, but fallback to discover page
  return '/discover'
}

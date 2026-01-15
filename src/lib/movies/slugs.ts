/**
 * Generate movie slug from title and year
 * Used for creating URLs like /movies/top-gun-1986
 */
export function generateMovieSlug(title: string, year: number | string | null): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
  
  const yearNum = typeof year === 'string' ? parseInt(year, 10) : year
  return yearNum && !isNaN(yearNum) ? `${slug}-${yearNum}` : slug
}

/**
 * Get movie URL path - prefers TMDB ID for reliability (never 404s)
 * The movie page will auto-cache and redirect to SEO-friendly slug
 * 
 * @param tmdbId - TMDB ID (preferred, always works)
 * @param slug - Database slug (optional, for already-cached movies)
 */
export function getMovieUrl(tmdbId: number | null | undefined, slug?: string | null): string {
  // Prefer TMDB ID - it always works (movie page caches and redirects to slug)
  if (tmdbId) {
    return `/movies/${tmdbId}`
  }
  // Fallback to slug if available
  if (slug) {
    return `/movies/${slug}`
  }
  // Should never happen, but fallback to discover page
  return '/discover'
}


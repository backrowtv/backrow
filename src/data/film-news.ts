/**
 * Film Industry News Sources
 * 
 * This file contains curated RSS feeds for film festival and movie news.
 * These are reputable industry publications that cover festivals, releases, and cinema news.
 */

export interface FilmNewsSource {
  name: string
  rssUrl: string
  websiteUrl: string
}

// Primary RSS feed for film festival and movie news
// Using IndieWire as the main source (Variety feed is no longer available)
export const primaryFilmNewsFeed = 'https://www.indiewire.com/feed/'

// Movie headlines feeds - Sources with reliable images and logos
// Screen Rant and Collider have media:thumbnail tags with images
export const movieHeadlinesFeeds: FilmNewsSource[] = [
  {
    name: 'Screen Rant',
    rssUrl: 'https://screenrant.com/feed/',
    websiteUrl: 'https://screenrant.com/',
  },
  {
    name: 'Collider',
    rssUrl: 'https://collider.com/feed/',
    websiteUrl: 'https://collider.com/',
  },
  {
    name: 'SlashFilm',
    rssUrl: 'https://www.slashfilm.com/feed/',
    websiteUrl: 'https://www.slashfilm.com/',
  },
]

// Alternative feeds (can be switched if primary feed doesn't work)
export const alternativeFilmNewsFeeds: FilmNewsSource[] = [
  {
    name: 'IndieWire',
    rssUrl: 'https://www.indiewire.com/feed/',
    websiteUrl: 'https://www.indiewire.com/',
  },
  {
    name: 'Deadline',
    rssUrl: 'https://deadline.com/feed/',
    websiteUrl: 'https://deadline.com/',
  },
]

